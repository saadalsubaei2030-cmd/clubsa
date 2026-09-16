import { useState } from "react";
import { Newspaper, ChevronLeft, Calendar } from "lucide-react";
import { getArticles } from "@/lib/mockData";
import type { Article } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  tactics: "تكتيكات",
  guide: "أدلة",
  news: "أخبار",
};

export default function NewsPage() {
  const [articles] = useState<Article[]>(() => getArticles());
  const [selected, setSelected] = useState<Article | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? articles : articles.filter((a) => a.category === filter);

  if (selected) {
    const paragraphs = selected.content.split("\n").filter((l) => l.trim());
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-4">
          <ChevronLeft size={14} /> رجوع للقائمة
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <span className="inline-block px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 text-[11px] font-bold mb-3">
            {CATEGORY_LABELS[selected.category] || selected.category}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mb-3" style={{ fontFamily: "Cairo, sans-serif" }}>
            {selected.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
            <Calendar size={12} />
            {new Date(selected.created_at).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" })}
          </div>

          <div className="space-y-4">
            {paragraphs.map((p, i) => {
              const trimmed = p.trim();
              if (trimmed.startsWith("## ")) {
                return <h2 key={i} className="text-base font-bold text-cyan-300 mt-6 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>{trimmed.slice(3)}</h2>;
              }
              if (trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
                return <p key={i} className="text-sm text-slate-300 leading-relaxed ps-4">{trimmed}</p>;
              }
              return <p key={i} className="text-sm text-slate-300 leading-relaxed">{trimmed}</p>;
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Newspaper size={22} className="text-cyan-400" />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
          الأخبار والدليل
        </h1>
      </div>
      <p className="text-slate-400 text-sm mb-6">مقالات وشروحات حول EA FC Pro Clubs وتكتيكات اللعب</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filter === "all" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>
          الكل
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filter === key ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper size={28} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">لا توجد مقالات حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelected(a)} className="text-right rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 hover:bg-slate-900 transition-all">
              <span className="inline-block px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 text-[11px] font-bold mb-3">
                {CATEGORY_LABELS[a.category] || a.category}
              </span>
              <h2 className="text-base font-bold text-slate-100 mb-2" style={{ fontFamily: "Cairo, sans-serif" }}>{a.title}</h2>
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{a.excerpt}</p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-3">
                <Calendar size={11} />
                {new Date(a.created_at).toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
