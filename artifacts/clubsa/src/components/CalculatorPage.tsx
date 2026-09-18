import { useState, useMemo, useEffect } from "react";
import { ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { POSITIONS, capForLevel } from "@/data";
import type { Position, Category, AuthUser, PlayerBuild } from "@/types";

const MAX_STAT = 99;

function budgetForLevel(level: number, type: string): number {
  return type === "GK" ? Math.round(180 + level * 1.6) : Math.round(150 + level * 12);
}

function bodyModifiers(height: number, weight: number, type: string): Record<string, number> {
  const mod: Record<string, number> = {};
  const add = (k: string, v: number) => { mod[k] = (mod[k] || 0) + v; };

  if (type === "GK") {
    if (height >= 190) { add("DIV", 3); add("HAN", 2); add("SPD", -3); }
    else if (height <= 172) { add("SPD", 3); add("DIV", -2); add("HAN", -1); }
    return mod;
  }

  if (height >= 190) { add("STR", 4); add("JUM", 5); add("HEA", 5); add("AGI", -4); add("ACC", -3); add("SPR", -2); add("BAL", -2); }
  else if (height >= 180) { add("STR", 2); add("JUM", 3); add("HEA", 3); add("AGI", -2); add("ACC", -1); }
  else if (height <= 168) { add("AGI", 3); add("ACC", 2); add("SPR", 2); add("BAL", 2); add("STR", -3); add("JUM", -3); add("HEA", -3); }

  if (weight >= 88) { add("STR", 4); add("STM", -3); add("AGI", -3); add("ACC", -2); }
  else if (weight >= 78) { add("STR", 2); add("AGI", -1); }
  else if (weight <= 66) { add("AGI", 2); add("STM", 2); add("STR", -3); }

  return mod;
}

function clampStat(v: number): number {
  return Math.max(0, Math.min(MAX_STAT, v));
}

function metaBuild(position: Position, budget: number, caps: Record<string, number>): Record<string, number> {
  const values: Record<string, number> = {};
  position.categories.forEach((c) => c.subs.forEach((s) => (values[s.key] = 0)));

  const ranked = [...position.categories].sort((a, b) => {
    const effA = (position.weights[a.key] || 0) / a.subs.length;
    const effB = (position.weights[b.key] || 0) / b.subs.length;
    return effB - effA;
  });

  let remaining = budget;
  for (const cat of ranked) {
    for (const su of cat.subs) {
      if (remaining <= 0) break;
      const cap = caps[su.key] ?? MAX_STAT;
      const room = cap - (values[su.key] || 0);
      if (room <= 0) continue;
      const add = Math.min(room, remaining);
      values[su.key] += add;
      remaining -= add;
    }
  }
  return values;
}

function tierOf(overall: number): { name: string; color: string } {
  if (overall >= 90) return { name: "أسطوري", color: "text-fuchsia-300" };
  if (overall >= 80) return { name: "نخبة", color: "text-cyan-300" };
  if (overall >= 65) return { name: "ذهبي", color: "text-amber-300" };
  if (overall >= 50) return { name: "فضي", color: "text-slate-300" };
  return { name: "برونزي", color: "text-orange-300" };
}

function statColor(v: number): { text: string; bg: string; bar: string } {
  if (v >= 75) return { text: "text-emerald-300", bg: "bg-emerald-500/15", bar: "bg-emerald-400" };
  if (v >= 50) return { text: "text-yellow-300", bg: "bg-yellow-500/15", bar: "bg-yellow-400" };
  return { text: "text-red-300", bg: "bg-red-500/15", bar: "bg-red-400" };
}

function flattenLeafKeys(position: Position): string[] {
  const keys: string[] = [];
  position.categories.forEach((c) => c.subs.forEach((s) => keys.push(s.key)));
  return keys;
}

function RadarChart({ categories, catValues }: { categories: Category[]; catValues: Record<string, number> }) {
  const size = 300, center = size / 2, maxR = 108, n = categories.length;
  const pointFor = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };
  const ringPolygon = (frac: number) =>
    Array.from({ length: n }).map((_, i) => { const p = pointFor(i, maxR * frac); return `${p.x},${p.y}`; }).join(" ");
  const playerPolygon = categories.map((c, i) => {
    const r = (Math.min(catValues[c.key] || 0, MAX_STAT) / MAX_STAT) * maxR;
    const p = pointFor(i, r);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] mx-auto">
      <defs>
        <radialGradient id="fillGrad" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={ringPolygon(f)} fill="none" stroke="#1e293b" strokeWidth="1" />
      ))}
      {categories.map((_, i) => {
        const p = pointFor(i, maxR);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#1e293b" strokeWidth="1" />;
      })}
      <polygon points={playerPolygon} fill="url(#fillGrad)" stroke="#22d3ee" strokeWidth="2" />
      {categories.map((c, i) => {
        const r = (Math.min(catValues[c.key] || 0, MAX_STAT) / MAX_STAT) * maxR;
        const p = pointFor(i, r);
        return <circle key={c.key} cx={p.x} cy={p.y} r="3.5" fill="#67e8f9" />;
      })}
      {categories.map((c, i) => {
        const p = pointFor(i, maxR + 24);
        return (
          <text key={c.key} x={p.x} y={p.y} fill="#94a3b8" fontSize="12" fontWeight={700}
            textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "Tajawal, sans-serif" }}>
            {c.key}
          </text>
        );
      })}
    </svg>
  );
}

function SubStatSlider({
  label, subKey, rawValue, displayValue, remaining, cap, onChange,
}: {
  label: string; subKey: string; rawValue: number; displayValue: number;
  remaining: number; cap: number; onChange: (key: string, val: number) => void;
}) {
  const color = statColor(displayValue);
  const maxAllowed = Math.min(cap, rawValue + remaining);
  const hasBonus = displayValue !== rawValue;
  const diff = displayValue - rawValue;
  const atCap = rawValue >= cap;

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs font-extrabold tabular-nums ${color.bg} ${color.text}`}>
          {displayValue}{hasBonus && <span className="text-[10px] opacity-70"> ({rawValue}{diff > 0 ? `+${diff}` : diff})</span>}
          {atCap && <span className="text-[9px] text-amber-400/80 ms-1">max</span>}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div className={`absolute inset-y-0 right-0 rounded-full ${color.bar}`} style={{ width: `${(rawValue / MAX_STAT) * 100}%` }} />
      </div>
      <input type="range" min={0} max={maxAllowed} value={rawValue}
        onChange={(e) => onChange(subKey, Number(e.target.value))}
        className="w-full mt-1 accent-cyan-400 h-3" />
    </div>
  );
}

function CategoryPanel({
  cat, rawValues, displayValues, remaining, caps, onChange, expanded, onToggle,
}: {
  cat: Category; rawValues: Record<string, number>; displayValues: Record<string, number>;
  remaining: number; caps: Record<string, number>; onChange: (key: string, val: number) => void;
  expanded: boolean; onToggle: () => void;
}) {
  const avg = useMemo(() => {
    const sum = cat.subs.reduce((s, su) => s + (displayValues[su.key] || 0), 0);
    return cat.subs.length ? Math.round(sum / cat.subs.length) : 0;
  }, [cat, displayValues]);
  const color = statColor(avg);
  const single = cat.subs.length === 1;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ChevronDown size={16} className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          <span className="text-sm font-bold text-slate-200">{cat.label}</span>
          <span className="text-[11px] text-slate-500 font-bold">{cat.key}</span>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-sm font-extrabold tabular-nums ${color.bg} ${color.text}`}>{avg}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/70">
          {cat.subs.map((su) => (
            <SubStatSlider key={su.key} subKey={su.key}
              label={single ? cat.label : su.label}
              rawValue={rawValues[su.key] || 0}
              displayValue={displayValues[su.key] || 0}
              remaining={remaining} cap={caps[su.key] ?? MAX_STAT} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage({
  auth,
  onRequireLogin,
  onSaveBuild,
}: {
  auth: AuthUser | null;
  onRequireLogin: () => void;
  onSaveBuild?: (build: PlayerBuild) => void;
}) {
  const [posId, setPosId] = useState("ST");
  const [level, setLevel] = useState(50);
  const [height, setHeight] = useState(178);
  const [weight, setWeight] = useState(74);
  const [values, setValues] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hasInteracted, setHasInteracted] = useState(false);

  const position = POSITIONS.find((p) => p.id === posId)!;
  const budget = budgetForLevel(level, position.type);

  useEffect(() => {
    const initValues: Record<string, number> = {};
    position.categories.forEach((c) => c.subs.forEach((s) => (initValues[s.key] = 0)));
    setValues(initValues);
    const initExpanded: Record<string, boolean> = {};
    position.categories.forEach((c) => (initExpanded[c.key] = true));
    setExpanded(initExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posId]);

  const leafKeys = useMemo(() => flattenLeafKeys(position), [position]);
  const used = leafKeys.reduce((s, k) => s + (values[k] || 0), 0);
  const remaining = budget - used;

  const mods = useMemo(() => bodyModifiers(height, weight, position.type), [height, weight, position]);

  const caps = useMemo(() => capForLevel(posId, level), [posId, level]);

  const displayValues = useMemo(() => {
    const obj: Record<string, number> = {};
    leafKeys.forEach((k) => { obj[k] = clampStat((values[k] || 0) + (mods[k] || 0)); });
    return obj;
  }, [values, mods, leafKeys]);

  const catValues = useMemo(() => {
    const obj: Record<string, number> = {};
    position.categories.forEach((c) => {
      const sum = c.subs.reduce((s, su) => s + (displayValues[su.key] || 0), 0);
      obj[c.key] = c.subs.length ? Math.round(sum / c.subs.length) : 0;
    });
    return obj;
  }, [displayValues, position]);

  const overall = useMemo(() => {
    let sum = 0;
    position.categories.forEach((c) => { sum += (catValues[c.key] || 0) * (position.weights[c.key] || 0); });
    return Math.round(sum);
  }, [catValues, position]);

  const tier = tierOf(overall);
  const usedPct = Math.min(100, Math.round((used / budget) * 100));

  useEffect(() => {
    if (!hasInteracted || !auth || auth.role !== "player" || !onSaveBuild) return;
    const build: PlayerBuild = {
      position: posId,
      overall,
      stats: catValues,
      playStylePlus: auth.playerBuild?.playStylePlus ?? null,
      playStyles: auth.playerBuild?.playStyles ?? [],
      level,
      height,
      weight,
      updated_at: new Date().toISOString(),
    };
    onSaveBuild(build);
    // The callback is intentionally omitted: auth identity and calculator values are the sync keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInteracted, auth?.id, auth?.role, posId, overall, catValues, level, height, weight]);

  const handleChange = (key: string, val: number) => {
    setHasInteracted(true);
    setValues((prev) => ({ ...prev, [key]: val }));
  };
  const handleToggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  const handleReset = () => {
    setHasInteracted(true);
    const cleared: Record<string, number> = {};
    leafKeys.forEach((k) => (cleared[k] = 0));
    setValues(cleared);
  };
  const handleMetaBuild = () => {
    setHasInteracted(true);
    setValues(metaBuild(position, budget, caps));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight" style={{ fontFamily: "Cairo, sans-serif" }}>
            حاسبة طاقات اللاعبين
          </h1>
          <p className="text-slate-400 text-sm mt-1">CLUBSA · Pro Clubs Builder</p>
        </div>
        <div className="text-left">
          <div className={`text-4xl font-extrabold ${tier.color}`} style={{ fontFamily: "Cairo, sans-serif" }}>{overall}</div>
          <div className={`text-xs font-bold ${tier.color}`}>{tier.name}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {POSITIONS.map((p) => (
          <button key={p.id} onClick={() => setPosId(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              p.id === posId ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <button onClick={handleMetaBuild}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-extrabold bg-gradient-to-l from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 transition-all shadow-lg shadow-orange-500/10">
          <Sparkles size={16} /> تحميل أفضل بناء — {position.label}
        </button>
        <p className="text-[11px] text-slate-500 mt-1.5">
          يوزّع النقاط تلقائيًا على الطاقات الأكثر تأثيرًا على تقييم {position.label} ضمن رصيدك الحالي.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <label className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">اللفل (Level)</span>
          <input type="number" min={1} max={99} value={level}
            onChange={(e) => setLevel(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
            className="bg-transparent text-slate-100 font-bold outline-none tabular-nums" />
        </label>
        <label className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">الطول (سم)</span>
          <input type="number" min={150} max={210} value={height}
            onChange={(e) => setHeight(Math.max(150, Math.min(210, Number(e.target.value) || 150)))}
            className="bg-transparent text-slate-100 font-bold outline-none tabular-nums" />
        </label>
        <label className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">الوزن (كجم)</span>
          <input type="number" min={55} max={110} value={weight}
            onChange={(e) => setWeight(Math.max(55, Math.min(110, Number(e.target.value) || 55)))}
            className="bg-transparent text-slate-100 font-bold outline-none tabular-nums" />
        </label>
      </div>
      <p className="text-[11px] text-slate-500 mb-6">
        اللفل يزيد رصيد نقاط الطاقة المتاحة، بينما الطول والوزن يمنحان أو يخصمان تلقائيًا من صفات محددة (القوة، الرشاقة، القفز، السرعة...) — الأرقام بين قوسين تُظهر أثر الجسم على الرقم الأساسي.
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-300">نقاط الطاقة المستخدمة</span>
          <span className={`font-bold tabular-nums ${remaining < 0 ? "text-red-400" : "text-slate-200"}`}>{used} / {budget}</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${usedPct >= 100 ? "bg-red-500" : "bg-gradient-to-l from-cyan-400 to-blue-600"}`} style={{ width: `${usedPct}%` }} />
        </div>
        {remaining < 0 && <p className="text-xs text-red-400 mt-2">تجاوزت نقاط الطاقة المتاحة — قلّل بعض الصفات أو ارفع اللفل.</p>}
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col items-center lg:sticky lg:top-24">
          <RadarChart categories={position.categories} catValues={catValues} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">{position.label}</span>
            <span className={`px-3 py-1 rounded-full bg-slate-800 text-xs font-bold ${tier.color}`}>{tier.name}</span>
          </div>
          <button onClick={handleReset}
            className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/50 rounded-md px-3 py-1.5 transition-colors">
            <RotateCcw size={13} /> تصفير كل الصفات
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {position.categories.map((cat) => (
            <CategoryPanel key={cat.key} cat={cat}
              rawValues={values} displayValues={displayValues}
              remaining={remaining} caps={caps} onChange={handleChange}
              expanded={!!expanded[cat.key]} onToggle={() => handleToggle(cat.key)} />
          ))}
        </div>
      </div>
    </div>
  );
}
