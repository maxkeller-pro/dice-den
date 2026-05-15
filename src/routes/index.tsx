import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Die } from "@/components/game/Die";
import { useAuth } from "@/hooks/useAuth";
import { useT, LangSwitcher } from "@/lib/i18n";
import { Dices, Sparkles, Users, Zap, Trophy, User } from "lucide-react";

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
  const { isGuest, stats, username } = useAuth();
  const { t } = useT();
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <Dices className="h-5 w-5 text-[var(--violet)]" />
          <span>LIAR<span className="text-[var(--cyan)]">.</span>DICE</span>
        </div>
        <nav className="flex items-center gap-1">
          <LangSwitcher className="mr-1" />
          <Link to="/leaderboard">
            <Button size="sm" variant="ghost" className="font-display gap-1.5"><Trophy className="h-4 w-4" /><span className="hidden sm:inline">{t("common.ranking")}</span></Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" variant="ghost" className="font-display gap-1.5">
              <User className="h-4 w-4" />
              {isGuest ? <span className="hidden sm:inline">{t("common.signin")}</span> : <span className="hidden sm:inline">{username || t("common.account")}{stats ? ` · ${stats.elo}` : ""}</span>}
            </Button>
          </Link>
          <Link to="/play">
            <Button size="sm" variant="ghost" className="font-display">{t("common.play")}</Button>
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-10 sm:pt-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3 text-[var(--cyan)]" /> {t("landing.badge")}
        </span>
        <h1 className="mt-6 font-display text-5xl sm:text-7xl font-bold leading-[0.95]">
          {t("landing.title.bluff")} {t("landing.title.bid")}{" "}
          <span className="bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] bg-clip-text text-transparent">
            {t("landing.title.survive")}
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-base sm:text-lg text-muted-foreground">
          {t("landing.subtitle")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/play" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-14 px-8 font-display font-bold text-base bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white shadow-glow-violet hover:brightness-110">
              {t("landing.cta.start")}
            </Button>
          </Link>
          <Link to="/play" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 font-display font-bold text-base border-white/15 hover:bg-white/5">
              {t("landing.cta.join")}
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
        <Feature icon={<Users className="h-5 w-5" />} title={t("landing.feature.players.title")} desc={t("landing.feature.players.desc")} />
        <Feature icon={<Zap className="h-5 w-5" />} title={t("landing.feature.server.title")} desc={t("landing.feature.server.desc")} />
        <Feature icon={<Dices className="h-5 w-5" />} title={t("landing.feature.rules.title")} desc={t("landing.feature.rules.desc")} />
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
