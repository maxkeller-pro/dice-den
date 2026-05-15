import { Die } from "./Die";
import { Button } from "@/components/ui/button";
import type { Player, Round } from "@/hooks/useGameState";
import { useT } from "@/lib/i18n";
import { Skull, Target, Trophy } from "lucide-react";

type Props = {
  round: Round;
  players: Player[];
  isPalifico: boolean;
  onNext: () => void;
  busy?: boolean;
};

export function RevealModal({ round, players, onNext, busy }: Props) {
  const { t } = useT();
  const nameOf = (id?: string | null) => players.find((p) => p.user_id === id)?.username ?? "Player";
  const snap = round.dice_snapshot ?? [];
  const targetFace = round.last_bid_face!;
  const wildOk = !round.is_palifico;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-float-in">
      <div className="glass w-full max-w-lg rounded-3xl p-6 shadow-elevated">
        <div className="mb-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {round.call_type === "dudo" ? t("reveal.dudo_called") : t("reveal.calza_called")} {nameOf(round.caller_id)}
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold">
            {round.call_type === "dudo"
              ? <span className="text-[var(--violet)] text-glow-violet"><Skull className="inline h-7 w-7 mr-2" />DUDO</span>
              : <span className="text-[var(--cyan)] text-glow-cyan"><Target className="inline h-7 w-7 mr-2" />CALZA</span>}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("reveal.bid_was")} <b className="text-foreground">{round.last_bid_quantity} × {targetFace}</b>
            {" — "}{t("reveal.actual")} <b className="text-foreground">{round.actual_count}</b>
          </p>
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {snap.map((row) => (
            <div key={row.user_id} className="flex items-center justify-between gap-2 rounded-xl bg-black/30 p-2">
              <span className="text-sm font-medium truncate flex-shrink-0 w-24">{nameOf(row.user_id)}</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {row.dice.map((d, i) => (
                  <Die key={i} value={d} size="sm"
                    highlight={d === targetFace || (wildOk && d === 1)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          {round.loser_id ? (
            <p className="text-sm">
              <b>{nameOf(round.loser_id)}</b> {t("reveal.loses_die")}
            </p>
          ) : (
            <p className="text-sm text-[var(--cyan)]">
              <Trophy className="inline h-4 w-4 mr-1" />
              <b>{nameOf(round.caller_id)}</b> {t("reveal.wins_die")}
            </p>
          )}
        </div>

        <Button
          onClick={onNext}
          disabled={busy}
          size="lg"
          className="mt-5 w-full h-12 font-display font-bold bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-white"
        >
          {t("reveal.next")}
        </Button>
      </div>
    </div>
  );
}
