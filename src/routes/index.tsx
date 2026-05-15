import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Die } from "@/components/game/Die";
import { Dices, Sparkles, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Liar's Dice — Bluff. Bid. Survive." },
      { name: "description", content: "Play the classic bluffing dice game online with friends. Private rooms, real-time multiplayer, no install." },
    ],
  }),
});

function Landing() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <Dices className="h-5 w-5 text-[var(--violet)]" />
          <span>LIAR<span className="text-[var(--cyan)]">.</span>DICE</span>
        </div>
        <Link to="/play">
          <Button size="sm" variant="ghost" className="font-display">Play</Button>
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-10 sm:pt-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-[var(--cyan)]" /> Real-time multiplayer
        </span>
        <h1 className="mt-6 font-display text-5xl sm:text-7xl font-bold leading-[0.95]">
          Bluff. Bid.{" "}
          <span className="bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] bg-clip-text text-transparent">
            Survive.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-base sm:text-lg text-muted-foreground">
          A modern take on the classic bluffing dice game. Spin up a private room,
          share the code, and out-lie your friends — straight from your browser.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/play" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 font-display font-bold text-base bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white shadow-glow-violet hover:brightness-110">
              Start a game
            </Button>
          </Link>
          <Link to="/play" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 font-display font-bold text-base border-white/15 hover:bg-white/5">
              Join with code
            </Button>
          </Link>
        </div>

        <div className="mt-14 flex justify-center gap-3 sm:gap-4">
          {[3, 1, 5, 2, 6].map((v, i) => (
            <Die key={i} value={v} size="lg" className="animate-float-in" />
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto mt-20 max-w-5xl px-5 pb-20 grid gap-4 sm:grid-cols-3">
        <Feature icon={<Users className="h-5 w-5" />} title="2–6 players" desc="Private rooms with shareable codes. Play with friends across any device." />
        <Feature icon={<Zap className="h-5 w-5" />} title="Server-authoritative" desc="All dice rolls and bid validation happen server-side. No cheating possible." />
        <Feature icon={<Dices className="h-5 w-5" />} title="Full Perudo rules" desc="Wildcards, palifico rounds, Dudo and Calza — exactly how it should play." />
      </section>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--violet)]/15 text-[var(--violet)]">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
