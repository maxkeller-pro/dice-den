import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { setUsername } from "@/lib/auth";
import { createGame, joinGame } from "@/lib/game-api";
import { toast } from "sonner";
import { Dices, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/play")({
  component: Play,
  head: () => ({ meta: [{ title: "Play — Liar's Dice" }, { name: "description", content: "Create a private room or join with a code." }] }),
});

function Play() {
  const { userId, username, setUsernameState, loading, isGuest, stats } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const displayName = name || username;

  async function persistName() {
    const final = (name || username).trim();
    if (!final) return;
    if (final !== username) {
      await setUsername(final);
      setUsernameState(final);
    }
  }

  async function onCreate() {
    setBusy(true);
    try {
      await persistName();
      const { code: c } = await createGame();
      nav({ to: "/room/$code", params: { code: c } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not create room");
    } finally { setBusy(false); }
  }

  async function onJoin() {
    if (!code.trim()) { toast.error("Enter a room code"); return; }
    setBusy(true);
    try {
      await persistName();
      await joinGame(code);
      const { data } = await supabase.from("games").select("code").eq("code", code.trim().toUpperCase()).maybeSingle();
      nav({ to: "/room/$code", params: { code: data?.code ?? code.trim().toUpperCase() } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not join");
    } finally { setBusy(false); }
  }

  if (loading || !userId) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 mx-auto max-w-md px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <div className="mt-6 flex items-center gap-2 font-display text-xl font-bold">
          <Dices className="h-6 w-6 text-[var(--violet)]" />
          Enter the table
        </div>

        <div className="mt-3 glass rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          {isGuest ? (
            <>
              <span className="text-muted-foreground">Playing as <span className="text-foreground font-display">guest</span></span>
              <Link to="/auth" className="text-[var(--cyan)] font-display hover:underline">Save my stats →</Link>
            </>
          ) : (
            <>
              <span className="text-muted-foreground"><span className="text-foreground font-display">{username}</span> · Elo <span className="text-[var(--cyan)] font-mono">{stats?.elo ?? "—"}</span></span>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground">Account</Link>
            </>
          )}
        </div>

        <div className="mt-6 glass rounded-2xl p-5 space-y-3">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">Display name</label>
          <Input
            placeholder={username || "Your alias"}
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 bg-black/30 border-white/10 font-display"
          />
          <p className="text-[11px] text-muted-foreground">{displayName ? `Playing as ${displayName}` : "Pick a name"}</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-semibold">Create</h3>
            <p className="mt-1 text-xs text-muted-foreground">Spin up a private room and share the code.</p>
            <Button onClick={onCreate} disabled={busy} className="mt-4 w-full h-12 font-display font-bold bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white shadow-glow-violet">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create room"}
            </Button>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-semibold">Join</h3>
            <p className="mt-1 text-xs text-muted-foreground">Enter a 6-character code.</p>
            <Input
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="mt-4 h-12 bg-black/30 border-white/10 font-mono text-center text-lg tracking-[0.5em] uppercase"
            />
            <Button onClick={onJoin} disabled={busy} variant="outline" className="mt-3 w-full h-12 font-display font-bold border-white/15">
              Join room
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
