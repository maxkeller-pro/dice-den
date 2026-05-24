import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Game = {
  id: string; code: string; host_id: string; status: "lobby" | "playing" | "ended";
  current_round_id: string | null; current_turn_player_id: string | null;
  winner_id: string | null; starting_dice: number; max_players: number;
};
export type Player = {
  id: string; game_id: string; user_id: string; seat: number;
  dice_count: number; is_connected: boolean; is_eliminated: boolean;
  username?: string;
};
export type Round = {
  id: string; game_id: string; round_number: number; is_palifico: boolean;
  starter_player_id: string; current_player_id: string;
  last_bid_quantity: number | null; last_bid_face: number | null; last_bidder_id: string | null;
  status: "bidding" | "revealed"; loser_id: string | null; caller_id: string | null;
  call_type: "dudo" | "calza" | null; actual_count: number | null;
  dice_snapshot: Array<{ user_id: string; dice: number[] }> | null;
};
export type GameEvent = { id: string; game_id: string; type: string; data: any; created_at: string };

export function useGameState(code: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [myDice, setMyDice] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadGame(gameId: string) {
      const [{ data: g }, { data: ps }, profMap] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).maybeSingle(),
        supabase.from("game_players").select("*").eq("game_id", gameId).order("seat"),
        (async () => {
          const { data: ps2 } = await supabase.from("game_players").select("user_id").eq("game_id", gameId);
          const ids = (ps2 ?? []).map((p) => p.user_id);
          if (ids.length === 0) return new Map<string, string>();
          const { data: profs } = await supabase.from("profiles").select("user_id, username").in("user_id", ids);
          return new Map((profs ?? []).map((p) => [p.user_id, p.username]));
        })(),
      ]);
      if (cancelled) return;
      if (g) setGame(g as Game);
      if (ps) setPlayers((ps as Player[]).map((p) => ({ ...p, username: profMap.get(p.user_id) })));
      if (g?.current_round_id) {
        const { data: r } = await supabase.from("rounds").select("*").eq("id", g.current_round_id).maybeSingle();
        if (!cancelled && r) setRound(r as Round);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: rd } = await supabase.from("round_dice").select("dice").eq("round_id", g.current_round_id).eq("user_id", user.id).maybeSingle();
          if (!cancelled) setMyDice((rd?.dice as number[]) ?? []);
        }
      } else {
        setRound(null); setMyDice([]);
      }
      const { data: ev } = await supabase.from("game_events").select("*").eq("game_id", gameId).order("created_at", { ascending: false }).limit(20);
      if (!cancelled && ev) setEvents(ev as GameEvent[]);
    }

    (async () => {
      const { data: g, error: e } = await supabase.from("games").select("*").eq("code", code.toUpperCase()).maybeSingle();
      if (cancelled) return;
      if (e || !g) { setError("Room not found"); return; }
      await loadGame(g.id);

      channel = supabase
        .channel(`game:${g.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${g.id}` }, () => loadGame(g.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${g.id}` }, () => loadGame(g.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `game_id=eq.${g.id}` }, () => loadGame(g.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "game_events", filter: `game_id=eq.${g.id}` }, () => loadGame(g.id))
        .on("postgres_changes", { event: "*", schema: "public", table: "round_dice" }, () => loadGame(g.id))
        .subscribe();
    })();

    // Polling fallback in case realtime is silently disconnected.
    const pollId = setInterval(async () => {
      const { data: g } = await supabase.from("games").select("id").eq("code", code.toUpperCase()).maybeSingle();
      if (g && !cancelled) loadGame(g.id);
    }, 3000);

    return () => { cancelled = true; clearInterval(pollId); if (channel) supabase.removeChannel(channel); };
  }, [code]);

  return { game, players, round, events, myDice, error };
}
