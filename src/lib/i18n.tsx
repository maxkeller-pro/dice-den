import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

const DICT = {
  fr: {
    // Common
    "common.home": "Accueil",
    "common.back": "Retour",
    "common.leave": "Quitter",
    "common.account": "Compte",
    "common.signin": "Se connecter",
    "common.ranking": "Classement",
    "common.play": "Jouer",
    "common.you": "vous",
    "common.copy_failed": "Copie impossible",
    "common.code_copied": "Code copié",
    "common.action_failed": "Action échouée",

    // Landing
    "landing.badge": "Multijoueur en temps réel",
    "landing.title.bluff": "Bluffe.",
    "landing.title.bid": "Mise.",
    "landing.title.survive": "Survis.",
    "landing.subtitle": "Une version moderne du jeu de dés de bluff classique. Crée une salle privée, partage le code et déjoue tes amis — depuis ton navigateur.",
    "landing.cta.start": "Lancer une partie",
    "landing.cta.join": "Rejoindre avec un code",
    "landing.feature.players.title": "2 à 6 joueurs",
    "landing.feature.players.desc": "Salles privées avec codes partageables. Joue avec tes amis sur n'importe quel appareil.",
    "landing.feature.server.title": "Validé côté serveur",
    "landing.feature.server.desc": "Tirages et validation des mises gérés sur le serveur. Aucune triche possible.",
    "landing.feature.rules.title": "Règles complètes",
    "landing.feature.rules.desc": "Jokers, manches palifico, Dudo et Calza — exactement comme il se doit.",

    // Auth
    "auth.meta.title": "Compte — Perudo",
    "auth.save_progress": "Sauvegarder ta progression",
    "auth.your_account": "Ton compte",
    "auth.signed_in_as": "Connecté en tant que",
    "auth.player": "Joueur",
    "auth.stat.elo": "Elo",
    "auth.stat.wins": "Victoires",
    "auth.stat.loss": "Défaites",
    "auth.stat.games": "Parties",
    "auth.leaderboard": "Classement",
    "auth.signout": "Se déconnecter",
    "auth.guest_intro": "Tu joues en invité. Crée un compte pour conserver ton Elo, tes victoires et ton rang sur tous tes appareils.",
    "auth.signup": "Créer un compte",
    "auth.signin": "Se connecter",
    "auth.placeholder.name": "Nom affiché",
    "auth.placeholder.email": "vous@exemple.com",
    "auth.placeholder.password": "Mot de passe (6+ caractères)",
    "auth.cta.signup": "Créer le compte",
    "auth.cta.signin": "Se connecter",
    "auth.transfer_note": "Tes statistiques d'invité seront transférées vers ton nouveau compte.",
    "auth.transfer_note_with": "Tes statistiques d'invité (Elo {elo}, {wins}V / {losses}D) seront transférées vers ton nouveau compte.",
    "auth.error.required": "Email et mot de passe (6+ caractères) requis",
    "auth.toast.signup_guest": "Compte créé — tes statistiques sont sauvegardées !",
    "auth.toast.signup": "Compte créé !",
    "auth.toast.welcome": "Bienvenue !",
    "auth.toast.signed_out": "Déconnecté",
    "auth.toast.fail": "Échec de l'authentification",

    // Play / lobby
    "play.meta.title": "Jouer — Perudo",
    "play.title": "Entrer à la table",
    "play.guest_label": "Tu joues en tant que",
    "play.guest_value": "invité",
    "play.save_stats": "Sauvegarder mes stats →",
    "play.display_name": "Nom affiché",
    "play.placeholder.name": "Ton pseudo",
    "play.playing_as": "Tu joues en tant que {name}",
    "play.pick_name": "Choisis un nom",
    "play.create": "Créer",
    "play.create_desc": "Lance une salle privée et partage le code.",
    "play.create_cta": "Créer la salle",
    "play.join": "Rejoindre",
    "play.join_desc": "Saisis un code de 6 caractères.",
    "play.join_cta": "Rejoindre la salle",
    "play.error.no_code": "Saisis un code de salle",
    "play.error.create": "Impossible de créer la salle",
    "play.error.join": "Impossible de rejoindre",

    // Leaderboard
    "lb.title": "Classement",
    "lb.subtitle": "Top 100 des joueurs classés à l'Elo. Les invités ne sont pas classés — ",
    "lb.subtitle.link": "crée un compte",
    "lb.subtitle.end": " pour participer.",
    "lb.empty": "Aucun joueur classé pour l'instant. Sois le premier !",
    "lb.col.player": "Joueur",
    "lb.col.elo": "Elo",
    "lb.col.wl": "V / D",
    "lb.col.games": "Parties",
    "lb.you": "TOI",

    // Room
    "room.code.label": "Code de la salle",
    "room.code.share": "Partage ce code avec jusqu'à {n} amis.",
    "room.players": "Joueurs",
    "room.waiting": "En attente…",
    "room.start.cta": "Lancer la partie",
    "room.start.need": "Il faut au moins 2 joueurs",
    "room.start.wait_host": "En attente du lancement par l'hôte…",
    "room.notfound.title": "Salle introuvable",
    "room.notfound.desc": "Vérifie le code et réessaye.",
    "room.notfound.back": "Retour au lobby",
    "room.winner.suffix": "remporte la partie",
    "room.winner.desc": "Dernier en lice à la table.",
    "room.cta.new": "Nouvelle partie",
    "room.round": "Manche",
    "room.bid.current": "Mise actuelle",
    "room.bid.by": "par",
    "room.bid.opening": "Mise d'ouverture — à {name} de jouer",
    "room.dice_in_play": "dés en jeu",
    "room.your_dice": "Tes dés",
    "room.your_turn": "À toi de jouer",
    "room.eliminated": "Éliminé — spectateur",
    "room.waiting_dots": "En attente…",
    "room.waiting_for": "En attente de {name}…",
    "room.next_player": "joueur suivant",

    // Bid controls
    "bid.qty": "Quantité",
    "bid.face": "Face",
    "bid.raise": "Miser :",
    "bid.dudo": "DUDO",
    "bid.calza": "CALZA",

    // Reveal
    "reveal.dudo_called": "Dudo annoncé par",
    "reveal.calza_called": "Calza annoncé par",
    "reveal.bid_was": "Mise :",
    "reveal.actual": "compte réel :",
    "reveal.loses_die": "perd un dé",
    "reveal.wins_die": "récupère un dé",
    "reveal.next": "Manche suivante",

    // Events
    "event.bid": "{name} mise {qty} × {face}",
    "event.round_started": "Manche {n} démarre",
    "event.round_started_palifico": "Manche {n} — PALIFICO démarre",
    "event.round_revealed": "{name} a annoncé {call} — réel {actual}",
    "event.player_joined": "{name} a rejoint",
    "event.game_ended": "{name} remporte la partie",

    // Language switcher
    "lang.label": "Langue",
  },
  en: {
    "common.home": "Home",
    "common.back": "Back",
    "common.leave": "Leave",
    "common.account": "Account",
    "common.signin": "Sign in",
    "common.ranking": "Ranking",
    "common.play": "Play",
    "common.you": "you",
    "common.copy_failed": "Copy failed",
    "common.code_copied": "Code copied",
    "common.action_failed": "Action failed",

    "landing.badge": "Real-time multiplayer",
    "landing.title.bluff": "Bluff.",
    "landing.title.bid": "Bid.",
    "landing.title.survive": "Survive.",
    "landing.subtitle": "A modern take on the classic bluffing dice game. Spin up a private room, share the code, and out-lie your friends — straight from your browser.",
    "landing.cta.start": "Start a game",
    "landing.cta.join": "Join with code",
    "landing.feature.players.title": "2–6 players",
    "landing.feature.players.desc": "Private rooms with shareable codes. Play with friends across any device.",
    "landing.feature.server.title": "Server-authoritative",
    "landing.feature.server.desc": "All dice rolls and bid validation happen server-side. No cheating possible.",
    "landing.feature.rules.title": "Full Perudo rules",
    "landing.feature.rules.desc": "Wildcards, palifico rounds, Dudo and Calza — exactly how it should play.",

    "auth.meta.title": "Account — Perudo",
    "auth.save_progress": "Save your progress",
    "auth.your_account": "Your account",
    "auth.signed_in_as": "Signed in as",
    "auth.player": "Player",
    "auth.stat.elo": "Elo",
    "auth.stat.wins": "Wins",
    "auth.stat.loss": "Loss",
    "auth.stat.games": "Games",
    "auth.leaderboard": "Leaderboard",
    "auth.signout": "Sign out",
    "auth.guest_intro": "You're playing as a guest. Create an account to keep your Elo, wins and ranking across devices.",
    "auth.signup": "Sign up",
    "auth.signin": "Sign in",
    "auth.placeholder.name": "Display name",
    "auth.placeholder.email": "you@example.com",
    "auth.placeholder.password": "Password (6+ chars)",
    "auth.cta.signup": "Create account",
    "auth.cta.signin": "Sign in",
    "auth.transfer_note": "Your guest stats will be transferred to your new account.",
    "auth.transfer_note_with": "Your guest stats (Elo {elo}, {wins}W / {losses}L) will be transferred to your new account.",
    "auth.error.required": "Email and 6+ char password required",
    "auth.toast.signup_guest": "Account created — your stats are saved!",
    "auth.toast.signup": "Account created!",
    "auth.toast.welcome": "Welcome back",
    "auth.toast.signed_out": "Signed out",
    "auth.toast.fail": "Auth failed",

    "play.meta.title": "Play — Perudo",
    "play.title": "Enter the table",
    "play.guest_label": "Playing as",
    "play.guest_value": "guest",
    "play.save_stats": "Save my stats →",
    "play.display_name": "Display name",
    "play.placeholder.name": "Your alias",
    "play.playing_as": "Playing as {name}",
    "play.pick_name": "Pick a name",
    "play.create": "Create",
    "play.create_desc": "Spin up a private room and share the code.",
    "play.create_cta": "Create room",
    "play.join": "Join",
    "play.join_desc": "Enter a 6-character code.",
    "play.join_cta": "Join room",
    "play.error.no_code": "Enter a room code",
    "play.error.create": "Could not create room",
    "play.error.join": "Could not join",

    "lb.title": "Leaderboard",
    "lb.subtitle": "Top 100 ranked players by Elo. Guests aren't ranked — ",
    "lb.subtitle.link": "create an account",
    "lb.subtitle.end": " to compete.",
    "lb.empty": "No ranked players yet. Be the first!",
    "lb.col.player": "Player",
    "lb.col.elo": "Elo",
    "lb.col.wl": "W / L",
    "lb.col.games": "Games",
    "lb.you": "YOU",

    "room.code.label": "Room code",
    "room.code.share": "Share this code with up to {n} friends.",
    "room.players": "Players",
    "room.waiting": "Waiting…",
    "room.start.cta": "Start game",
    "room.start.need": "Need at least 2 players",
    "room.start.wait_host": "Waiting for host to start…",
    "room.notfound.title": "Room not found",
    "room.notfound.desc": "Check the code and try again.",
    "room.notfound.back": "Back to lobby",
    "room.winner.suffix": "wins",
    "room.winner.desc": "Last one standing at the table.",
    "room.cta.new": "New game",
    "room.round": "Round",
    "room.bid.current": "Current bid",
    "room.bid.by": "by",
    "room.bid.opening": "Opening bid — {name} to start",
    "room.dice_in_play": "dice in play",
    "room.your_dice": "Your dice",
    "room.your_turn": "Your turn",
    "room.eliminated": "Eliminated — spectating",
    "room.waiting_dots": "Waiting…",
    "room.waiting_for": "Waiting for {name}…",
    "room.next_player": "next player",

    "bid.qty": "Quantity",
    "bid.face": "Face",
    "bid.raise": "Raise:",
    "bid.dudo": "DUDO",
    "bid.calza": "CALZA",

    "reveal.dudo_called": "Dudo called by",
    "reveal.calza_called": "Calza called by",
    "reveal.bid_was": "Bid was",
    "reveal.actual": "actual count:",
    "reveal.loses_die": "loses a die",
    "reveal.wins_die": "wins a die back",
    "reveal.next": "Next round",

    "event.bid": "{name} bids {qty} × {face}",
    "event.round_started": "Round {n} starts",
    "event.round_started_palifico": "Round {n} — PALIFICO starts",
    "event.round_revealed": "{name} called {call} — actual {actual}",
    "event.player_joined": "{name} joined",
    "event.game_ended": "{name} wins the table",

    "lang.label": "Language",
  },
} as const;

type Key = keyof (typeof DICT)["fr"];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

function format(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function detectInitial(): Lang {
  if (typeof window === "undefined") return "fr";
  const stored = window.localStorage.getItem("ld_lang") as Lang | null;
  if (stored === "fr" || stored === "en") return stored;
  return "fr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    setLangState(detectInitial());
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ld_lang", l);
      document.documentElement.lang = l;
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t: Ctx["t"] = (key, vars) => {
    const dict = DICT[lang] as Record<string, string>;
    const v = dict[key] ?? (DICT.en as Record<string, string>)[key] ?? key;
    return format(v, vars);
  };

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useT() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useT must be used within LanguageProvider");
  return ctx;
}

export function LangSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useT();
  return (
    <div className={`inline-flex rounded-lg glass p-0.5 text-[11px] font-display ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`px-2 py-1 rounded-md ${lang === "fr" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "fr"}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-2 py-1 rounded-md ${lang === "en" ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}