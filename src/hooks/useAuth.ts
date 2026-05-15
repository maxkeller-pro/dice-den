import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureSignedIn } from "@/lib/auth";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const id = await ensureSignedIn();
        if (!mounted) return;
        setUserId(id);
        const { data } = await supabase.from("profiles").select("username").eq("user_id", id).maybeSingle();
        if (mounted && data?.username) setUsernameState(data.username);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { userId, username, setUsernameState, loading };
}
