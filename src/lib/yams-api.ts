import { supabase } from "@/integrations/supabase/client";

export const YAMS_CATEGORIES = [
  "ones","twos","threes","fours","fives","sixes",
  "three_kind","four_kind","full_house","small_straight","large_straight","yahtzee","chance",
] as const;
export type YamsCategory = typeof YAMS_CATEGORIES[number];
export const YAMS_UPPER: YamsCategory[] = ["ones","twos","threes","fours","fives","sixes"];

export async function yamsCreateGame() {
  const { data, error } = await supabase.rpc("yams_create_game");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { game_id: string; code: string };
}
export async function yamsJoin(code: string) {
  const { data, error } = await supabase.rpc("yams_join_game", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as string;
}
export async function yamsStart(gameId: string) {
  const { error } = await supabase.rpc("yams_start_game", { p_game_id: gameId });
  if (error) throw error;
}
export async function yamsRoll(gameId: string, held: boolean[]) {
  const { error } = await supabase.rpc("yams_roll", { p_game_id: gameId, p_held: held });
  if (error) throw error;
}
export async function yamsSetHeld(gameId: string, held: boolean[]) {
  const { error } = await supabase.rpc("yams_set_held", { p_game_id: gameId, p_held: held });
  if (error) throw error;
}
export async function yamsScore(gameId: string, category: YamsCategory) {
  const { error } = await supabase.rpc("yams_score", { p_game_id: gameId, p_category: category });
  if (error) throw error;
}

// Préview locale du score pour une catégorie donnée (mêmes règles que la fonction PG)
export function previewScore(dice: number[], cat: YamsCategory): number {
  if (!dice || dice.length !== 5 || dice.some((d) => d < 1 || d > 6)) return 0;
  const counts = [0,0,0,0,0,0,0];
  for (const d of dice) counts[d]++;
  const sum = dice.reduce((a,b)=>a+b,0);
  let max = 0, has2 = false, has3 = false;
  for (let f=1; f<=6; f++) { if (counts[f]>max) max=counts[f]; if (counts[f]===2) has2=true; if (counts[f]===3) has3=true; }
  let run = 0, best = 0;
  for (let f=1; f<=6; f++) { if (counts[f]>=1){ run++; if (run>best) best=run;} else run=0; }
  switch (cat) {
    case "ones": return counts[1]*1;
    case "twos": return counts[2]*2;
    case "threes": return counts[3]*3;
    case "fours": return counts[4]*4;
    case "fives": return counts[5]*5;
    case "sixes": return counts[6]*6;
    case "three_kind": return max>=3 ? sum : 0;
    case "four_kind": return max>=4 ? sum : 0;
    case "full_house": return (has3 && has2) || max===5 ? 25 : 0;
    case "small_straight": return best>=4 ? 30 : 0;
    case "large_straight": return best>=5 ? 40 : 0;
    case "yahtzee": return max===5 ? 50 : 0;
    case "chance": return sum;
  }
}
