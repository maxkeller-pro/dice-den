import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { setUsername } from "@/lib/auth";
import { createGame, joinGame } from "@/lib/game-api";
import type { RuleSet } from "@/lib/game-api";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Dices, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/play")({
  component: Play,
  head: () => ({ meta: [{ title: "Perudo" }, { name: "description", content: "Crée une salle privée ou rejoins avec un code." }] }),
});

function Play() {
  const { userId, username, setUsernameState, loading, isGuest, stats } = useAuth();
  const { t, lang } = useT();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [ruleSet, setRuleSet] = useState<RuleSet>("traditional");
  const nav = useNavigate();

  const displayName = name || username;

  async function persistName() {
    const final = (name || username).trim();
    if (!final) return;
    if (final !== username) {
      await setUsername(final);
      setUsernameState(final);
    }
  }

  async function onCreate() {
    setBusy(true);
    try {
      await persistName();
      const { code: c } = await createGame(ruleSet);
      nav({ to: "/room/$code", params: { code: c } });
    } catch (e: any) {
      toast.error(e.message ?? t("play.error.create"));
    } finally { setBusy(false); }
  }

  async function onJoin() {
    if (!code.trim()) { toast.error(t("play.error.no_code")); return; }
    setBusy(true);
    try {
      await persistName();
      await joinGame(code);
      const { data } = await supabase.from("games").select("code").eq("code", code.trim().toUpperCase()).maybeSingle();
      nav({ to: "/room/$code", params: { code: data?.code ?? code.trim().toUpperCase() } });
    } catch (e: any) {
      toast.error(e.message ?? t("play.error.join"));
    } finally { setBusy(false); }
  }

  if (loading || !userId) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 mx-auto max-w-md px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.home")}
        </Link>

        <div className="mt-6 flex items-center gap-2 font-display text-xl font-bold">
          <Dices className="h-6 w-6 text-[var(--violet)]" />
          {t("play.title")}
        </div>

        <div className="mt-3 glass rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
          {isGuest ? (
            <>
              <span className="text-muted-foreground">{t("play.guest_label")} <span className="text-foreground font-display">{t("play.guest_value")}</span></span>
              <Link to="/auth" className="text-[var(--cyan)] font-display hover:underline">{t("play.save_stats")}</Link>
            </>
          ) : (
            <>
              <span className="text-muted-foreground"><span className="text-foreground font-display">{username}</span> · Elo <span className="text-[var(--cyan)] font-mono">{stats?.elo ?? "—"}</span></span>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground">{t("common.account")}</Link>
            </>
          )}
        </div>

        <div className="mt-6 glass rounded-2xl p-5 space-y-3">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">{t("play.display_name")}</label>
          <Input
            placeholder={username || t("play.placeholder.name")}
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 bg-black/30 border-white/10 font-display"
          />
          <p className="text-[11px] text-muted-foreground">{displayName ? t("play.playing_as", { name: displayName }) : t("play.pick_name")}</p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-semibold">{t("play.create")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("play.create_desc")}</p>

            <div className="mt-4">
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                {lang === "fr" ? "Règle" : "Rules"}
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => setRuleSet("traditional")}
                  className={`rounded-lg px-2 py-2 text-xs font-display transition ${
                    ruleSet === "traditional"
                      ? "bg-[var(--violet)]/30 ring-1 ring-[var(--violet)] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "fr" ? "Traditionnelle" : "Traditional"}
                </button>
                <button
                  type="button"
                  onClick={() => setRuleSet("new")}
                  className={`rounded-lg px-2 py-2 text-xs font-display transition ${
                    ruleSet === "new"
                      ? "bg-[var(--cyan)]/30 ring-1 ring-[var(--cyan)] text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang === "fr" ? "Nouveau" : "New"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                {ruleSet === "traditional"
                  ? lang === "fr"
                    ? "Pour relancer, la face doit rester ≥ à la précédente."
                    : "When raising, the face must stay ≥ to the previous."
                  : lang === "fr"
                    ? "Tu peux choisir une face plus basse si tu augmentes strictement la quantité."
                    : "You can pick a lower face if you strictly raise the quantity."}
              </p>
            </div>

            <Button onClick={onCreate} disabled={busy} className="mt-4 w-full h-12 font-display font-bold bg-gradient-to-br from-[var(--violet)] to-[oklch(0.55_0.24_295)] text-white shadow-glow-violet">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("play.create_cta")}
            </Button>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-semibold">{t("play.join")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("play.join_desc")}</p>
            <Input
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="mt-4 h-12 bg-black/30 border-white/10 font-mono text-center text-lg tracking-[0.5em] uppercase"
            />
            <Button onClick={onJoin} disabled={busy} variant="outline" className="mt-3 w-full h-12 font-display font-bold border-white/15">
              {t("play.join_cta")}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
