import { supabase } from "@/integrations/supabase/client";

export async function createGame() {
  const { data, error } = await supabase.rpc("rpc_create_game");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { game_id: string; code: string };
}

export async function joinGame(code: string) {
  const { data, error } = await supabase.rpc("rpc_join_game", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as string;
}

export async function startGame(gameId: string) {
  const { error } = await supabase.rpc("rpc_start_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function placeBid(gameId: string, qty: number, face: number) {
  const { error } = await supabase.rpc("rpc_place_bid", { p_game_id: gameId, p_quantity: qty, p_face: face });
  if (error) throw error;
}

export async function callDudo(gameId: string) {
  const { error } = await supabase.rpc("rpc_call_dudo", { p_game_id: gameId });
  if (error) throw error;
}

export async function callCalza(gameId: string) {
  const { error } = await supabase.rpc("rpc_call_calza", { p_game_id: gameId });
  if (error) throw error;
}

export async function nextRound(gameId: string) {
  const { error } = await supabase.rpc("rpc_next_round", { p_game_id: gameId });
  if (error) throw error;
}
