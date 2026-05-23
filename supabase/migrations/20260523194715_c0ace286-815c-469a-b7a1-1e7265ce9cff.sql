-- 1) Ajout du champ rule_set
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS rule_set text NOT NULL DEFAULT 'traditional';
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'games_rule_set_check' AND table_name = 'games'
  ) THEN
    ALTER TABLE public.games ADD CONSTRAINT games_rule_set_check CHECK (rule_set IN ('traditional','new'));
  END IF;
END $$;

-- 2) rpc_create_game accepte la règle
DROP FUNCTION IF EXISTS public.rpc_create_game();
DROP FUNCTION IF EXISTS public.rpc_create_game(text);

CREATE OR REPLACE FUNCTION public.rpc_create_game(p_rule_set text DEFAULT 'traditional')
RETURNS TABLE(game_id uuid, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_id uuid;
  v_attempts int := 0;
  v_rule text := COALESCE(p_rule_set, 'traditional');
begin
  if v_uid is null then raise exception 'auth required'; end if;
  if v_rule not in ('traditional','new') then raise exception 'invalid rule_set'; end if;

  loop
    v_code := gen_game_code();
    v_attempts := v_attempts + 1;
    exit when not exists (select 1 from games where games.code = v_code) or v_attempts > 10;
  end loop;

  insert into games (code, host_id, rule_set) values (v_code, v_uid, v_rule) returning id into v_id;
  insert into game_players (game_id, user_id, seat) values (v_id, v_uid, 0);
  insert into game_events (game_id, type, data) values (v_id, 'game_created', jsonb_build_object('host', v_uid, 'rule_set', v_rule));

  return query select v_id, v_code;
end;
$function$;

-- 3) rpc_place_bid prend en compte la règle "new"
CREATE OR REPLACE FUNCTION public.rpc_place_bid(p_game_id uuid, p_quantity integer, p_face integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  if v_round.is_palifico and v_round.last_bid_face is not null and p_face <> v_round.last_bid_face then
    raise exception 'palifico: face is locked';
  end if;

  if v_round.is_palifico and p_face = 1 and v_round.last_bid_face is not null then
    raise exception 'palifico: 1s not allowed mid-round';
  end if;

  v_pq := v_round.last_bid_quantity;
  v_pf := v_round.last_bid_face;

  if v_pq is not null then
    if v_round.is_palifico then
      if p_quantity <= v_pq then raise exception 'must raise quantity'; end if;
    else
      if p_face = 1 and v_pf <> 1 then
        v_min_qty := (v_pq / 2) + 1;
        if p_quantity < v_min_qty then raise exception 'switching to 1s requires qty >= %', v_min_qty; end if;
      elsif p_face <> 1 and v_pf = 1 then
        v_min_qty := v_pq * 2 + 1;
        if p_quantity < v_min_qty then raise exception 'switching from 1s requires qty >= %', v_min_qty; end if;
      elsif v_game.rule_set = 'new' then
        -- Règle Nouveau: la quantité doit strictement augmenter, OU à quantité égale, face strictement supérieure.
        if p_quantity < v_pq then raise exception 'must not lower quantity'; end if;
        if p_quantity = v_pq and p_face <= v_pf then raise exception 'same qty requires higher face'; end if;
      else
        -- Règle Traditionnelle
        if p_face = v_pf then
          if p_quantity <= v_pq then raise exception 'must raise quantity'; end if;
        else
          if p_face < v_pf then raise exception 'face must be >= previous'; end if;
          if p_quantity < v_pq then raise exception 'qty must be >= previous'; end if;
        end if;
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
$function$;