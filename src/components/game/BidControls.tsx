import { useEffect, useState } from "react";
import { Die } from "./Die";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Minus, Plus, Skull, Target } from "lucide-react";

type Props = {
  totalDice: number;
  lastQty: number | null;
  lastFace: number | null;
  isPalifico: boolean;
  canChallenge: boolean;
  onBid: (qty: number, face: number) => void;
  onDudo: () => void;
  onCalza: () => void;
  busy?: boolean;
};

export function BidControls({ totalDice, lastQty, lastFace, isPalifico, canChallenge, onBid, onDudo, onCalza, busy }: Props) {
  const [qty, setQty] = useState(1);
  const [face, setFace] = useState(2);

  useEffect(() => {
    if (lastQty == null || lastFace == null) {
      setQty(1); setFace(isPalifico ? 2 : 2);
    } else {
      setQty(lastQty + 1);
      setFace(isPalifico ? lastFace : lastFace);
    }
  }, [lastQty, lastFace, isPalifico]);

  const faces = isPalifico && lastFace != null ? [lastFace] : [1, 2, 3, 4, 5, 6];

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Quantity</div>
          <div className="flex items-center justify-between rounded-xl bg-black/30 p-2">
            <Button size="icon" variant="ghost" className="h-9 w-9" disabled={busy} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-display text-3xl font-bold text-glow-violet">{qty}</span>
            <Button size="icon" variant="ghost" className="h-9 w-9" disabled={busy} onClick={() => setQty((q) => Math.min(totalDice, q + 1))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Face</div>
          <div className="flex items-center justify-between rounded-xl bg-black/30 p-2">
            <Button size="icon" variant="ghost" className="h-9 w-9" disabled={busy || isPalifico}
              onClick={() => setFace((f) => Math.max(1, f - 1))}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Die value={face} size="md" highlight />
            <Button size="icon" variant="ghost" className="h-9 w-9" disabled={busy || isPalifico}
              onClick={() => setFace((f) => Math.min(6, f + 1))}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {faces.map((f) => (
          <button key={f} disabled={busy} onClick={() => setFace(f)}
            className={cn(
              "rounded-lg p-1 transition",
              f === face ? "bg-[var(--violet)]/30 ring-1 ring-[var(--violet)]" : "hover:bg-white/5",
            )}>
            <Die value={f} size="sm" />
          </button>
        ))}
      </div>

      <Button
        size="lg"
        disabled={busy}
        onClick={() => onBid(qty, face)}
        className="w-full h-14 text-base font-display font-bold bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] hover:brightness-110 text-white shadow-glow-violet"
      >
        Raise: {qty} × <Die value={face} size="sm" className="!h-6 !w-6 inline-flex mx-1.5 align-middle" />
      </Button>

      {canChallenge && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            disabled={busy}
            onClick={onDudo}
            variant="destructive"
            className="h-12 font-display font-bold gap-2"
          >
            <Skull className="h-4 w-4" /> DUDO
          </Button>
          <Button
            disabled={busy}
            onClick={onCalza}
            className="h-12 font-display font-bold gap-2 bg-[var(--cyan)]/90 text-black hover:bg-[var(--cyan)] shadow-glow-cyan"
          >
            <Target className="h-4 w-4" /> CALZA
          </Button>
        </div>
      )}
    </div>
  );
}
