import { Volume2, VolumeX } from "lucide-react";
import { useMuted } from "@/lib/sound";
import { useT } from "@/lib/i18n";

export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useMuted();
  const { t } = useT();
  const label = muted ? t("sound.unmute") : t("sound.mute");
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-label={label}
      title={label}
      className={
        "fixed top-3 right-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full " +
        "bg-black/40 backdrop-blur border border-white/10 text-foreground/80 hover:text-foreground " +
        "hover:bg-black/60 transition shadow-lg " +
        className
      }
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );
}