import { cn } from "@/lib/utils";
import parrotImg from "@/assets/parrot.png";

const DOTS: Record<number, [number, number][]> = {
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]],
};

type Props = {
  value?: number;
  size?: "sm" | "md" | "lg";
  hidden?: boolean;
  highlight?: boolean;
  rolling?: boolean;
  className?: string;
};

export function Die({ value, size = "md", hidden, highlight, rolling, className }: Props) {
  const dim = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl select-none",
        "bg-gradient-to-br from-white/95 to-white/70 text-[oklch(0.10_0.03_290)]",
        "shadow-[inset_0_-3px_8px_rgba(0,0,0,0.2),0_4px_14px_rgba(0,0,0,0.45)]",
        highlight && "ring-2 ring-[var(--cyan)] shadow-glow-cyan",
        rolling && "animate-roll",
        hidden && "from-violet-900/60 to-violet-950/80 text-violet-300",
        dim,
        className,
      )}
      style={{ perspective: 600 }}
    >
      {hidden ? (
        <span className="font-display text-xl font-bold opacity-70">?</span>
      ) : value === 1 ? (
        <img
          src={parrotImg}
          alt="Parrot (wild)"
          loading="lazy"
          width={512}
          height={512}
          className="h-[80%] w-[80%] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
        />
      ) : value ? (
        <div className="grid h-[70%] w-[70%] grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => {
            const r = Math.floor(i / 3) + 1;
            const c = (i % 3) + 1;
            const on = (DOTS[value] ?? []).some(([dr, dc]) => dr === r && dc === c);
            return (
              <div key={i} className="flex items-center justify-center">
                {on && <span className="block h-1.5 w-1.5 rounded-full bg-current md:h-2 md:w-2" />}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
