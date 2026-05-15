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

const redirect = () => (typeof window !== "undefined" ? window.location.origin : undefined);

/** Sign up with email/password. If currently anonymous, upgrades the guest account
 *  in place so the user keeps their existing stats and rating. */
export async function signUpWithEmail(email: string, password: string, username?: string) {
  const { data: sess } = await supabase.auth.getSession();
  const isAnon = (sess.session?.user as any)?.is_anonymous;

  if (sess.session?.user && isAnon) {
    // Upgrade anonymous → permanent
    const { error } = await supabase.auth.updateUser({ email, password, data: username ? { username } : undefined });
    if (error) throw error;
    if (username) await setUsername(username).catch(() => {});
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirect(), data: username ? { username } : undefined },
  });
  if (error) throw error;
  if (username) await setUsername(username).catch(() => {});
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  // Re-create a guest session so the app keeps working
  await supabase.auth.signInAnonymously();
}
