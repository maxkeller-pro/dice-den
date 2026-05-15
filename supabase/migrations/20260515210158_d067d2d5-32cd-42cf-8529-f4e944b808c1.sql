
-- ==========================================================
-- YAMS (Yahtzee classique) — multi-joueur en ligne
-- ==========================================================

-- Table : parties
CREATE TABLE public.yams_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  status public.game_status NOT NULL DEFAULT 'lobby',
  max_players INT NOT NULL DEFAULT 5,
  current_player_id UUID,
  current_dice INT[] NOT NULL DEFAULT ARRAY[0,0,0,0,0],
  held BOOLEAN[] NOT NULL DEFAULT ARRAY[false,false,false,false,false],
  rolls_used INT NOT NULL DEFAULT 0,
  winner_id UUID,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table : joueurs d'une partie
CREATE TABLE public.yams_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.yams_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seat INT NOT NULL,
  scorecard JSONB NOT NULL DEFAULT '{}'::jsonb,
  total INT NOT NULL DEFAULT 0,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id),
  UNIQUE (game_id, seat)
);

-- Table : évènements
CREATE TABLE public.yams_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.yams_games(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX yams_players_game_idx ON public.yams_players(game_id);
CREATE INDEX yams_events_game_idx ON public.yams_events(game_id, created_at);

-- RLS
ALTER TABLE public.yams_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yams_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yams_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "yams games readable by all authed" ON public.yams_games
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "yams users create games as host" ON public.yams_games
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "yams players readable by all authed" ON public.yams_players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "yams events readable by all authed" ON public.yams_events
  FOR SELECT TO authenticated USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.yams_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yams_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yams_events;

ALTER TABLE public.yams_games REPLICA IDENTITY FULL;
ALTER TABLE public.yams_players REPLICA IDENTITY FULL;
ALTER TABLE public.yams_events REPLICA IDENTITY FULL;

-- ==========================================================
-- Helpers
-- ==========================================================

-- Calcule le score pour une catégorie Yahtzee classique
CREATE OR REPLACE FUNCTION public._yams_calc_score(p_dice INT[], p_cat TEXT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_counts INT[] := ARRAY[0,0,0,0,0,0];
  v_d INT;
  v_sum INT := 0;
  v_max INT := 0;
  v_has2 BOOLEAN := false;
  v_has3 BOOLEAN := false;
  v_face INT;
  v_run INT := 0;
  v_best_run INT := 0;
BEGIN
  IF array_length(p_dice, 1) IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'invalid dice array';
  END IF;
  FOREACH v_d IN ARRAY p_dice LOOP
    IF v_d < 1 OR v_d > 6 THEN RAISE EXCEPTION 'invalid die value'; END IF;
    v_counts[v_d] := v_counts[v_d] + 1;
    v_sum := v_sum + v_d;
  END LOOP;

  -- max count
  FOR v_face IN 1..6 LOOP
    IF v_counts[v_face] > v_max THEN v_max := v_counts[v_face]; END IF;
    IF v_counts[v_face] = 2 THEN v_has2 := true; END IF;
    IF v_counts[v_face] = 3 THEN v_has3 := true; END IF;
  END LOOP;

  -- best straight run
  v_run := 0; v_best_run := 0;
  FOR v_face IN 1..6 LOOP
    IF v_counts[v_face] >= 1 THEN
      v_run := v_run + 1;
      IF v_run > v_best_run THEN v_best_run := v_run; END IF;
    ELSE
      v_run := 0;
    END IF;
  END LOOP;

  CASE p_cat
    WHEN 'ones'   THEN RETURN v_counts[1] * 1;
    WHEN 'twos'   THEN RETURN v_counts[2] * 2;
    WHEN 'threes' THEN RETURN v_counts[3] * 3;
    WHEN 'fours'  THEN RETURN v_counts[4] * 4;
    WHEN 'fives'  THEN RETURN v_counts[5] * 5;
    WHEN 'sixes'  THEN RETURN v_counts[6] * 6;
    WHEN 'three_kind'    THEN RETURN CASE WHEN v_max >= 3 THEN v_sum ELSE 0 END;
    WHEN 'four_kind'     THEN RETURN CASE WHEN v_max >= 4 THEN v_sum ELSE 0 END;
    WHEN 'full_house'    THEN RETURN CASE WHEN v_has3 AND v_has2 THEN 25
                                          WHEN v_max = 5 THEN 25  -- 5 of a kind counts as full
                                          ELSE 0 END;
    WHEN 'small_straight' THEN RETURN CASE WHEN v_best_run >= 4 THEN 30 ELSE 0 END;
    WHEN 'large_straight' THEN RETURN CASE WHEN v_best_run >= 5 THEN 40 ELSE 0 END;
    WHEN 'yahtzee'        THEN RETURN CASE WHEN v_max = 5 THEN 50 ELSE 0 END;
    WHEN 'chance'         THEN RETURN v_sum;
    ELSE RAISE EXCEPTION 'unknown category %', p_cat;
  END CASE;
END;
$$;

-- Trouve le prochain joueur (par siège)
CREATE OR REPLACE FUNCTION public._yams_next_player(p_game_id UUID, p_current UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_seat INT; v_next UUID;
BEGIN
  SELECT seat INTO v_seat FROM yams_players WHERE game_id = p_game_id AND user_id = p_current;
  SELECT user_id INTO v_next FROM yams_players
    WHERE game_id = p_game_id AND seat > v_seat ORDER BY seat LIMIT 1;
  IF v_next IS NOT NULL THEN RETURN v_next; END IF;
  SELECT user_id INTO v_next FROM yams_players
    WHERE game_id = p_game_id ORDER BY seat LIMIT 1;
  RETURN v_next;
END;
$$;

-- ==========================================================
-- RPCs
-- ==========================================================

CREATE OR REPLACE FUNCTION public.yams_create_game()
RETURNS TABLE(game_id UUID, code TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid UUID := auth.uid(); v_code TEXT; v_id UUID; v_attempts INT := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  LOOP
    v_code := gen_game_code();
    v_attempts := v_attempts + 1;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM yams_games WHERE yams_games.code = v_code) OR v_attempts > 10;
  END LOOP;
  INSERT INTO yams_games (code, host_id) VALUES (v_code, v_uid) RETURNING id INTO v_id;
  INSERT INTO yams_players (game_id, user_id, seat) VALUES (v_id, v_uid, 0);
  INSERT INTO yams_events (game_id, type, data) VALUES (v_id, 'game_created', jsonb_build_object('host', v_uid));
  RETURN QUERY SELECT v_id, v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.yams_join_game(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid UUID := auth.uid(); v_game yams_games%ROWTYPE; v_seat INT; v_count INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v_game FROM yams_games WHERE code = upper(p_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

  IF EXISTS (SELECT 1 FROM yams_players WHERE game_id = v_game.id AND user_id = v_uid) THEN
    UPDATE yams_players SET is_connected = true WHERE game_id = v_game.id AND user_id = v_uid;
    RETURN v_game.id;
  END IF;

  IF v_game.status <> 'lobby' THEN RAISE EXCEPTION 'Game already started'; END IF;
  SELECT count(*) INTO v_count FROM yams_players WHERE game_id = v_game.id;
  IF v_count >= v_game.max_players THEN RAISE EXCEPTION 'Room full'; END IF;
  v_seat := v_count;
  INSERT INTO yams_players (game_id, user_id, seat) VALUES (v_game.id, v_uid, v_seat);
  INSERT INTO yams_events (game_id, type, data) VALUES (v_game.id, 'player_joined', jsonb_build_object('user_id', v_uid));
  RETURN v_game.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.yams_start_game(p_game_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid UUID := auth.uid(); v_game yams_games%ROWTYPE; v_first UUID; v_n INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v_game FROM yams_games WHERE id = p_game_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;
  IF v_game.host_id <> v_uid THEN RAISE EXCEPTION 'only host can start'; END IF;
  IF v_game.status <> 'lobby' THEN RAISE EXCEPTION 'already started'; END IF;
  SELECT count(*) INTO v_n FROM yams_players WHERE game_id = p_game_id;
  IF v_n < 2 THEN RAISE EXCEPTION 'need at least 2 players'; END IF;

  SELECT user_id INTO v_first FROM yams_players WHERE game_id = p_game_id ORDER BY seat LIMIT 1;

  UPDATE yams_games SET
    status = 'playing',
    started_at = now(),
    current_player_id = v_first,
    current_dice = ARRAY[0,0,0,0,0],
    held = ARRAY[false,false,false,false,false],
    rolls_used = 0
  WHERE id = p_game_id;

  INSERT INTO yams_events (game_id, type, data) VALUES (p_game_id, 'game_started', jsonb_build_object('first', v_first));
END;
$$;

-- Lance les dés non-gardés. p_held = bool[5]. Reset par tour quand rolls_used=0.
CREATE OR REPLACE FUNCTION public.yams_roll(p_game_id UUID, p_held BOOLEAN[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_game yams_games%ROWTYPE;
  v_dice INT[];
  v_held BOOLEAN[];
  v_i INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v_game FROM yams_games WHERE id = p_game_id;
  IF v_game.status <> 'playing' THEN RAISE EXCEPTION 'game not active'; END IF;
  IF v_game.current_player_id <> v_uid THEN RAISE EXCEPTION 'not your turn'; END IF;
  IF v_game.rolls_used >= 3 THEN RAISE EXCEPTION 'no rolls left'; END IF;
  IF p_held IS NULL OR array_length(p_held, 1) <> 5 THEN
    v_held := ARRAY[false,false,false,false,false];
  ELSE
    v_held := p_held;
  END IF;

  -- Premier lancer du tour : ignore le held (tous sont relancés)
  IF v_game.rolls_used = 0 THEN
    v_held := ARRAY[false,false,false,false,false];
  END IF;

  v_dice := v_game.current_dice;
  FOR v_i IN 1..5 LOOP
    IF NOT v_held[v_i] THEN
      v_dice[v_i] := 1 + floor(random() * 6)::INT;
    END IF;
  END LOOP;

  UPDATE yams_games SET
    current_dice = v_dice,
    held = v_held,
    rolls_used = rolls_used + 1
  WHERE id = p_game_id;

  INSERT INTO yams_events (game_id, type, data)
  VALUES (p_game_id, 'roll', jsonb_build_object('player', v_uid, 'dice', to_jsonb(v_dice), 'roll_no', v_game.rolls_used + 1));
END;
$$;

-- Met à jour les dés gardés sans relancer (UI sync). Optionnel.
CREATE OR REPLACE FUNCTION public.yams_set_held(p_game_id UUID, p_held BOOLEAN[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_uid UUID := auth.uid(); v_game yams_games%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v_game FROM yams_games WHERE id = p_game_id;
  IF v_game.status <> 'playing' THEN RAISE EXCEPTION 'game not active'; END IF;
  IF v_game.current_player_id <> v_uid THEN RAISE EXCEPTION 'not your turn'; END IF;
  IF v_game.rolls_used = 0 THEN RAISE EXCEPTION 'roll first'; END IF;
  IF array_length(p_held, 1) <> 5 THEN RAISE EXCEPTION 'invalid held'; END IF;
  UPDATE yams_games SET held = p_held WHERE id = p_game_id;
END;
$$;

-- Score une catégorie, calcule total + bonus, fait avancer le tour, finit la partie
CREATE OR REPLACE FUNCTION public.yams_score(p_game_id UUID, p_category TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_game yams_games%ROWTYPE;
  v_player yams_players%ROWTYPE;
  v_score INT;
  v_card JSONB;
  v_next UUID;
  v_all_done BOOLEAN;
  v_winner UUID;
  v_winner_total INT;
  v_upper INT;
  v_lower INT;
  v_bonus INT;
  v_grand INT;
  v_p RECORD;
  v_cats CONSTANT TEXT[] := ARRAY['ones','twos','threes','fours','fives','sixes',
    'three_kind','four_kind','full_house','small_straight','large_straight','yahtzee','chance'];
  v_upper_cats CONSTANT TEXT[] := ARRAY['ones','twos','threes','fours','fives','sixes'];
  v_c TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO v_game FROM yams_games WHERE id = p_game_id;
  IF v_game.status <> 'playing' THEN RAISE EXCEPTION 'game not active'; END IF;
  IF v_game.current_player_id <> v_uid THEN RAISE EXCEPTION 'not your turn'; END IF;
  IF v_game.rolls_used = 0 THEN RAISE EXCEPTION 'must roll first'; END IF;
  IF NOT (p_category = ANY(v_cats)) THEN RAISE EXCEPTION 'unknown category'; END IF;

  SELECT * INTO v_player FROM yams_players WHERE game_id = p_game_id AND user_id = v_uid;
  IF (v_player.scorecard ? p_category) THEN RAISE EXCEPTION 'category already used'; END IF;

  v_score := _yams_calc_score(v_game.current_dice, p_category);
  v_card := v_player.scorecard || jsonb_build_object(p_category, v_score);

  -- recompute totals
  v_upper := 0; v_lower := 0;
  FOREACH v_c IN ARRAY v_cats LOOP
    IF v_card ? v_c THEN
      IF v_c = ANY(v_upper_cats) THEN
        v_upper := v_upper + (v_card->>v_c)::INT;
      ELSE
        v_lower := v_lower + (v_card->>v_c)::INT;
      END IF;
    END IF;
  END LOOP;
  v_bonus := CASE WHEN v_upper >= 63 THEN 35 ELSE 0 END;
  v_grand := v_upper + v_bonus + v_lower;

  UPDATE yams_players
    SET scorecard = v_card, total = v_grand
  WHERE id = v_player.id;

  INSERT INTO yams_events (game_id, type, data)
  VALUES (p_game_id, 'score', jsonb_build_object(
    'player', v_uid, 'category', p_category, 'score', v_score,
    'dice', to_jsonb(v_game.current_dice), 'total', v_grand
  ));

  -- Partie finie ?
  SELECT bool_and(jsonb_object_keys_count(scorecard) >= 13) INTO v_all_done
  FROM (
    SELECT scorecard, (SELECT count(*) FROM jsonb_object_keys(scorecard)) AS jsonb_object_keys_count
    FROM yams_players WHERE game_id = p_game_id
  ) sub;

  IF v_all_done THEN
    v_winner_total := -1;
    FOR v_p IN SELECT user_id, total FROM yams_players WHERE game_id = p_game_id ORDER BY total DESC LOOP
      IF v_p.total > v_winner_total THEN
        v_winner := v_p.user_id;
        v_winner_total := v_p.total;
      END IF;
    END LOOP;
    UPDATE yams_games SET
      status = 'ended', winner_id = v_winner, ended_at = now(), current_player_id = NULL
    WHERE id = p_game_id;
    INSERT INTO yams_events (game_id, type, data) VALUES (p_game_id, 'game_ended', jsonb_build_object('winner', v_winner, 'total', v_winner_total));
  ELSE
    v_next := _yams_next_player(p_game_id, v_uid);
    UPDATE yams_games SET
      current_player_id = v_next,
      current_dice = ARRAY[0,0,0,0,0],
      held = ARRAY[false,false,false,false,false],
      rolls_used = 0
    WHERE id = p_game_id;
  END IF;
END;
$$;
