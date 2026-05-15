import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { signInWithEmail, signUpWithEmail, signOut } from "@/lib/auth";
import { toast } from "sonner";
import { ArrowLeft, Dices, Loader2, LogOut, Trophy } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: Auth,
  head: () => ({
    meta: [
      { title: "Account — Liar's Dice" },
      { name: "description", content: "Create an account to save your stats and climb the leaderboard." },
    ],
  }),
});

function Auth() {
  const { userId, username, isGuest, stats, loading } = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit() {
    if (!email.trim() || password.length < 6) {
      toast.error("Email and 6+ char password required");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, (name || username || "").trim() || undefined);
        toast.success(isGuest ? "Account created — your stats are saved!" : "Account created!");
      } else {
        await signInWithEmail(email.trim(), password);
        toast.success("Welcome back");
      }
      nav({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSignOut() {
    setBusy(true);
    try {
      await signOut();
      toast.success("Signed out");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !userId) {
    return <main className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
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
          {isGuest ? "Save your progress" : "Your account"}
        </div>

        {!isGuest ? (
          <div className="mt-6 glass rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</p>
              <p className="font-display text-lg">{username || "Player"}</p>
            </div>
            {stats && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="Elo" value={stats.elo} accent />
                <Stat label="Wins" value={stats.wins} />
                <Stat label="Loss" value={stats.losses} />
                <Stat label="Games" value={stats.games_played} />
              </div>
            )}
            <div className="flex gap-2">
              <Link to="/leaderboard" className="flex-1">
                <Button variant="outline" className="w-full border-white/15"><Trophy className="h-4 w-4 mr-2" />Leaderboard</Button>
              </Link>
              <Button onClick={onSignOut} disabled={busy} variant="ghost" className="text-muted-foreground">
                <LogOut className="h-4 w-4 mr-2" />Sign out
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              You're playing as a guest. Create an account to keep your Elo, wins and ranking across devices.
            </p>

            <div className="mt-4 inline-flex rounded-lg glass p-1 text-sm">
              <button onClick={() => setMode("signup")} className={`px-3 py-1.5 rounded-md font-display ${mode === "signup" ? "bg-white/10" : "text-muted-foreground"}`}>Sign up</button>
              <button onClick={() => setMode("signin")} className={`px-3 py-1.5 rounded-md font-display ${mode === "signin" ? "bg-white/10" : "text-muted-foreground"}`}>Sign in</button>
            </div>

            <div className="mt-4 glass rounded-2xl p-5 space-y-3">
              {mode === "signup" && (
                <Input
                  placeholder="Display name"
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-black/30 border-white/10 font-display"
                />
              )}
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-black/30 border-white/10"
              />
              <Input
                type="password"
                placeholder="Password (6+ chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-black/30 border-white/10"
              />
              <Button onClick={submit} disabled={busy} className="w-full h-12 font-display font-bold bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white shadow-glow-violet">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
              {mode === "signup" && (
                <p className="text-[11px] text-muted-foreground">
                  Your current guest stats {stats ? `(Elo ${stats.elo}, ${stats.wins}W / ${stats.losses}L)` : ""} will be transferred to your new account.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 p-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-display text-lg font-bold ${accent ? "text-[var(--cyan)]" : ""}`}>{value}</p>
    </div>
  );
}