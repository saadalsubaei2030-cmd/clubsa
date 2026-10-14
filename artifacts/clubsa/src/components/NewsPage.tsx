import { useMemo, useState } from "react";
import { Newspaper, ChevronLeft, Calendar, ExternalLink, Swords, Crosshair, Sparkles } from "lucide-react";
import { getArticles } from "@/lib/mockData";
import {
  NEWS,
  POSITIONS,
  ARCHETYPES,
  FORMATIONS,
  TEAM_TIPS,
  type NewsItem,
  type PositionGuide,
} from "@/lib/guideData";
import type { Article } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  tactics: "تكتيكات",
  guide: "أدلة",
  news: "أخبار",
};

type Tab = "news" | "builds" | "tactics";

const TABS: { id: Tab; label: string; icon: typeof Newspaper }[] = [
  { id: "news", label: "الأخبار", icon: Newspaper },
  { id: "builds", label: "أفضل بناء لمركزك", icon: Crosshair },
  { id: "tactics", label: "التكتيكات", icon: Swords },
];

const ACCENT: Record<NewsItem["accent"], { chip: string; bar: string; ring: string }> = {
  cyan: { chip: "bg-cyan-500/15 text-cyan-300", bar: "bg-cyan-400", ring: "hover:border-cyan-500/40" },
  amber: { chip: "bg-amber-500/15 text-amber-300", bar: "bg-amber-400", ring: "hover:border-amber-500/40" },
  violet: { chip: "bg-violet-500/15 text-violet-300", bar: "bg-violet-400", ring: "hover:border-violet-500/40" },
  emerald: { chip: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-400", ring: "hover:border-emerald-500/40" },
};

const display = { fontFamily: "Cairo, sans-serif" } as const;

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  const paragraphs = article.content.split("\n").filter((l) => l.trim());
  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-4">
        <ChevronLeft size={14} /> رجوع للقائمة
      </button>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <span className="inline-block px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 text-[11px] font-bold mb-3">
          {CATEGORY_LABELS[article.category] || article.category}
        </span>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-3" style={display}>
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Calendar size={12} />
          {new Date(article.created_at).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="space-y-4">
          {paragraphs.map((p, i) => {
            const t = p.trim();
            if (t.startsWith("## ")) {
              return (
                <h2 key={i} className="text-base font-bold text-cyan-300 mt-6 mb-2" style={display}>
                  {t.slice(3)}
                </h2>
              );
            }
            if (t.startsWith("- ") || /^\d+\.\s/.test(t)) {
              return (
                <p key={i} className="text-sm text-slate-300 leading-relaxed ps-4">
                  {t}
                </p>
              );
            }
            return (
              <p key={i} className="text-sm text-slate-300 leading-relaxed">
                {t}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewsTab({ articles, onOpen }: { articles: Article[]; onOpen: (a: Article) => void }) {
  const [openId, setOpenId] = useState<string | null>(NEWS[0]?.id ?? null);
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? articles : articles.filter((a) => a.category === filter);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        {NEWS.map((n) => {
          const a = ACCENT[n.accent];
          const open = openId === n.id;
          return (
            <article key={n.id} className={`overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition-colors ${a.ring}`}>
              <button
                onClick={() => setOpenId(open ? null : n.id)}
                aria-expanded={open}
                className="flex w-full items-start gap-4 p-4 text-right sm:p-5"
              >
                <span className={`mt-1 h-12 w-1 shrink-0 rounded-full ${a.bar}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${a.chip}`}>{n.tag}</span>
                    <span className="text-[11px] text-slate-500">{n.date}</span>
                  </span>
                  <span className="block text-base font-extrabold text-white sm:text-lg" style={display}>
                    {n.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-400">{n.summary}</span>
                </span>
                <ChevronLeft size={18} className={`mt-1 shrink-0 text-slate-500 transition-transform ${open ? "-rotate-90" : ""}`} />
              </button>
              {open && (
                <div className="border-t border-slate-800 px-5 pb-5 pt-4">
                  <ul className="space-y-2.5">
                    {n.points.map((p, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
                        <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${a.bar}`} aria-hidden />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={n.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-cyan-200"
                  >
                    المصدر: {n.source.label}
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {articles.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold text-white" style={display}>
            مقالات وشروحات
          </h2>
          <div className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1">
            {[["all", "الكل"], ...Object.entries(CATEGORY_LABELS)].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${
                  filter === key
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => onOpen(a)}
                className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-right transition-colors hover:border-slate-700 hover:bg-slate-900 sm:p-5"
              >
                <span className="mb-3 inline-block rounded-md bg-blue-500/15 px-2.5 py-1 text-[11px] font-bold text-blue-300">
                  {CATEGORY_LABELS[a.category] || a.category}
                </span>
                <h3 className="mb-2 break-words text-base font-bold text-slate-100" style={display}>
                  {a.title}
                </h3>
                <p className="line-clamp-3 break-words text-xs leading-relaxed text-slate-400">{a.excerpt}</p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <Calendar size={11} />
                  {new Date(a.created_at).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ArchetypeCard({ name, highlight }: { name: string; highlight?: boolean }) {
  const a = ARCHETYPES[name];
  if (!a) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-lg font-extrabold text-white" style={display}>
          {name}
        </h3>
      </div>
    );
  }
  return (
    <div
      className={`overflow-hidden rounded-2xl border p-5 sm:p-6 ${
        highlight ? "border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 via-slate-900/70 to-slate-900/70" : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-2xl font-extrabold text-white sm:text-3xl" style={display}>
            {a.ar}
          </h3>
          <p dir="ltr" className="mt-0.5 text-right text-sm font-bold text-cyan-300">
            {a.name}
          </p>
        </div>
        {a.inspired && <p className="text-xs text-slate-400">مستوحى من {a.inspired}</p>}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{a.pick}</p>

      <ul className="mt-5 space-y-2">
        {a.strengths.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-300">
            <Sparkles size={14} className="mt-1 shrink-0 text-amber-300" aria-hidden />
            <span>{s}</span>
          </li>
        ))}
      </ul>

      {a.playstyles.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold text-slate-400">ستايلات تناسبه</p>
          <div dir="ltr" className="flex flex-wrap justify-end gap-2">
            {a.playstyles.map((p) => (
              <span key={p} className="rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1 text-xs font-bold text-slate-200">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BuildsTab() {
  const [posId, setPosId] = useState<string>(POSITIONS[0].id);
  const pos: PositionGuide = POSITIONS.find((p) => p.id === posId) ?? POSITIONS[0];
  const [pick, setPick] = useState<string | null>(null);
  const shown = pick && (pick === pos.best || pos.alt.some((x) => x.name === pick)) ? pick : pos.best;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm text-slate-400">اختر مركزك وشوف أي أركيتايب يناسبه.</p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="المراكز">
          {POSITIONS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === pos.id}
              onClick={() => {
                setPosId(p.id);
                setPick(null);
              }}
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                p.id === pos.id
                  ? "border-cyan-400 bg-cyan-500/15 text-cyan-200"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
            >
              {p.label}
              <span dir="ltr" className="ms-2 text-[11px] font-medium text-slate-500">
                {p.short}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="text-sm leading-relaxed text-slate-200">{pos.verdict}</p>
        {pos.note && <p className="mt-3 text-xs leading-relaxed text-slate-500">{pos.note}</p>}
      </div>

      {pos.alt.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPick(pos.best)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
              shown === pos.best ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            الأفضل: {ARCHETYPES[pos.best]?.ar ?? pos.best}
          </button>
          {pos.alt.map((x) => (
            <button
              key={x.name}
              onClick={() => setPick(x.name)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${
                shown === x.name ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              بديل: {ARCHETYPES[x.name]?.ar ?? x.name}
            </button>
          ))}
        </div>
      )}

      <ArchetypeCard name={shown} highlight={shown === pos.best} />

      {shown !== pos.best && (
        <p className="text-sm leading-relaxed text-slate-400">{pos.alt.find((x) => x.name === shown)?.why}</p>
      )}
    </div>
  );
}

function Pitch({ dots }: { dots: [number, number][] }) {
  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-emerald-900/70"
      style={{
        aspectRatio: "3 / 4",
        background:
          "repeating-linear-gradient(0deg, #052e1c 0 12.5%, #063b24 12.5% 25%)",
      }}
      role="img"
      aria-label="مواقع اللاعبين على الملعب"
    >
      <div className="absolute inset-3 rounded-lg border border-emerald-200/25" />
      <div className="absolute inset-x-3 top-1/2 border-t border-emerald-200/25" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/25" />
      <div className="absolute left-1/2 top-3 h-14 w-36 -translate-x-1/2 border border-t-0 border-emerald-200/25" />
      <div className="absolute bottom-3 left-1/2 h-14 w-36 -translate-x-1/2 border border-b-0 border-emerald-200/25" />
      {dots.map(([x, y], i) => (
        <span
          key={i}
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.7)] transition-all duration-500 motion-reduce:transition-none"
          style={{ left: `${x}%`, top: `${y}%`, background: i === 0 ? "#fbbf24" : undefined }}
        />
      ))}
    </div>
  );
}

function TacticsTab() {
  const [fid, setFid] = useState(FORMATIONS[0].id);
  const f = useMemo(() => FORMATIONS.find((x) => x.id === fid) ?? FORMATIONS[0], [fid]);

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm text-slate-400">اختر التشكيلة وشوف توزيع اللاعبين وأدوارهم.</p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="التشكيلات">
          {FORMATIONS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={x.id === f.id}
              onClick={() => setFid(x.id)}
              dir="ltr"
              className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                x.id === f.id
                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
            >
              {x.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <Pitch dots={f.dots} />
        <div className="space-y-4">
          <div>
            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">{f.tag}</span>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{f.desc}</p>
          </div>
          {f.lines.map((l) => (
            <div key={l.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-1 text-sm font-extrabold text-white" style={display}>
                {l.label}
              </p>
              <p className="text-sm leading-relaxed text-slate-400">{l.roles}</p>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-white" style={display}>
          نصائح اللعب الجماعي
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEAM_TIPS.map((t) => (
            <div key={t.title} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-1 text-sm font-extrabold text-amber-300" style={display}>
                {t.title}
              </p>
              <p className="text-sm leading-relaxed text-slate-400">{t.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function NewsPage() {
  const [articles] = useState<Article[]>(() => getArticles());
  const [selected, setSelected] = useState<Article | null>(null);
  const [tab, setTab] = useState<Tab>("news");

  if (selected) return <ArticleView article={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0">
      <div className="mb-1 flex items-center gap-2">
        <Newspaper size={22} className="text-cyan-400" />
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl" style={display}>
          الأخبار والدليل
        </h1>
      </div>
      <p className="mb-6 text-sm text-slate-400">
        أخبار FC 27 وعالم The Grounds، وأفضل بناء لكل مركز، والتشكيلات.
      </p>

      <div className="mb-8 flex max-w-full gap-2 overflow-x-auto border-b border-slate-800 pb-px" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
                active ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={16} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "news" && <NewsTab articles={articles} onOpen={setSelected} />}
      {tab === "builds" && <BuildsTab />}
      {tab === "tactics" && <TacticsTab />}
    </div>
  );
}
