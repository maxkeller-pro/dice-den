import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { setUsername } from "@/lib/auth";
import { yamsCreateGame, yamsJoin } from "@/lib/yams-api";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Dices, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/yams")({
  component: YamsLobby,
  head: () => ({ meta: [{ title: "Yams — Lovable Games" }, { name: "description", content: "Jouer au Yams en ligne avec des amis." }] }),
});

function YamsLobby() {
  const { userId, username, setUsernameState, loading } = useAuth();
  const { t, lang } = useT();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function persistName() {
    const final = (name || username).trim();
    if (!final) return;
    if (final !== username) { await setUsername(final); setUsernameState(final); }
  }

  async function onCreate() {
    setBusy(true);
    try {
      await persistName();
      const { code: c } = await yamsCreateGame();
      nav({ to: "/yams/$code", params: { code: c } });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setBusy(false); }
  }

  async function onJoin() {
    if (!code.trim()) { toast.error(lang === "fr" ? "Entre un code" : "Enter a code"); return; }
    setBusy(true);
    try {
      await persistName();
      await yamsJoin(code);
      nav({ to: "/yams/$code", params: { code: code.trim().toUpperCase() } });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally { setBusy(false); }
  }

  if (loading || !userId) {
    return <main className="grid min-h-dvh place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>;
  }

  return (
    <main className="relative min-h-dvh">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 mx-auto max-w-md px-5 py-8">
        <Link to="/games" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <div className="mt-6 flex items-center gap-2 font-display text-xl font-bold">
          <Dices className="h-6 w-6 text-amber-400" />
          {lang === "fr" ? "Yams" : "Yams"}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "fr" ? "5 dés, 13 catégories. Le plus haut score gagne." : "5 dice, 13 categories. Highest score wins."}
        </p>

        <div className="mt-6 glass rounded-2xl p-5 space-y-3">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">{t("play.display_name")}</label>
          <Input
            placeholder={username || t("play.placeholder.name")}
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 bg-black/30 border-white/10 font-display"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-semibold">{lang === "fr" ? "Créer une partie" : "Create a room"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{lang === "fr" ? "Tu obtiens un code à partager." : "You get a code to share."}</p>
            <Button onClick={onCreate} disabled={busy} className="mt-4 w-full h-12 font-display font-bold bg-gradient-to-br from-amber-500 to-rose-400 text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "fr" ? "Créer" : "Create")}
            </Button>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-lg font-semibold">{lang === "fr" ? "Rejoindre" : "Join"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{lang === "fr" ? "Avec un code à 6 caractères." : "Use a 6-char code."}</p>
            <Input
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="mt-4 h-12 bg-black/30 border-white/10 font-mono text-center text-lg tracking-[0.5em] uppercase"
            />
            <Button onClick={onJoin} disabled={busy} variant="outline" className="mt-3 w-full h-12 font-display font-bold border-white/15">
              {lang === "fr" ? "Rejoindre" : "Join"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
