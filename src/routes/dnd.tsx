import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT, LangSwitcher } from "@/lib/i18n";
import { ArrowLeft, Plus, RotateCcw, Swords, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dnd")({
  component: DnDArena,
  head: () => ({
    meta: [
      { title: "DnD — Dumb and Dangerous" },
      { name: "description", content: "Arène fantasy parodique : ronds rebondissants, chaos garanti." },
    ],
  }),
});

type Race = "human" | "elf" | "dwarf" | "halfling" | "orc";

const RACES: Record<Race, { label: { fr: string; en: string }; radius: number; speed: number; color: string }> = {
  human:    { label: { fr: "Humain",   en: "Human"    }, radius: 22, speed: 110, color: "#60a5fa" },
  elf:      { label: { fr: "Elfe",     en: "Elf"      }, radius: 18, speed: 150, color: "#34d399" },
  dwarf:    { label: { fr: "Nain",     en: "Dwarf"    }, radius: 28, speed: 80,  color: "#f59e0b" },
  halfling: { label: { fr: "Hobbit",   en: "Halfling" }, radius: 15, speed: 170, color: "#f472b6" },
  orc:      { label: { fr: "Orc",      en: "Orc"      }, radius: 32, speed: 90,  color: "#a3e635" },
};

type Player = {
  id: string;
  name: string;
  race: Race;
  color: string;
  radius: number;
  speed: number; // px/s magnitude
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
};

const FUNNY_NAMES = [
  "Grognak", "Elindra", "Bouboule", "Sir Patate", "Mère-Grand",
  "Lord Tartiflette", "Zorglub", "Pépito le Brave", "Vlad Dent-Creuse", "Gandulf",
];

function randomVelocity(speed: number) {
  const angle = Math.random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function makePlayer(name: string, race: Race, arena: number): Player {
  const r = RACES[race];
  const { vx, vy } = randomVelocity(r.speed);
  return {
    id: crypto.randomUUID(),
    name: name.trim() || FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)],
    race,
    color: r.color,
    radius: r.radius,
    speed: r.speed,
    x: r.radius + Math.random() * (arena - 2 * r.radius),
    y: r.radius + Math.random() * (arena - 2 * r.radius),
    vx,
    vy,
    hp: 100,
    maxHp: 100,
  };
}

function DnDArena() {
  const { lang, t } = useT();
  const ARENA = 720;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playersRef = useRef<Player[]>([]);
  const [, setTick] = useState(0);
  const [name, setName] = useState("");
  const [race, setRace] = useState<Race>("human");
  const [running, setRunning] = useState(true);

  // Seed a few demo players on first mount
  useEffect(() => {
    if (playersRef.current.length === 0) {
      playersRef.current = [
        makePlayer("Grognak", "orc", ARENA),
        makePlayer("Elindra", "elf", ARENA),
        makePlayer("Bouboule", "halfling", ARENA),
        makePlayer("Sir Patate", "dwarf", ARENA),
      ];
      setTick((t) => t + 1);
    }
  }, []);

  // Simulation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) {
        const ps = playersRef.current;
        for (const p of ps) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.x - p.radius < 0) { p.x = p.radius; p.vx = Math.abs(p.vx); }
          if (p.x + p.radius > ARENA) { p.x = ARENA - p.radius; p.vx = -Math.abs(p.vx); }
          if (p.y - p.radius < 0) { p.y = p.radius; p.vy = Math.abs(p.vy); }
          if (p.y + p.radius > ARENA) { p.y = ARENA - p.radius; p.vy = -Math.abs(p.vy); }
        }
        // Sphere collisions: elastic bounce
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i], b = ps[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const overlap = a.radius + b.radius - dist;
            if (overlap > 0) {
              const nx = dx / dist, ny = dy / dist;
              a.x -= (nx * overlap) / 2;
              a.y -= (ny * overlap) / 2;
              b.x += (nx * overlap) / 2;
              b.y += (ny * overlap) / 2;
              // swap velocity components along normal
              const va = a.vx * nx + a.vy * ny;
              const vb = b.vx * nx + b.vy * ny;
              const diff = vb - va;
              a.vx += diff * nx; a.vy += diff * ny;
              b.vx -= diff * nx; b.vy -= diff * ny;
            }
          }
        }
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  function draw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== ARENA * dpr) {
      c.width = ARENA * dpr;
      c.height = ARENA * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ARENA, ARENA);

    // parchment background
    const grad = ctx.createRadialGradient(ARENA / 2, ARENA / 2, ARENA * 0.2, ARENA / 2, ARENA / 2, ARENA * 0.75);
    grad.addColorStop(0, "#f5e9c8");
    grad.addColorStop(1, "#d6bf8a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ARENA, ARENA);

    // grid
    ctx.strokeStyle = "rgba(90, 60, 20, 0.18)";
    ctx.lineWidth = 1;
    const cell = 40;
    for (let i = 0; i <= ARENA; i += cell) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, ARENA);
      ctx.moveTo(0, i); ctx.lineTo(ARENA, i);
      ctx.stroke();
    }
    // outer frame
    ctx.strokeStyle = "#5b3a1a";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, ARENA - 6, ARENA - 6);
    ctx.strokeStyle = "rgba(91, 58, 26, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, ARENA - 24, ARENA - 24);

    // players
    for (const p of playersRef.current) {
      // shadow
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.ellipse(p.x, p.y + p.radius * 0.85, p.radius * 0.9, p.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // body
      ctx.beginPath();
      ctx.fillStyle = p.color;
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.stroke();

      // glossy highlight
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.arc(p.x - p.radius * 0.35, p.y - p.radius * 0.4, p.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      const bw = Math.max(40, p.radius * 2.2);
      const bh = 6;
      const bx = p.x - bw / 2;
      const by = p.y - p.radius - 16;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = "#3a1e10";
      ctx.fillRect(bx, by, bw, bh);
      const ratio = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = ratio > 0.5 ? "#34d399" : ratio > 0.25 ? "#fbbf24" : "#ef4444";
      ctx.fillRect(bx, by, bw * ratio, bh);

      // name
      ctx.font = "600 13px 'Space Grotesk', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 245, 220, 0.95)";
      ctx.strokeText(p.name, p.x, by - 4);
      ctx.fillStyle = "#3a1e10";
      ctx.fillText(p.name, p.x, by - 4);
    }
  }

  function addPlayer() {
    playersRef.current = [...playersRef.current, makePlayer(name, race, ARENA)];
    setName("");
    setTick((t) => t + 1);
  }
  function reset() {
    for (const p of playersRef.current) {
      const v = randomVelocity(p.speed);
      p.vx = v.vx; p.vy = v.vy; p.hp = p.maxHp;
      p.x = p.radius + Math.random() * (ARENA - 2 * p.radius);
      p.y = p.radius + Math.random() * (ARENA - 2 * p.radius);
    }
    setTick((t) => t + 1);
  }
  function clearAll() {
    playersRef.current = [];
    setTick((t) => t + 1);
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <Link to="/games" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>
        <div className="flex items-center gap-2">
          <LangSwitcher />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Swords className="h-3 w-3 text-rose-400" /> DnD
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
            Dumb <span className="text-rose-400">&</span> Dangerous
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {lang === "fr"
              ? "Étape 1 : observe tes héros rebondir comme des nouilles dans l'arène."
              : "Step 1: watch your heroes ricochet like noodles across the arena."}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="glass rounded-2xl p-3 sm:p-4">
            <div className="mx-auto" style={{ maxWidth: ARENA }}>
              <canvas
                ref={canvasRef}
                style={{ width: "100%", aspectRatio: "1 / 1", display: "block", borderRadius: 12 }}
              />
            </div>
          </div>

          <aside className="glass rounded-2xl p-5 space-y-5 h-fit">
            <div>
              <h3 className="font-display text-lg font-bold mb-3">{lang === "fr" ? "Ajouter un héros" : "Add a hero"}</h3>
              <div className="space-y-2">
                <Input
                  placeholder={lang === "fr" ? "Nom (laisse vide pour surprendre)" : "Name (leave blank for fun)"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={18}
                />
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(RACES) as Race[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRace(r)}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                        race === r ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <span
                        className="inline-block rounded-full"
                        style={{
                          background: RACES[r].color,
                          width: Math.round(RACES[r].radius / 2),
                          height: Math.round(RACES[r].radius / 2),
                        }}
                      />
                      <span>{RACES[r].label[lang]}</span>
                    </button>
                  ))}
                </div>
                <Button onClick={addPlayer} className="w-full font-display gap-1.5">
                  <Plus className="h-4 w-4" /> {lang === "fr" ? "Lâcher dans l'arène" : "Drop in arena"}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5" onClick={() => setRunning((r) => !r)}>
                {running ? (lang === "fr" ? "Pause" : "Pause") : (lang === "fr" ? "Reprendre" : "Resume")}
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={reset} title="Reset">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={clearAll} title="Clear">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                {lang === "fr" ? "Combattants" : "Fighters"} ({playersRef.current.length})
              </h4>
              <ul className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {playersRef.current.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color }} />
                    <span className="font-medium truncate flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{RACES[p.race].label[lang]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
