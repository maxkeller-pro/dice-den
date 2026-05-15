CREATE OR REPLACE FUNCTION public.yams_score(p_game_id uuid, p_category text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Partie finie ? (toutes les cartes ont 13 catégories remplies)
  SELECT bool_and(key_count >= 13) INTO v_all_done
  FROM (
    SELECT (SELECT count(*) FROM jsonb_object_keys(scorecard)) AS key_count
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
$function$;