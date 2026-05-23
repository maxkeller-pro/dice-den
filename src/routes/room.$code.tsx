import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Die } from "@/components/game/Die";
import { PlayerCard } from "@/components/game/PlayerCard";
import { BidControls } from "@/components/game/BidControls";
import { RevealModal } from "@/components/game/RevealModal";
import { useAuth } from "@/hooks/useAuth";
import { useGameState } from "@/hooks/useGameState";
import { joinGame, startGame, placeBid, callDudo, callCalza, nextRound } from "@/lib/game-api";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { ArrowLeft, Copy, Crown, Dices, Loader2, Trophy, Zap } from "lucide-react";

export const Route = createFileRoute("/room/$code")({
  component: Room,
  head: ({ params }) => ({
    meta: [
      { title: `Salle ${params.code} — Perudo` },
      { name: "description", content: "Live multiplayer dice room." },
    ],
  }),
});

function Room() {
  const { code } = Route.useParams();
  const { userId, loading } = useAuth();
  const { t } = useT();
  const { game, players, round, events, myDice, error } = useGameState(code);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  // Auto-join the room if I'm not already in it
  useEffect(() => {
    if (!userId || !game) return;
    if (game.status === "lobby" && !players.find((p) => p.user_id === userId)) {
      joinGame(code).catch((e) => toast.error(e.message));
    }
  }, [userId, game, players, code]);

  const me = players.find((p) => p.user_id === userId);
  const isHost = !!game && !!userId && game.host_id === userId;
  const myTurn = !!game && !!userId && game.current_turn_player_id === userId;
  const totalDice = useMemo(() => players.filter((p) => !p.is_eliminated).reduce((s, p) => s + p.dice_count, 0), [players]);
  const currentBidder = players.find((p) => p.user_id === round?.last_bidder_id);
  const turnPlayer = players.find((p) => p.user_id === game?.current_turn_player_id);

  async function withBusy<T>(fn: () => Promise<T>) {
    setBusy(true);
    try { await fn(); } catch (e: any) { toast.error(e.message ?? t("common.action_failed")); }
    finally { setBusy(false); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); toast.success(t("common.code_copied")); }
    catch { toast.error(t("common.copy_failed")); }
  }

  if (loading) {
    return <main className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }

  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <div className="text-center">
          <h1 className="font-display text-2xl">{t("room.notfound.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("room.notfound.desc")}</p>
          <Link to="/play"><Button className="mt-4">{t("room.notfound.back")}</Button></Link>
        </div>
      </main>
    );
  }

  if (!game) {
    return <main className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }

  // ============ LOBBY (waiting room) ============
  if (game.status === "lobby") {
    return (
      <main className="relative min-h-dvh">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative z-10 mx-auto max-w-xl px-5 py-6">
          <Link to="/play" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("common.leave")}
          </Link>

          <div className="mt-6 glass rounded-3xl p-6 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("room.code.label")}</div>
            <button onClick={copyCode} className="group mt-2 inline-flex items-center gap-3 rounded-xl px-3 py-1 hover:bg-white/5 transition">
              <span className="font-display text-5xl font-bold tracking-[0.3em] text-glow-violet">{code}</span>
              <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </button>
            <p className="mt-2 text-xs text-muted-foreground">{t("room.code.share", { n: game.max_players - 1 })}</p>
          </div>

          <div className="mt-6">
            <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-2">
              {t("room.players")} ({players.length}/{game.max_players})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((p) => (
                <div key={p.id} className="glass rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400 shrink-0" />
                    <span className="font-display text-sm truncate">{p.username ?? `P${p.seat + 1}`}</span>
                    {p.user_id === userId && <span className="text-[10px] text-[var(--cyan)]">{t("common.you")}</span>}
                    {p.user_id === game.host_id && <Crown className="h-3.5 w-3.5 text-[var(--violet)]" />}
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-xs text-muted-foreground">
                  {t("room.waiting")}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <Button
              size="lg"
              disabled={busy || players.length < 2}
              onClick={() => withBusy(() => startGame(game.id))}
              className="mt-6 w-full h-14 font-display font-bold text-base bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-white shadow-glow-violet"
            >
              <Zap className="h-4 w-4 mr-2" />
              {players.length < 2 ? t("room.start.need") : t("room.start.cta")}
            </Button>
          ) : (
            <div className="mt-6 text-center text-sm text-muted-foreground">{t("room.start.wait_host")}</div>
          )}
        </div>
      </main>
    );
  }

  // ============ ENDED ============
  if (game.status === "ended") {
    const winner = players.find((p) => p.user_id === game.winner_id);
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <div className="glass rounded-3xl p-8 text-center max-w-md w-full">
          <Trophy className="mx-auto h-12 w-12 text-[var(--cyan)]" />
          <h1 className="mt-3 font-display text-3xl font-bold">
            <span className="bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] bg-clip-text text-transparent">
              {winner?.username ?? t("auth.player")}
            </span>{" "}
            {t("room.winner.suffix")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("room.winner.desc")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link to="/play"><Button className="w-full h-12 font-display font-bold bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white">{t("room.cta.new")}</Button></Link>
            <Link to="/"><Button variant="outline" className="w-full">{t("common.home")}</Button></Link>
          </div>
        </div>
      </main>
    );
  }

  // ============ PLAYING ============
  const showReveal = round?.status === "revealed";
  const canChallenge = !!round?.last_bidder_id && round.last_bidder_id !== userId;

  return (
    <main className="relative min-h-dvh pb-[280px]">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />

      {/* Top bar */}
      <header className="relative z-10 px-3 sm:px-5 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Link to="/play" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("common.leave")}
          </Link>
          <button onClick={copyCode} className="font-mono text-xs tracking-[0.3em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <Dices className="h-3 w-3" /> {code}
          </button>
          <div className="text-xs text-muted-foreground">
            {t("room.round")} <span className="text-foreground font-mono">{round?.round_number ?? "—"}</span>
            {round?.is_palifico && <span className="ml-2 rounded-full bg-[var(--violet)]/20 text-[var(--violet)] px-2 py-0.5 text-[10px] font-bold tracking-widest">PALIFICO</span>}
          </div>
        </div>
      </header>

      {/* Players strip */}
      <section className="relative z-10 mt-4 px-3 sm:px-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isCurrent={p.user_id === game.current_turn_player_id && game.status === "playing"}
              isMe={p.user_id === userId}
              isHost={p.user_id === game.host_id}
            />
          ))}
        </div>
      </section>

      {/* Center: bid stage */}
      <section className="relative z-10 mt-6 px-5">
        <div className="glass mx-auto max-w-md rounded-3xl p-6 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("room.bid.current")}</div>
          {round?.last_bid_quantity ? (
            <div className="mt-2">
              <div className="flex items-center justify-center gap-3">
                <span className="font-display text-5xl font-bold text-glow-violet">{round.last_bid_quantity}</span>
                <span className="text-xl text-muted-foreground">×</span>
                <Die value={round.last_bid_face!} size="lg" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("room.bid.by")} <b className="text-foreground">{currentBidder?.username ?? "—"}</b>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("room.bid.opening", { name: turnPlayer?.username ?? "…" })}</p>
          )}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs text-muted-foreground">
            <span className="font-mono">{totalDice}</span> {t("room.dice_in_play")}
          </div>
        </div>
      </section>

      {/* Event feed */}
      <section className="relative z-10 mt-4 px-3 sm:px-5 max-w-md mx-auto">
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {events.slice(0, 6).map((ev) => (
            <EventLine key={ev.id} ev={ev} players={players} t={t} />
          ))}
        </div>
      </section>

      {/* Bottom: my dice + actions */}
      <section className="fixed inset-x-0 bottom-0 z-20 px-3 pb-3 pt-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
        <div className="mx-auto max-w-md space-y-3">
          <div className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("room.your_dice")}</span>
              {myTurn && <span className="text-[10px] uppercase tracking-widest text-[var(--cyan)] text-glow-cyan">{t("room.your_turn")}</span>}
            </div>
            <div className="flex justify-center gap-1.5 flex-wrap min-h-[3rem]">
              {myDice.length > 0 ? myDice.map((d, i) => (
                <Die key={i} value={d} size="md" rolling={!!round && round.status === "bidding" && i === 0 ? false : false} />
              )) : me?.is_eliminated ? (
                <span className="text-sm text-muted-foreground italic">{t("room.eliminated")}</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">{t("room.waiting_dots")}</span>
              )}
            </div>
          </div>

          {myTurn && round?.status === "bidding" && (
            <BidControls
              totalDice={totalDice}
              lastQty={round.last_bid_quantity}
              lastFace={round.last_bid_face}
              isPalifico={round.is_palifico}
              canChallenge={canChallenge}
              busy={busy}
              onBid={(q, f) => withBusy(() => placeBid(game.id, q, f))}
              onDudo={() => withBusy(() => callDudo(game.id))}
              onCalza={() => withBusy(() => callCalza(game.id))}
            />
          )}

          {!myTurn && round?.status === "bidding" && (
            <div className="glass rounded-2xl p-4 text-center text-sm text-muted-foreground">
              {t("room.waiting_for", { name: turnPlayer?.username ?? t("room.next_player") })}
            </div>
          )}
        </div>
      </section>

      {showReveal && round && (
        <RevealModal
          round={round}
          players={players}
          isPalifico={round.is_palifico}
          busy={busy}
          onNext={() => withBusy(() => nextRound(game.id))}
        />
      )}
    </main>
  );
}

function EventLine({ ev, players, t }: { ev: any; players: any[]; t: (key: any, vars?: any) => string }) {
  const name = (id?: string) => players.find((p) => p.user_id === id)?.username ?? "Player";
  let text = "";
  switch (ev.type) {
    case "bid": text = t("event.bid", { name: name(ev.data.player), qty: ev.data.qty, face: ev.data.face }); break;
    case "round_started":
      text = ev.data.palifico
        ? t("event.round_started_palifico", { n: ev.data.round })
        : t("event.round_started", { n: ev.data.round });
      break;
    case "round_revealed": text = t("event.round_revealed", { name: name(ev.data.caller), call: String(ev.data.call_type).toUpperCase(), actual: ev.data.actual }); break;
    case "player_joined": text = t("event.player_joined", { name: name(ev.data.user_id) }); break;
    case "game_ended": text = t("event.game_ended", { name: name(ev.data.winner) }); break;
    default: text = ev.type;
  }
  return (
    <div className="text-[11px] text-muted-foreground animate-float-in">
      <span className="opacity-50">›</span> {text}
    </div>
  );
}
