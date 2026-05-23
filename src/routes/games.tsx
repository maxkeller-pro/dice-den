import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useT, LangSwitcher } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Dices, Trophy, User, Lock, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/games")({
  component: GamesHub,
  head: () => ({
    meta: [
      { title: "Choisir un jeu — Perudo" },
      { name: "description", content: "Sélectionne un jeu à jouer." },
    ],
  }),
});

type Game = {
  id: string;
  title: string;
  desc: { fr: string; en: string };
  to?: "/play" | "/yams";
  available: boolean;
  badge?: { fr: string; en: string };
  accent: string;
};

const GAMES: Game[] = [
  {
    id: "perudo",
    title: "Perudo",
    desc: {
      fr: "Le jeu de bluff aux dés. Mise, bluffe, démasque tes adversaires.",
      en: "The classic bluffing dice game. Bid, bluff, call out your rivals.",
    },
    to: "/play",
    available: true,
    accent: "from-[var(--violet)] to-[var(--cyan)]",
  },
  {
    id: "poker",
    title: "Poker",
    desc: { fr: "Texas Hold'em entre amis.", en: "Texas Hold'em with friends." },
    available: false,
    badge: { fr: "Bientôt", en: "Soon" },
    accent: "from-emerald-500 to-teal-400",
  },
  {
    id: "yams",
    title: "Yams",
    desc: { fr: "Le grand classique des combinaisons de dés.", en: "The classic dice combo game." },
    to: "/yams",
    available: true,
    accent: "from-amber-500 to-rose-400",
  },
  {
    id: "more",
    title: "…",
    desc: { fr: "D'autres jeux arrivent bientôt.", en: "More games coming soon." },
    available: false,
    badge: { fr: "À venir", en: "Coming" },
    accent: "from-slate-500 to-slate-400",
  },
];

function GamesHub() {
  const { lang, t } = useT();
  const { isGuest, username, stats } = useAuth();

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />

      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <Dices className="h-5 w-5 text-[var(--violet)]" />
          <span>PERU<span className="text-[var(--cyan)]">.</span>DO</span>
        </Link>
        <nav className="flex items-center gap-1">
          <LangSwitcher className="mr-1" />
          <Link to="/leaderboard">
            <Button size="sm" variant="ghost" className="font-display gap-1.5">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.ranking")}</span>
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="sm" variant="ghost" className="font-display gap-1.5">
              <User className="h-4 w-4" />
              {isGuest ? (
                <span className="hidden sm:inline">{t("common.signin")}</span>
              ) : (
                <span className="hidden sm:inline">
                  {username || t("common.account")}
                  {stats ? ` · ${stats.elo}` : ""}
                </span>
              )}
            </Button>
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pt-6 sm:pt-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[var(--cyan)]" />
            {lang === "fr" ? "Salle de jeux" : "Game hub"}
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
            {lang === "fr" ? "Choisis ton jeu" : "Pick your game"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {lang === "fr"
              ? "Sélectionne un jeu pour rejoindre une partie ou en créer une. D'autres jeux arrivent."
              : "Pick a game to join or create a room. More games are on the way."}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-16">
          {GAMES.map((g) => {
            const card = (
              <div
                className={`group relative h-full glass rounded-2xl p-5 transition ${
                  g.available ? "hover:bg-white/5 cursor-pointer" : "opacity-60"
                }`}
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${g.accent} text-white shadow-lg`}
                >
                  {g.available ? <Dices className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </div>
                {g.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {g.badge[lang]}
                  </span>
                )}
                <h3 className="mt-4 font-display text-xl font-bold">{g.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.desc[lang]}</p>
                <div className="mt-5">
                  {g.available ? (
                    <Button
                      size="sm"
                      className="font-display bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white hover:brightness-110"
                    >
                      {lang === "fr" ? "Jouer" : "Play"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="font-display border-white/15">
                      {lang === "fr" ? "Bientôt disponible" : "Coming soon"}
                    </Button>
                  )}
                </div>
              </div>
            );
            return g.available && g.to ? (
              <Link key={g.id} to={g.to} className="block">
                {card}
              </Link>
            ) : (
              <div key={g.id}>{card}</div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
