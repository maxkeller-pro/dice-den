import { cn } from "@/lib/utils";
import { Die } from "./Die";
import type { Player } from "@/hooks/useGameState";

type Props = {
  player: Player;
  isCurrent?: boolean;
  isMe?: boolean;
  isHost?: boolean;
};

export function PlayerCard({ player, isCurrent, isMe, isHost }: Props) {
  return (
    <div
      className={cn(
        "glass relative rounded-2xl px-3 py-2.5 transition-all",
        isCurrent && "ring-glow-violet animate-pulse-glow",
        player.is_eliminated && "opacity-40 grayscale",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              player.is_connected ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" : "bg-zinc-500",
            )}
          />
          <span className="truncate font-display text-sm font-semibold">
            {player.username ?? `P${player.seat + 1}`}
            {isMe && <span className="ml-1 text-[10px] text-[var(--cyan)]">you</span>}
            {isHost && <span className="ml-1 text-[10px] text-[var(--violet)]">host</span>}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {player.dice_count}<span className="opacity-50">d</span>
        </span>
      </div>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: player.dice_count }).map((_, i) => (
          <Die key={i} hidden size="sm" className="!h-6 !w-6 !rounded-md" />
        ))}
      </div>
    </div>
  );
}
