import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureSignedIn } from "@/lib/auth";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string>("");
  const [isGuest, setIsGuest] = useState<boolean>(true);
  const [stats, setStats] = useState<{ elo: number; wins: number; losses: number; games_played: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const id = await ensureSignedIn();
        if (!mounted) return;
        setUserId(id);
        // Derive guest status from the session itself for instant UI updates,
        // independent of any DB trigger latency on the profiles row.
        const { data: sess } = await supabase.auth.getSession();
        const u = sess.session?.user;
        const sessionGuest = Boolean((u as any)?.is_anonymous) || !u?.email;
        const { data } = await supabase
          .from("profiles")
          .select("username, is_guest, elo, wins, losses, games_played")
          .eq("user_id", id)
          .maybeSingle();
        if (!mounted) return;
        if (data?.username) setUsernameState(data.username);
        setIsGuest(sessionGuest && (data?.is_guest ?? true));
        if (data) setStats({ elo: data.elo, wins: data.wins, losses: data.losses, games_played: data.games_played });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      load();
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { userId, username, setUsernameState, loading, isGuest, stats };
}
