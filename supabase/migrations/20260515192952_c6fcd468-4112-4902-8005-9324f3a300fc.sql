
-- =========================================================
-- PROFILES
-- =========================================================
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by all authed"
  on public.profiles for select to authenticated using (true);
create policy "users manage own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Player-' || substr(new.id::text, 1, 6))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- GAMES
-- =========================================================
create type public.game_status as enum ('lobby', 'playing', 'ended');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users on delete cascade,
  status public.game_status not null default 'lobby',
  current_round_id uuid,
  current_turn_player_id uuid,
  winner_id uuid,
  max_players int not null default 6,
  starting_dice int not null default 5,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);
alter table public.games enable row level security;

create policy "games readable by all authed"
  on public.games for select to authenticated using (true);
create policy "users create games as host"
  on public.games for insert to authenticated with check (auth.uid() = host_id);

-- =========================================================
-- GAME PLAYERS
-- =========================================================
create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  seat int not null,
  dice_count int not null default 5,
  is_connected boolean not null default true,
  is_eliminated boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (game_id, user_id),
  unique (game_id, seat)
);
alter table public.game_players enable row level security;

create policy "game players readable by all authed"
  on public.game_players for select to authenticated using (true);

-- =========================================================
-- ROUNDS
-- =========================================================
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games on delete cascade,
  round_number int not null,
  is_palifico boolean not null default false,
  starter_player_id uuid not null,
  current_player_id uuid not null,
  last_bid_quantity int,
  last_bid_face int,
  last_bidder_id uuid,
  status text not null default 'bidding', -- bidding | revealed
  loser_id uuid,
  caller_id uuid,
  call_type text, -- dudo | calza
  actual_count int,
  dice_snapshot jsonb, -- [{user_id, dice:[..]}] populated on reveal
  started_at timestamptz not null default now(),
  revealed_at timestamptz
);
alter table public.rounds enable row level security;

create policy "rounds readable by all authed"
  on public.rounds for select to authenticated using (true);

-- =========================================================
-- ROUND DICE (hidden)
-- =========================================================
create table public.round_dice (
  round_id uuid not null references public.rounds on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  dice int[] not null,
  primary key (round_id, user_id)
);
alter table public.round_dice enable row level security;

-- Players ONLY see their own dice while round is bidding.
-- After reveal, dice_snapshot on rounds becomes public.
create policy "owner reads own dice"
  on public.round_dice for select to authenticated
  using (auth.uid() = user_id);

-- =========================================================
-- BIDS
-- =========================================================
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds on delete cascade,
  player_id uuid not null,
  action text not null, -- bid | dudo | calza
  quantity int,
  face int,
  created_at timestamptz not null default now()
);
alter table public.bids enable row level security;

create policy "bids readable by all authed"
  on public.bids for select to authenticated using (true);

-- =========================================================
-- GAME EVENTS
-- =========================================================
create table public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.game_events enable row level security;

create policy "events readable by all authed"
  on public.game_events for select to authenticated using (true);

-- =========================================================
-- HELPERS
-- =========================================================
create or replace function public.gen_game_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  end loop;
  return result;
end;
$$;

-- =========================================================
-- RPC: CREATE GAME
-- =========================================================
create or replace function public.rpc_create_game()
returns table (game_id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_id uuid;
  v_attempts int := 0;
begin
  if v_uid is null then raise exception 'auth required'; end if;

  loop
    v_code := gen_game_code();
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from games where games.code = v_code) or v_attempts > 10;
  end loop;

  insert into games (code, host_id) values (v_code, v_uid) returning id into v_id;
  insert into game_players (game_id, user_id, seat) values (v_id, v_uid, 0);
  insert into game_events (game_id, type, data) values (v_id, 'game_created', jsonb_build_object('host', v_uid));

  return query select v_id, v_code;
end;
$$;

-- =========================================================
-- RPC: JOIN GAME
-- =========================================================
create or replace function public.rpc_join_game(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game games%rowtype;
  v_seat int;
  v_count int;
begin
  if v_uid is null then raise exception 'auth required'; end if;

  select * into v_game from games where code = upper(p_code);
  if not found then raise exception 'Room not found'; end if;
  if v_game.status <> 'lobby' then
    -- allow rejoin if already player
    if exists (select 1 from game_players where game_id = v_game.id and user_id = v_uid) then
      update game_players set is_connected = true where game_id = v_game.id and user_id = v_uid;
      return v_game.id;
    end if;
    raise exception 'Game already started';
  end if;

  if exists (select 1 from game_players where game_id = v_game.id and user_id = v_uid) then
    update game_players set is_connected = true where game_id = v_game.id and user_id = v_uid;
    return v_game.id;
  end if;

  select count(*) into v_count from game_players where game_id = v_game.id;
  if v_count >= v_game.max_players then raise exception 'Room full'; end if;

  v_seat := v_count;
  insert into game_players (game_id, user_id, seat) values (v_game.id, v_uid, v_seat);
  insert into game_events (game_id, type, data) values (v_game.id, 'player_joined', jsonb_build_object('user_id', v_uid));

  return v_game.id;
end;
$$;

-- =========================================================
-- INTERNAL: roll dice and start round
-- =========================================================
create or replace function public._start_round(p_game_id uuid, p_starter uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_round_id uuid;
  v_round_no int;
  v_palifico boolean := false;
  v_player record;
  v_dice int[];
  v_i int;
  v_starter_dice int;
begin
  select coalesce(max(round_number),0)+1 into v_round_no from rounds where game_id = p_game_id;

  -- palifico: starter has exactly 1 die, and it's their first round at 1
  select dice_count into v_starter_dice from game_players where game_id = p_game_id and user_id = p_starter;
  if v_starter_dice = 1 then
    -- check whether starter has previously played a palifico (any prior round flagged for them)
    if not exists (
      select 1 from rounds where game_id = p_game_id and is_palifico = true and starter_player_id = p_starter
    ) then
      v_palifico := true;
    end if;
  end if;

  insert into rounds (game_id, round_number, is_palifico, starter_player_id, current_player_id)
  values (p_game_id, v_round_no, v_palifico, p_starter, p_starter)
  returning id into v_round_id;

  -- roll dice for each non-eliminated player
  delete from round_dice where round_id = v_round_id;
  for v_player in
    select user_id, dice_count from game_players
    where game_id = p_game_id and is_eliminated = false and dice_count > 0
  loop
    v_dice := array[]::int[];
    for v_i in 1..v_player.dice_count loop
      v_dice := array_append(v_dice, 1 + floor(random()*6)::int);
    end loop;
    insert into round_dice (round_id, user_id, dice) values (v_round_id, v_player.user_id, v_dice);
  end loop;

  update games set current_round_id = v_round_id, current_turn_player_id = p_starter where id = p_game_id;

  insert into game_events (game_id, type, data)
  values (p_game_id, 'round_started', jsonb_build_object('round', v_round_no, 'palifico', v_palifico, 'starter', p_starter));

  return v_round_id;
end;
$$;

-- =========================================================
-- RPC: START GAME (host only)
-- =========================================================
create or replace function public.rpc_start_game(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game games%rowtype;
  v_first uuid;
  v_n int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_game from games where id = p_game_id;
  if not found then raise exception 'game not found'; end if;
  if v_game.host_id <> v_uid then raise exception 'only host can start'; end if;
  if v_game.status <> 'lobby' then raise exception 'already started'; end if;

  select count(*) into v_n from game_players where game_id = p_game_id;
  if v_n < 2 then raise exception 'need at least 2 players'; end if;

  -- reset dice counts
  update game_players set dice_count = v_game.starting_dice, is_eliminated = false where game_id = p_game_id;

  update games set status = 'playing', started_at = now() where id = p_game_id;

  -- pick lowest-seat player to start
  select user_id into v_first from game_players where game_id = p_game_id order by seat limit 1;

  perform _start_round(p_game_id, v_first);
end;
$$;

-- =========================================================
-- INTERNAL: next active player (clockwise by seat)
-- =========================================================
create or replace function public._next_player(p_game_id uuid, p_current uuid)
returns uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_seat int;
  v_next uuid;
begin
  select seat into v_seat from game_players where game_id = p_game_id and user_id = p_current;

  select user_id into v_next from game_players
    where game_id = p_game_id and is_eliminated = false and dice_count > 0 and seat > v_seat
    order by seat limit 1;
  if v_next is not null then return v_next; end if;

  select user_id into v_next from game_players
    where game_id = p_game_id and is_eliminated = false and dice_count > 0
    order by seat limit 1;
  return v_next;
end;
$$;

-- =========================================================
-- RPC: PLACE BID
-- =========================================================
create or replace function public.rpc_place_bid(p_game_id uuid, p_quantity int, p_face int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game games%rowtype;
  v_round rounds%rowtype;
  v_total_dice int;
  v_min_qty int;
  v_next uuid;
  v_pq int;
  v_pf int;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_game from games where id = p_game_id;
  if v_game.status <> 'playing' then raise exception 'game not active'; end if;
  if v_game.current_turn_player_id <> v_uid then raise exception 'not your turn'; end if;

  select * into v_round from rounds where id = v_game.current_round_id;
  if v_round.status <> 'bidding' then raise exception 'round not active'; end if;

  if p_face < 1 or p_face > 6 then raise exception 'invalid face'; end if;
  if p_quantity < 1 then raise exception 'invalid qty'; end if;

  select sum(dice_count) into v_total_dice from game_players where game_id = p_game_id and is_eliminated = false;
  if p_quantity > v_total_dice then raise exception 'qty exceeds total dice'; end if;

  -- palifico face lock: face must equal first bid face
  if v_round.is_palifico and v_round.last_bid_face is not null and p_face <> v_round.last_bid_face then
    raise exception 'palifico: face is locked';
  end if;

  if v_round.is_palifico and p_face = 1 and v_round.last_bid_face is not null then
    raise exception 'palifico: 1s not allowed mid-round';
  end if;

  v_pq := v_round.last_bid_quantity;
  v_pf := v_round.last_bid_face;

  if v_pq is not null then
    -- escalation rules
    if v_round.is_palifico then
      -- only quantity may increase; face fixed
      if p_quantity <= v_pq then raise exception 'must raise quantity'; end if;
    else
      if p_face = 1 and v_pf <> 1 then
        -- switching to 1s: new_qty >= floor(prev_qty/2)+1
        v_min_qty := (v_pq / 2) + 1;
        if p_quantity < v_min_qty then raise exception 'switching to 1s requires qty >= %', v_min_qty; end if;
      elsif p_face <> 1 and v_pf = 1 then
        -- switching from 1s: new_qty >= prev_qty*2 + 1
        v_min_qty := v_pq * 2 + 1;
        if p_quantity < v_min_qty then raise exception 'switching from 1s requires qty >= %', v_min_qty; end if;
      elsif p_face = v_pf then
        if p_quantity <= v_pq then raise exception 'must raise quantity'; end if;
      else
        if p_face < v_pf then raise exception 'face must be >= previous'; end if;
        if p_quantity < v_pq then raise exception 'qty must be >= previous'; end if;
      end if;
    end if;
  end if;

  insert into bids (round_id, player_id, action, quantity, face)
  values (v_round.id, v_uid, 'bid', p_quantity, p_face);

  v_next := _next_player(p_game_id, v_uid);

  update rounds set
    last_bid_quantity = p_quantity,
    last_bid_face = p_face,
    last_bidder_id = v_uid,
    current_player_id = v_next
  where id = v_round.id;

  update games set current_turn_player_id = v_next where id = p_game_id;

  insert into game_events (game_id, type, data)
  values (p_game_id, 'bid', jsonb_build_object('player', v_uid, 'qty', p_quantity, 'face', p_face));
end;
$$;

-- =========================================================
-- INTERNAL: resolve round (dudo / calza)
-- =========================================================
create or replace function public._resolve_round(p_game_id uuid, p_caller uuid, p_call_type text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_round rounds%rowtype;
  v_game games%rowtype;
  v_actual int := 0;
  v_snapshot jsonb := '[]'::jsonb;
  v_rec record;
  v_loser uuid;
  v_winner uuid;
  v_remaining int;
  v_active_count int;
begin
  select * into v_game from games where id = p_game_id;
  select * into v_round from rounds where id = v_game.current_round_id;

  if v_round.last_bidder_id is null then raise exception 'no bid to challenge'; end if;
  if p_call_type = 'calza' and p_caller = v_round.last_bidder_id then raise exception 'cannot calza own bid'; end if;

  -- count actual dice matching face (1s wild unless palifico)
  for v_rec in
    select rd.user_id, rd.dice from round_dice rd where rd.round_id = v_round.id
  loop
    if v_round.is_palifico then
      v_actual := v_actual + (select count(*) from unnest(v_rec.dice) d where d = v_round.last_bid_face);
    else
      v_actual := v_actual + (select count(*) from unnest(v_rec.dice) d where d = v_round.last_bid_face or d = 1);
    end if;
    v_snapshot := v_snapshot || jsonb_build_array(jsonb_build_object('user_id', v_rec.user_id, 'dice', to_jsonb(v_rec.dice)));
  end loop;

  if p_call_type = 'dudo' then
    if v_actual >= v_round.last_bid_quantity then
      v_loser := p_caller; -- caller wrong
    else
      v_loser := v_round.last_bidder_id; -- bidder lied
    end if;
    update game_players set dice_count = greatest(dice_count - 1, 0) where game_id = p_game_id and user_id = v_loser;
  elsif p_call_type = 'calza' then
    if v_actual = v_round.last_bid_quantity then
      -- caller correct: gains a die (max starting_dice)
      update game_players set dice_count = least(dice_count + 1, v_game.starting_dice)
        where game_id = p_game_id and user_id = p_caller;
      v_loser := null;
    else
      v_loser := p_caller;
      update game_players set dice_count = greatest(dice_count - 1, 0) where game_id = p_game_id and user_id = p_caller;
    end if;
  end if;

  insert into bids (round_id, player_id, action) values (v_round.id, p_caller, p_call_type);

  -- mark eliminated
  update game_players set is_eliminated = true where game_id = p_game_id and dice_count = 0 and is_eliminated = false;

  update rounds set
    status = 'revealed',
    loser_id = v_loser,
    caller_id = p_caller,
    call_type = p_call_type,
    actual_count = v_actual,
    dice_snapshot = v_snapshot,
    revealed_at = now()
  where id = v_round.id;

  insert into game_events (game_id, type, data)
  values (p_game_id, 'round_revealed', jsonb_build_object(
    'caller', p_caller, 'call_type', p_call_type,
    'actual', v_actual, 'bid_qty', v_round.last_bid_quantity, 'bid_face', v_round.last_bid_face,
    'loser', v_loser, 'snapshot', v_snapshot
  ));

  -- check end of game
  select count(*) into v_active_count from game_players where game_id = p_game_id and is_eliminated = false;
  if v_active_count <= 1 then
    select user_id into v_winner from game_players where game_id = p_game_id and is_eliminated = false limit 1;
    update games set status = 'ended', winner_id = v_winner, ended_at = now(), current_turn_player_id = null
      where id = p_game_id;
    insert into game_events (game_id, type, data) values (p_game_id, 'game_ended', jsonb_build_object('winner', v_winner));
  end if;
end;
$$;

-- =========================================================
-- RPC: DUDO
-- =========================================================
create or replace function public.rpc_call_dudo(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game games%rowtype;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_game from games where id = p_game_id;
  if v_game.status <> 'playing' then raise exception 'game not active'; end if;
  if v_game.current_turn_player_id <> v_uid then raise exception 'not your turn'; end if;

  perform _resolve_round(p_game_id, v_uid, 'dudo');
end;
$$;

-- =========================================================
-- RPC: CALZA (any non-bidder, on their turn or out-of-turn allowed)
-- For simplicity: only the current turn player may call calza too.
-- =========================================================
create or replace function public.rpc_call_calza(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game games%rowtype;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_game from games where id = p_game_id;
  if v_game.status <> 'playing' then raise exception 'game not active'; end if;
  if v_game.current_turn_player_id <> v_uid then raise exception 'not your turn'; end if;

  perform _resolve_round(p_game_id, v_uid, 'calza');
end;
$$;

-- =========================================================
-- RPC: ADVANCE TO NEXT ROUND (any player in the game can trigger after reveal)
-- =========================================================
create or replace function public.rpc_next_round(p_game_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game games%rowtype;
  v_round rounds%rowtype;
  v_starter uuid;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_game from games where id = p_game_id;
  if v_game.status <> 'playing' then raise exception 'game not active'; end if;
  if not exists (select 1 from game_players where game_id = p_game_id and user_id = v_uid) then
    raise exception 'not in game';
  end if;

  select * into v_round from rounds where id = v_game.current_round_id;
  if v_round.status <> 'revealed' then raise exception 'round still in progress'; end if;

  -- starter for next round: loser if any, else last caller
  if v_round.loser_id is not null then
    v_starter := v_round.loser_id;
    -- if loser eliminated, pass to next active
    if exists (select 1 from game_players where game_id = p_game_id and user_id = v_starter and is_eliminated = true) then
      v_starter := _next_player(p_game_id, v_starter);
    end if;
  else
    v_starter := _next_player(p_game_id, v_round.caller_id);
  end if;

  perform _start_round(p_game_id, v_starter);
end;
$$;

-- =========================================================
-- RPC: SET USERNAME
-- =========================================================
create or replace function public.rpc_set_username(p_username text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if length(trim(p_username)) < 1 or length(p_username) > 24 then raise exception 'bad username'; end if;
  insert into profiles (user_id, username) values (auth.uid(), trim(p_username))
    on conflict (user_id) do update set username = excluded.username;
end;
$$;

-- =========================================================
-- REALTIME
-- =========================================================
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.game_events;
alter publication supabase_realtime add table public.round_dice;
