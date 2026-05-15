
-- Add ranking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS elo integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS wins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_played integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT true;

-- Mark guest accounts (anonymous auth users have empty email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_is_guest boolean;
begin
  v_is_guest := coalesce(new.is_anonymous, new.email is null or new.email = '');
  insert into public.profiles (user_id, username, is_guest)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'Player-' || substr(new.id::text, 1, 6)),
    v_is_guest
  )
  on conflict (user_id) do update set is_guest = excluded.is_guest;
  return new;
end;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync existing profiles' is_guest from auth.users
UPDATE public.profiles p
SET is_guest = coalesce(u.is_anonymous, u.email is null or u.email = '')
FROM auth.users u
WHERE p.user_id = u.id;

-- Helper: apply Elo updates for a finished game
CREATE OR REPLACE FUNCTION public._apply_elo(p_game_id uuid, p_winner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_k constant int := 32;
  v_winner_elo int;
  v_player record;
  v_expected float;
  v_delta int;
  v_total_delta int := 0;
begin
  if p_winner is null then return; end if;

  select elo into v_winner_elo from profiles where user_id = p_winner;
  if v_winner_elo is null then return; end if;

  for v_player in
    select gp.user_id, pr.elo
    from game_players gp
    join profiles pr on pr.user_id = gp.user_id
    where gp.game_id = p_game_id and gp.user_id <> p_winner
  loop
    v_expected := 1.0 / (1.0 + power(10.0, (v_player.elo - v_winner_elo) / 400.0));
    v_delta := round(v_k * (0.0 - (1.0 - v_expected)))::int; -- loser score 0
    update profiles
      set elo = greatest(elo + v_delta, 100),
          losses = losses + 1,
          games_played = games_played + 1
      where user_id = v_player.user_id;
    -- winner gets symmetric gain vs this opponent
    v_total_delta := v_total_delta + round(v_k * (1.0 - v_expected))::int;
  end loop;

  update profiles
    set elo = elo + v_total_delta,
        wins = wins + 1,
        games_played = games_played + 1
    where user_id = p_winner;
end;
$$;

-- Update _resolve_round to apply Elo on game end
CREATE OR REPLACE FUNCTION public._resolve_round(p_game_id uuid, p_caller uuid, p_call_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_round rounds%rowtype;
  v_game games%rowtype;
  v_actual int := 0;
  v_snapshot jsonb := '[]'::jsonb;
  v_rec record;
  v_loser uuid;
  v_winner uuid;
  v_active_count int;
begin
  select * into v_game from games where id = p_game_id;
  select * into v_round from rounds where id = v_game.current_round_id;

  if v_round.last_bidder_id is null then raise exception 'no bid to challenge'; end if;
  if p_call_type = 'calza' and p_caller = v_round.last_bidder_id then raise exception 'cannot calza own bid'; end if;

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
      v_loser := p_caller;
    else
      v_loser := v_round.last_bidder_id;
    end if;
    update game_players set dice_count = greatest(dice_count - 1, 0) where game_id = p_game_id and user_id = v_loser;
  elsif p_call_type = 'calza' then
    if v_actual = v_round.last_bid_quantity then
      update game_players set dice_count = least(dice_count + 1, v_game.starting_dice)
        where game_id = p_game_id and user_id = p_caller;
      v_loser := null;
    else
      v_loser := p_caller;
      update game_players set dice_count = greatest(dice_count - 1, 0) where game_id = p_game_id and user_id = p_caller;
    end if;
  end if;

  insert into bids (round_id, player_id, action) values (v_round.id, p_caller, p_call_type);

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

  select count(*) into v_active_count from game_players where game_id = p_game_id and is_eliminated = false;
  if v_active_count <= 1 then
    select user_id into v_winner from game_players where game_id = p_game_id and is_eliminated = false limit 1;
    update games set status = 'ended', winner_id = v_winner, ended_at = now(), current_turn_player_id = null
      where id = p_game_id;
    -- Apply Elo updates
    perform public._apply_elo(p_game_id, v_winner);
    insert into game_events (game_id, type, data) values (p_game_id, 'game_ended', jsonb_build_object('winner', v_winner));
  end if;
end;
$function$;
