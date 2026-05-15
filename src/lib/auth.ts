import { supabase } from "@/integrations/supabase/client";

export async function ensureSignedIn(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user?.id) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) throw error ?? new Error("Sign-in failed");
  return anon.user.id;
}

export async function setUsername(username: string) {
  const trimmed = username.trim().slice(0, 24);
  if (!trimmed) return;
  const { error } = await supabase.rpc("rpc_set_username", { p_username: trimmed });
  if (error) throw error;
}
