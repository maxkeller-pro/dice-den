import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useT } from "@/lib/i18n";
import { ArrowLeft, Loader2, Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
  head: () => ({
    meta: [
      { title: "Leaderboard — Liar's Dice" },
      { name: "description", content: "Top ranked players by Elo rating." },
    ],
  }),
});

type Row = { user_id: string; username: string; elo: number; wins: number; losses: number; games_played: number };

function Leaderboard() {
  const { userId } = useAuth();
  const { t } = useT();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, elo, wins, losses, games_played")
        .eq("is_guest", false)
        .gt("games_played", 0)
        .order("elo", { ascending: false })
        .limit(100);
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  return (
    <main className="relative min-h-dvh">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.home")}
        </Link>

        <div className="mt-6 flex items-center gap-2 font-display text-2xl font-bold">
          <Trophy className="h-6 w-6 text-[var(--cyan)]" /> {t("lb.title")}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("lb.subtitle")}<Link to="/auth" className="underline hover:text-foreground">{t("lb.subtitle.link")}</Link>{t("lb.subtitle.end")}</p>

        <div className="mt-6 glass rounded-2xl overflow-hidden">
          {rows === null ? (
            <div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">{t("lb.empty")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-3 w-10">#</th>
                  <th className="text-left py-2 px-3">{t("lb.col.player")}</th>
                  <th className="text-right py-2 px-3">{t("lb.col.elo")}</th>
                  <th className="text-right py-2 px-3 hidden sm:table-cell">{t("lb.col.wl")}</th>
                  <th className="text-right py-2 px-3 hidden sm:table-cell">{t("lb.col.games")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.user_id} className={`border-b border-white/5 last:border-0 ${r.user_id === userId ? "bg-[var(--violet)]/10" : ""}`}>
                    <td className="py-3 px-3 font-mono">
                      {i === 0 ? <Medal className="h-4 w-4 text-[#ffd700]" /> :
                       i === 1 ? <Medal className="h-4 w-4 text-[#c0c0c0]" /> :
                       i === 2 ? <Medal className="h-4 w-4 text-[#cd7f32]" /> : i + 1}
                    </td>
                    <td className="py-3 px-3 font-display">{r.username}{r.user_id === userId && <span className="ml-2 text-[10px] text-[var(--cyan)]">{t("lb.you")}</span>}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[var(--cyan)]">{r.elo}</td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{r.wins} / {r.losses}</td>
                    <td className="py-3 px-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{r.games_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}