import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import {
  YAMS_CATEGORIES, YAMS_UPPER, YamsCategory,
  yamsRoll, yamsScore, yamsSetHeld, yamsStart, yamsJoin, previewScore,
} from "@/lib/yams-api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Dices, Crown, Copy, Check, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/yams/$code")({
  component: YamsRoom,
});

type Game = {
  id: string;
  code: string;
  host_id: string;
  status: "lobby" | "playing" | "ended";
  current_player_id: string | null;
  current_dice: number[];
  held: boolean[];
  rolls_used: number;
  winner_id: string | null;
  max_players: number;
};
type Player = {
  id: string;
  user_id: string;
  seat: number;
  scorecard: Record<string, number>;
  total: number;
};
type Profile = { user_id: string; username: string };

function YamsRoom() {
  const { code } = Route.useParams();
  const { userId, loading: authLoading } = useAuth();
  const { lang } = useT();
  const nav = useNavigate();

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localHeld, setLocalHeld] = useState<boolean[]>([false, false, false, false, false]);

  // Auto-join + initial fetch
  useEffect(() => {
    if (authLoading || !userId) return;
    (async () => {
      try {
        await yamsJoin(code);
      } catch {
        // ignore (already joined / room full message handled by toast on click)
      }
      const { data: g } = await supabase.from("yams_games").select("*").eq("code", code.toUpperCase()).maybeSingle();
      if (!g) { setLoading(false); return; }
      setGame(g as Game);
      const { data: ps } = await supabase.from("yams_players").select("*").eq("game_id", g.id).order("seat");
      setPlayers((ps ?? []) as Player[]);
      const ids = (ps ?? []).map((p: any) => p.user_id);
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id,username").in("user_id", ids);
        const map: Record<string,string> = {};
        (profs ?? []).forEach((p: Profile) => { map[p.user_id] = p.username; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [authLoading, userId, code]);

  // Realtime
  useEffect(() => {
    if (!game?.id) return;
    const channel = supabase
      .channel(`yams:${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "yams_games", filter: `id=eq.${game.id}` },
        (payload) => { if (payload.new) setGame(payload.new as Game); })
      .on("postgres_changes", { event: "*", schema: "public", table: "yams_players", filter: `game_id=eq.${game.id}` },
        async () => {
          const { data: ps } = await supabase.from("yams_players").select("*").eq("game_id", game.id).order("seat");
          setPlayers((ps ?? []) as Player[]);
          const ids = (ps ?? []).map((p: any) => p.user_id);
          const missing = ids.filter((i) => !profiles[i]);
          if (missing.length) {
            const { data: profs } = await supabase.from("profiles").select("user_id,username").in("user_id", missing);
            setProfiles((cur) => {
              const next = { ...cur };
              (profs ?? []).forEach((p: Profile) => { next[p.user_id] = p.username; });
              return next;
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [game?.id]);

  // Sync held with server when round resets
  useEffect(() => {
    if (game?.rolls_used === 0) setLocalHeld([false, false, false, false, false]);
    else if (game?.held) setLocalHeld(game.held);
  }, [game?.rolls_used, game?.id]);

  const me = players.find((p) => p.user_id === userId);
  const isMyTurn = !!game && game.current_player_id === userId;
  const isHost = !!game && game.host_id === userId;
  const currentName = useMemo(() => {
    if (!game?.current_player_id) return "—";
    return profiles[game.current_player_id] ?? game.current_player_id.slice(0,6);
  }, [game?.current_player_id, profiles]);

  async function toggleHold(i: number) {
    if (!game || !isMyTurn || game.rolls_used === 0 || game.rolls_used >= 3) return;
    const next = [...localHeld];
    next[i] = !next[i];
    setLocalHeld(next);
    try { await yamsSetHeld(game.id, next); } catch (e: any) { toast.error(e.message); }
  }

  async function onRoll() {
    if (!game) return;
    setBusy(true);
    try { await yamsRoll(game.id, localHeld); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function onScore(cat: YamsCategory) {
    if (!game) return;
    setBusy(true);
    try { await yamsScore(game.id, cat); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function onStart() {
    if (!game) return;
    setBusy(true);
    try { await yamsStart(game.id); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  function copyCode() {
    navigator.clipboard.writeText(code.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (authLoading || loading) {
    return <main className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }
  if (!game) {
    return (
      <main className="grid min-h-dvh place-items-center px-5 text-center">
        <div>
          <p className="text-muted-foreground">{lang === "fr" ? "Partie introuvable." : "Game not found."}</p>
          <Link to="/yams" className="mt-4 inline-block text-[var(--cyan)] hover:underline">{lang === "fr" ? "Retour" : "Back"}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 mx-auto max-w-5xl px-5 py-6">
        <header className="flex items-center justify-between">
          <Link to="/yams" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {lang === "fr" ? "Quitter" : "Leave"}
          </Link>
          <button onClick={copyCode} className="inline-flex items-center gap-2 glass rounded-lg px-3 py-1.5 font-mono text-sm tracking-[0.3em]">
            {code.toUpperCase()}
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        </header>

        {/* LOBBY */}
        {game.status === "lobby" && (
          <section className="mt-8 max-w-md mx-auto text-center">
            <Dices className="h-10 w-10 mx-auto text-amber-400" />
            <h1 className="mt-3 font-display text-3xl font-bold">{lang === "fr" ? "Salon Yams" : "Yams lobby"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {lang === "fr" ? "Partage le code et attends les joueurs." : "Share the code and wait for players."}
            </p>
            <div className="mt-6 glass rounded-2xl p-5 space-y-2 text-left">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {lang === "fr" ? "Joueurs" : "Players"} ({players.length}/{game.max_players})
              </p>
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <span className="font-display">{profiles[p.user_id] ?? p.user_id.slice(0,6)}</span>
                  {p.user_id === game.host_id && <span className="text-[10px] uppercase tracking-widest text-amber-400">Host</span>}
                </div>
              ))}
            </div>
            {isHost ? (
              <Button onClick={onStart} disabled={busy || players.length < 2} className="mt-5 w-full h-12 font-display font-bold bg-gradient-to-br from-amber-500 to-rose-400">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-2" />{lang === "fr" ? "Démarrer" : "Start"}</>}
              </Button>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                {lang === "fr" ? "En attente que l'hôte démarre…" : "Waiting for host to start…"}
              </p>
            )}
          </section>
        )}

        {/* PLAYING */}
        {game.status === "playing" && (
          <section className="mt-6 flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[1fr_minmax(0,420px)]">
            {/* LEFT (desktop) / BOTTOM (mobile): Scorecard */}
            <Scorecard
              players={players} profiles={profiles} game={game}
              localDice={game.current_dice}
              isMyTurn={isMyTurn} canScore={isMyTurn && game.rolls_used > 0 && !busy}
              onScore={onScore}
              lang={lang}
            />

            {/* RIGHT (desktop) / TOP (mobile): Dice + actions */}
            <div className="space-y-4">
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {lang === "fr" ? "Au tour de" : "Turn"}
                  </p>
                  <p className={`font-display font-bold ${isMyTurn ? "text-amber-400" : ""}`}>
                    {isMyTurn ? (lang === "fr" ? "À toi !" : "Your turn!") : currentName}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {game.current_dice.map((v, i) => (
                    <DieView
                      key={i}
                      value={v}
                      held={localHeld[i]}
                      disabled={!isMyTurn || game.rolls_used === 0 || game.rolls_used >= 3 || v === 0}
                      onClick={() => toggleHold(i)}
                    />
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {lang === "fr" ? "Lancers" : "Rolls"}: <span className="font-mono text-foreground">{game.rolls_used}/3</span>
                  </p>
                  <Button
                    onClick={onRoll}
                    disabled={!isMyTurn || busy || game.rolls_used >= 3}
                    className="font-display font-bold bg-gradient-to-br from-amber-500 to-rose-400"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      game.rolls_used === 0
                        ? (lang === "fr" ? "Lancer les dés" : "Roll dice")
                        : (lang === "fr" ? "Relancer" : "Re-roll")
                    )}
                  </Button>
                </div>
                {isMyTurn && game.rolls_used > 0 && game.rolls_used < 3 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {lang === "fr" ? "Clique sur un dé pour le garder, puis relance ou choisis une catégorie." : "Click a die to keep it, then re-roll or pick a category."}
                  </p>
                )}
                {isMyTurn && game.rolls_used >= 3 && (
                  <p className="mt-2 text-[11px] text-amber-400">
                    {lang === "fr" ? "Plus de lancers — choisis une catégorie." : "No rolls left — pick a category."}
                  </p>
                )}
              </div>

              <PlayersTotals players={players} profiles={profiles} game={game} lang={lang} />
            </div>
          </section>
        )}

        {/* ENDED */}
        {game.status === "ended" && (
          <section className="mt-10 max-w-lg mx-auto text-center">
            <Crown className="h-12 w-12 mx-auto text-amber-400" />
            <h1 className="mt-4 font-display text-3xl font-bold">
              {lang === "fr" ? "Partie terminée" : "Game over"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {lang === "fr" ? "Vainqueur" : "Winner"}: <span className="text-amber-400 font-display font-bold">
                {profiles[game.winner_id ?? ""] ?? "—"}
              </span>
            </p>
            <div className="mt-6 glass rounded-2xl p-4 text-left space-y-2">
              {[...players].sort((a,b)=>b.total-a.total).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="font-display">
                    <span className="text-muted-foreground mr-2">{i+1}.</span>
                    {profiles[p.user_id] ?? p.user_id.slice(0,6)}
                  </span>
                  <span className="font-mono font-bold">{p.total}</span>
                </div>
              ))}
            </div>
            <Button onClick={() => nav({ to: "/yams" })} className="mt-6 font-display font-bold bg-gradient-to-br from-amber-500 to-rose-400">
              {lang === "fr" ? "Nouvelle partie" : "New game"}
            </Button>
          </section>
        )}
      </div>
    </main>
  );
}

// ===== Sub-components =====

function DieView({ value, held, disabled, onClick }: { value: number; held: boolean; disabled: boolean; onClick: () => void }) {
  const empty = value === 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative aspect-square rounded-xl border-2 transition-all ${
        empty ? "border-white/10 bg-black/30"
        : held ? "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_-5px_rgba(251,191,36,0.6)]"
        : "border-white/15 bg-white/5"
      } ${disabled ? "opacity-60" : "hover:scale-105 cursor-pointer"} flex items-center justify-center`}
    >
      {empty ? (
        <span className="text-muted-foreground text-2xl">·</span>
      ) : (
        <DiePips value={value} />
      )}
      {held && <span className="absolute top-1 right-1 text-[8px] uppercase tracking-widest text-amber-400 font-bold">Hold</span>}
    </button>
  );
}

function DiePips({ value }: { value: number }) {
  // 3x3 grid pip positions
  const map: Record<number, [number, number][]> = {
    1: [[1,1]],
    2: [[0,0],[2,2]],
    3: [[0,0],[1,1],[2,2]],
    4: [[0,0],[0,2],[2,0],[2,2]],
    5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
    6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
  };
  const pips = map[value] ?? [];
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-3/4 h-3/4">
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i/3), c = i%3;
        const on = pips.some(([pr,pc]) => pr===r && pc===c);
        return <span key={i} className={`rounded-full ${on ? "bg-foreground" : ""}`} />;
      })}
    </div>
  );
}

function PlayersTotals({ players, profiles, game, lang }: { players: Player[]; profiles: Record<string,string>; game: Game; lang: "fr"|"en" }) {
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{lang === "fr" ? "Scores" : "Scores"}</p>
      <div className="space-y-1.5">
        {players.map((p) => {
          const isCurrent = p.user_id === game.current_player_id;
          return (
            <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${isCurrent ? "bg-amber-400/10 border border-amber-400/30" : "bg-black/20"}`}>
              <span className={`font-display ${isCurrent ? "text-amber-400" : ""}`}>
                {profiles[p.user_id] ?? p.user_id.slice(0,6)}
              </span>
              <span className="font-mono">{p.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CAT_LABEL: Record<YamsCategory, { fr: string; en: string }> = {
  ones: { fr: "1", en: "1s" },
  twos: { fr: "2", en: "2s" },
  threes: { fr: "3", en: "3s" },
  fours: { fr: "4", en: "4s" },
  fives: { fr: "5", en: "5s" },
  sixes: { fr: "6", en: "6s" },
  three_kind: { fr: "Brelan", en: "3 of a kind" },
  four_kind: { fr: "Carré", en: "4 of a kind" },
  full_house: { fr: "Full (25)", en: "Full house (25)" },
  small_straight: { fr: "Petite suite (30)", en: "Small straight (30)" },
  large_straight: { fr: "Grande suite (40)", en: "Large straight (40)" },
  yahtzee: { fr: "Yams (50)", en: "Yahtzee (50)" },
  chance: { fr: "Chance", en: "Chance" },
};

function Scorecard({
  players, profiles, game, localDice, isMyTurn, canScore, onScore, lang,
}: {
  players: Player[]; profiles: Record<string,string>; game: Game;
  localDice: number[]; isMyTurn: boolean; canScore: boolean;
  onScore: (cat: YamsCategory) => void; lang: "fr"|"en";
}) {
  const upperSums = players.map((p) => YAMS_UPPER.reduce((s,c) => s + (p.scorecard[c] ?? 0), 0));
  const lowerCats: YamsCategory[] = ["three_kind","four_kind","full_house","small_straight","large_straight","yahtzee","chance"];
  const diceReady = localDice.some((d) => d > 0);

  function Row({ cat }: { cat: YamsCategory }) {
    const preview = diceReady ? previewScore(localDice, cat) : null;
    return (
      <tr className="border-t border-white/5">
        <td className="py-1.5 px-2 text-sm">{CAT_LABEL[cat][lang]}</td>
        {players.map((p) => {
          const filled = p.scorecard[cat] !== undefined;
          const isMe = p.user_id === game.current_player_id;
          const clickable = isMe && isMyTurn && canScore && !filled;
          return (
            <td key={p.id} className="py-1 px-1 text-center">
              {filled ? (
                <span className="inline-block min-w-8 rounded bg-black/30 px-2 py-0.5 font-mono text-sm">{p.scorecard[cat]}</span>
              ) : clickable ? (
                <button
                  onClick={() => onScore(cat)}
                  className="inline-block min-w-8 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-sm text-amber-300 hover:bg-amber-400/20"
                >
                  {preview ?? 0}
                </button>
              ) : (
                <span className="inline-block min-w-8 rounded border border-dashed border-white/10 px-2 py-0.5 font-mono text-sm text-muted-foreground/50">—</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div className="glass rounded-2xl p-2 sm:p-4 overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-left text-xs sm:text-sm min-w-[320px]">
        <thead>
          <tr>
            <th className="py-2 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">{lang === "fr" ? "Catégorie" : "Category"}</th>
            {players.map((p) => (
              <th key={p.id} className={`py-2 px-1 text-center text-[10px] uppercase tracking-widest ${p.user_id === game.current_player_id ? "text-amber-400" : "text-muted-foreground"}`}>
                {(profiles[p.user_id] ?? p.user_id.slice(0,4)).slice(0,8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={1+players.length} className="pt-2 pb-1 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">{lang === "fr" ? "Section haute" : "Upper"}</td></tr>
          {YAMS_UPPER.map((c) => <Row key={c} cat={c} />)}
          <tr className="border-t border-white/10 bg-black/20">
            <td className="py-1.5 px-2 text-xs text-muted-foreground">{lang === "fr" ? "Sous-total / Bonus 35 si ≥63" : "Subtotal / Bonus 35 if ≥63"}</td>
            {players.map((p, i) => {
              const u = upperSums[i];
              const bonus = u >= 63 ? 35 : 0;
              return (
                <td key={p.id} className="py-1 px-1 text-center font-mono text-xs">
                  <span>{u}</span>
                  <span className={`ml-1 ${bonus ? "text-amber-400" : "text-muted-foreground"}`}>+{bonus}</span>
                </td>
              );
            })}
          </tr>
          <tr><td colSpan={1+players.length} className="pt-2 pb-1 px-2 text-[10px] uppercase tracking-widest text-muted-foreground">{lang === "fr" ? "Section basse" : "Lower"}</td></tr>
          {lowerCats.map((c) => <Row key={c} cat={c} />)}
          <tr className="border-t-2 border-white/20 bg-amber-400/5">
            <td className="py-2 px-2 font-display font-bold">{lang === "fr" ? "Total" : "Total"}</td>
            {players.map((p) => (
              <td key={p.id} className="py-2 px-1 text-center font-mono font-bold">{p.total}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
