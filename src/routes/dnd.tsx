import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT, LangSwitcher } from "@/lib/i18n";
import { ArrowLeft, Plus, RotateCcw, Swords, Trash2, Check } from "lucide-react";

export const Route = createFileRoute("/dnd")({
  component: DnDArena,
  head: () => ({
    meta: [
      { title: "DnD — Dumb and Dangerous" },
      { name: "description", content: "Arène fantasy parodique : crée tes héros, races et classes au programme." },
    ],
  }),
});

/* ---------- Races ---------- */

type Race = "human" | "dwarf" | "elf" | "orc" | "goblin" | "tiefling";

type RaceDef = {
  label: { fr: string; en: string };
  radius: number;
  speed: number;
  hp: number;
  outline: string;       // contour color
  fill: string;          // body color (cartoon)
  desc: { fr: string; en: string };
};

const RACES: Record<Race, RaceDef> = {
  human: {
    label: { fr: "Humain", en: "Human" },
    radius: 22, speed: 110, hp: 100, outline: "#3b82f6", fill: "#93c5fd",
    desc: { fr: "Polyvalent. Rien d'exceptionnel, mais rien de raté.", en: "Jack of all trades, master of none." },
  },
  dwarf: {
    label: { fr: "Nain", en: "Dwarf" },
    radius: 18, speed: 80, hp: 160, outline: "#f59e0b", fill: "#fcd34d",
    desc: { fr: "Petit, trapu, increvable. Sent la bière.", en: "Short, stout, unkillable. Smells of beer." },
  },
  elf: {
    label: { fr: "Elfe", en: "Elf" },
    radius: 19, speed: 160, hp: 85, outline: "#10b981", fill: "#6ee7b7",
    desc: { fr: "Rapide, élégant, légèrement hautain.", en: "Swift, elegant, mildly smug." },
  },
  orc: {
    label: { fr: "Orc", en: "Orc" },
    radius: 32, speed: 90, hp: 140, outline: "#84cc16", fill: "#bef264",
    desc: { fr: "Gros, fort, pas finaud. Fait peur.", en: "Big, strong, not bright. Scary." },
  },
  goblin: {
    label: { fr: "Gobelin", en: "Goblin" },
    radius: 13, speed: 200, hp: 60, outline: "#a855f7", fill: "#d8b4fe",
    desc: { fr: "Minuscule, hyperactif, pique tout ce qui brille.", en: "Tiny, twitchy, steals everything shiny." },
  },
  tiefling: {
    label: { fr: "Tieffelin", en: "Tiefling" },
    radius: 22, speed: 120, hp: 95, outline: "#ef4444", fill: "#fca5a5",
    desc: { fr: "Cornes, sarcasme et un soupçon de soufre.", en: "Horns, sarcasm, a hint of brimstone." },
  },
};

/* ---------- Classes ---------- */

type ClassId = "warrior" | "mage" | "archer" | "cleric" | "barbarian" | "rogue";

type ClassDef = {
  label: { fr: string; en: string };
  weapon: { fr: string; en: string };
  glyph: string; // emoji
  damage: number;
  range: number;
  special: { fr: string; en: string };
  desc: { fr: string; en: string };
};

const CLASSES: Record<ClassId, ClassDef> = {
  warrior: {
    label: { fr: "Guerrier", en: "Warrior" },
    weapon: { fr: "Épée longue", en: "Longsword" },
    glyph: "⚔️", damage: 18, range: 35,
    special: { fr: "Bouclier (-50% dégâts 2s)", en: "Shield (-50% dmg 2s)" },
    desc: { fr: "Solide au corps-à-corps, jamais le dernier debout.", en: "Sturdy in melee, rarely the last to fall." },
  },
  mage: {
    label: { fr: "Mage", en: "Mage" },
    weapon: { fr: "Bâton arcanique", en: "Arcane staff" },
    glyph: "✨", damage: 22, range: 180,
    special: { fr: "Boule de feu (zone)", en: "Fireball (AoE)" },
    desc: { fr: "Frêle mais explosif. Évite les pichenettes.", en: "Frail but explosive. Avoid the flicks." },
  },
  archer: {
    label: { fr: "Archer", en: "Archer" },
    weapon: { fr: "Arc long", en: "Longbow" },
    glyph: "🏹", damage: 14, range: 260,
    special: { fr: "Tir précis (crit)", en: "Precise shot (crit)" },
    desc: { fr: "Pique de loin, court vite si ça tourne mal.", en: "Pokes from afar, sprints when it sours." },
  },
  cleric: {
    label: { fr: "Clerc", en: "Cleric" },
    weapon: { fr: "Masse bénie", en: "Holy mace" },
    glyph: "✝️", damage: 10, range: 40,
    special: { fr: "Soin de zone (+25 PV)", en: "Heal aura (+25 HP)" },
    desc: { fr: "Soigne les copains, frappe à contrecœur.", en: "Heals friends, hits reluctantly." },
  },
  barbarian: {
    label: { fr: "Barbare", en: "Barbarian" },
    weapon: { fr: "Marteau colossal", en: "Colossal hammer" },
    glyph: "🔨", damage: 30, range: 45,
    special: { fr: "Rage (+50% dégâts)", en: "Rage (+50% dmg)" },
    desc: { fr: "Frappe fort, réfléchit après.", en: "Hits hard, thinks later." },
  },
  rogue: {
    label: { fr: "Voleur", en: "Rogue" },
    weapon: { fr: "Dague affutée", en: "Sharp dagger" },
    glyph: "🗡️", damage: 12, range: 30,
    special: { fr: "Attaque sournoise (x2)", en: "Backstab (x2)" },
    desc: { fr: "Petite arme, gros sourire en coin.", en: "Tiny blade, huge smirk." },
  },
};

/* ---------- Types & helpers ---------- */

type Player = {
  id: string;
  name: string;
  race: Race;
  cls: ClassId;
  fill: string;
  outline: string;
  glyph: string;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  x: number; y: number;
  vx: number; vy: number;
};

const FUNNY_NAMES = [
  "Grognak", "Elindra", "Bouboule", "Sir Patate", "Mère-Grand",
  "Lord Tartiflette", "Zorglub", "Pépito", "Vlad Dent-Creuse", "Gandulf",
];

function randomVelocity(speed: number) {
  const a = Math.random() * Math.PI * 2;
  return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
}

function makePlayer(name: string, race: Race, cls: ClassId, arena: number): Player {
  const r = RACES[race];
  const c = CLASSES[cls];
  const { vx, vy } = randomVelocity(r.speed);
  return {
    id: crypto.randomUUID(),
    name: name.trim() || FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)],
    race, cls,
    fill: r.fill, outline: r.outline, glyph: c.glyph,
    radius: r.radius, speed: r.speed,
    hp: r.hp, maxHp: r.hp,
    x: r.radius + Math.random() * (arena - 2 * r.radius),
    y: r.radius + Math.random() * (arena - 2 * r.radius),
    vx, vy,
  };
}

/* ---------- Component ---------- */

function DnDArena() {
  const { lang, t } = useT();
  const ARENA = 720;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playersRef = useRef<Player[]>([]);
  const [, setTick] = useState(0);

  const [name, setName] = useState("");
  const [race, setRace] = useState<Race>("human");
  const [cls, setCls] = useState<ClassId>("warrior");
  const [running, setRunning] = useState(true);

  const raceDef = RACES[race];
  const clsDef = CLASSES[cls];

  // seed
  useEffect(() => {
    if (playersRef.current.length === 0) {
      playersRef.current = [
        makePlayer("Grognak", "orc", "barbarian", ARENA),
        makePlayer("Elindra", "elf", "archer", ARENA),
        makePlayer("Bouboule", "dwarf", "warrior", ARENA),
        makePlayer("Pépito", "goblin", "rogue", ARENA),
      ];
      setTick((t) => t + 1);
    }
  }, []);

  // simulation
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) {
        const ps = playersRef.current;
        for (const p of ps) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x - p.radius < 0) { p.x = p.radius; p.vx = Math.abs(p.vx); }
          if (p.x + p.radius > ARENA) { p.x = ARENA - p.radius; p.vx = -Math.abs(p.vx); }
          if (p.y - p.radius < 0) { p.y = p.radius; p.vy = Math.abs(p.vy); }
          if (p.y + p.radius > ARENA) { p.y = ARENA - p.radius; p.vy = -Math.abs(p.vy); }
        }
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const a = ps[i], b = ps[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const overlap = a.radius + b.radius - dist;
            if (overlap > 0) {
              const nx = dx / dist, ny = dy / dist;
              a.x -= (nx * overlap) / 2; a.y -= (ny * overlap) / 2;
              b.x += (nx * overlap) / 2; b.y += (ny * overlap) / 2;
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
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== ARENA * dpr) { c.width = ARENA * dpr; c.height = ARENA * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ARENA, ARENA);

    // parchment
    const g = ctx.createRadialGradient(ARENA / 2, ARENA / 2, ARENA * 0.2, ARENA / 2, ARENA / 2, ARENA * 0.75);
    g.addColorStop(0, "#f5e9c8"); g.addColorStop(1, "#d6bf8a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, ARENA, ARENA);
    ctx.strokeStyle = "rgba(90,60,20,0.18)"; ctx.lineWidth = 1;
    for (let i = 0; i <= ARENA; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, ARENA);
      ctx.moveTo(0, i); ctx.lineTo(ARENA, i);
      ctx.stroke();
    }
    ctx.strokeStyle = "#5b3a1a"; ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, ARENA - 6, ARENA - 6);
    ctx.strokeStyle = "rgba(91,58,26,0.5)"; ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, ARENA - 24, ARENA - 24);

    for (const p of playersRef.current) {
      // shadow
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.ellipse(p.x, p.y + p.radius * 0.85, p.radius * 0.9, p.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.beginPath();
      ctx.fillStyle = p.fill;
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = p.outline; ctx.stroke();
      // gloss
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.arc(p.x - p.radius * 0.35, p.y - p.radius * 0.4, p.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // weapon glyph
      ctx.font = `${Math.round(p.radius * 0.9)}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.glyph, p.x, p.y + 1);
      // HP bar
      const bw = Math.max(46, p.radius * 2.2), bh = 6;
      const bx = p.x - bw / 2, by = p.y - p.radius - 16;
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = "#3a1e10"; ctx.fillRect(bx, by, bw, bh);
      const ratio = Math.max(0, p.hp / p.maxHp);
      ctx.fillStyle = ratio > 0.5 ? "#34d399" : ratio > 0.25 ? "#fbbf24" : "#ef4444";
      ctx.fillRect(bx, by, bw * ratio, bh);
      // name
      ctx.font = "600 13px 'Space Grotesk', system-ui, sans-serif";
      ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,245,220,0.95)";
      ctx.strokeText(p.name, p.x, by - 4);
      ctx.fillStyle = "#3a1e10"; ctx.fillText(p.name, p.x, by - 4);
    }
  }

  function addPlayer() {
    playersRef.current = [...playersRef.current, makePlayer(name, race, cls, ARENA)];
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
  function clearAll() { playersRef.current = []; setTick((t) => t + 1); }

  const previewHp = useMemo(() => raceDef.hp, [raceDef]);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />
      <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
        <Link to="/games" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>
        <LangSwitcher />
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Swords className="h-3 w-3 text-rose-400" /> DnD
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
            Dumb <span className="text-rose-400">&</span> Dangerous
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {lang === "fr"
              ? "Choisis ta race, ta classe, et lâche ton héros dans l'arène."
              : "Pick a race, a class, and unleash your hero in the arena."}
          </p>
        </div>

        {/* Character creator */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Selectors */}
          <div className="space-y-6">
            {/* Races */}
            <div>
              <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
                {lang === "fr" ? "Race" : "Race"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(RACES) as Race[]).map((r) => {
                  const def = RACES[r];
                  const active = race === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setRace(r)}
                      className={`relative text-left glass rounded-xl p-3 transition ${
                        active ? "ring-2 ring-[var(--violet)] bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--violet)] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block rounded-full"
                          style={{
                            background: def.fill,
                            border: `3px solid ${def.outline}`,
                            width: Math.max(18, def.radius * 0.9),
                            height: Math.max(18, def.radius * 0.9),
                          }}
                        />
                        <span className="font-display font-bold">{def.label[lang]}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{def.desc[lang]}</p>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Stat label={lang === "fr" ? "Taille" : "Size"} value={def.radius} />
                        <Stat label={lang === "fr" ? "Vit" : "Spd"} value={def.speed} />
                        <Stat label="PV" value={def.hp} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Classes */}
            <div>
              <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
                {lang === "fr" ? "Classe" : "Class"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(CLASSES) as ClassId[]).map((k) => {
                  const def = CLASSES[k];
                  const active = cls === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setCls(k)}
                      className={`relative text-left glass rounded-xl p-3 transition ${
                        active ? "ring-2 ring-[var(--cyan)] bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cyan)] text-black">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{def.glyph}</span>
                        <span className="font-display font-bold">{def.label[lang]}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{def.weapon[lang]}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <Stat label={lang === "fr" ? "Dég" : "Dmg"} value={def.damage} />
                        <Stat label={lang === "fr" ? "Portée" : "Range"} value={def.range} />
                      </div>
                      <p className="mt-2 text-[11px] text-[var(--cyan)]">★ {def.special[lang]}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Preview & form */}
          <aside className="glass rounded-2xl p-5 space-y-4 h-fit lg:sticky lg:top-4">
            <h3 className="font-display text-lg font-bold">{lang === "fr" ? "Aperçu" : "Preview"}</h3>

            <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-[#f5e9c8] to-[#d6bf8a] py-6">
              <div className="relative" style={{ width: raceDef.radius * 2.4, height: raceDef.radius * 2.4 }}>
                <div
                  className="absolute inset-0 m-auto rounded-full flex items-center justify-center"
                  style={{
                    background: raceDef.fill,
                    border: `5px solid ${raceDef.outline}`,
                    width: raceDef.radius * 2,
                    height: raceDef.radius * 2,
                    fontSize: raceDef.radius * 0.9,
                  }}
                >
                  {clsDef.glyph}
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="font-display font-bold text-lg">
                {raceDef.label[lang]} · {clsDef.label[lang]}
              </p>
              <p className="text-xs text-muted-foreground italic mt-1">{raceDef.desc[lang]}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Pill label="PV" value={previewHp} />
              <Pill label={lang === "fr" ? "Vitesse" : "Speed"} value={raceDef.speed} />
              <Pill label={lang === "fr" ? "Dégâts" : "Damage"} value={clsDef.damage} />
              <Pill label={lang === "fr" ? "Portée" : "Range"} value={clsDef.range} />
            </div>
            <p className="text-[11px] text-[var(--cyan)] text-center">★ {clsDef.special[lang]}</p>

            <Input
              placeholder={lang === "fr" ? "Nom du héros" : "Hero name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
            />
            <Button onClick={addPlayer} className="w-full font-display gap-1.5">
              <Plus className="h-4 w-4" /> {lang === "fr" ? "Lâcher dans l'arène" : "Drop in arena"}
            </Button>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <Button variant="outline" className="flex-1" onClick={() => setRunning((r) => !r)}>
                {running ? "Pause" : lang === "fr" ? "Reprendre" : "Resume"}
              </Button>
              <Button variant="outline" onClick={reset} title="Reset"><RotateCcw className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={clearAll} title="Clear"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </aside>
        </div>

        {/* Arena */}
        <div className="mt-8 glass rounded-2xl p-3 sm:p-4">
          <div className="mx-auto" style={{ maxWidth: ARENA }}>
            <canvas ref={canvasRef} style={{ width: "100%", aspectRatio: "1 / 1", display: "block", borderRadius: 12 }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 justify-center text-xs text-muted-foreground">
            {playersRef.current.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-1">
                <span
                  className="inline-block rounded-full"
                  style={{ background: p.fill, border: `2px solid ${p.outline}`, width: 12, height: 12 }}
                />
                <span className="font-medium text-foreground">{p.name}</span>
                <span>{p.glyph}</span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/5 px-1.5 py-1 text-center">
      <div className="text-[9px] opacity-70">{label}</div>
      <div className="text-[11px] font-bold text-foreground tracking-normal">{value}</div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2 flex items-center justify-between">
      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
      <span className="font-display font-bold">{value}</span>
    </div>
  );
}
