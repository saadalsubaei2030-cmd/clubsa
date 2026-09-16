import { useState } from "react";
import { Trophy, TrendingUp, Flame, Medal, Users, Wallet, Plus } from "lucide-react";
import { getClubs, getPlayers } from "@/lib/mockData";

type ClubStat = { id: string; name: string; region: string; wins: number; trophies: number; budget: number; logo: string | null };
type PlayerStat = { id: string; name: string; position: string | null; overall: number; region: string; balance: number };

export default function LeaderboardsPage() {
  const [tab, setTab] = useState<"clubs" | "players">("clubs");
  const [clubs] = useState<ClubStat[]>(() =>
    getClubs()
      .filter((c) => c.name?.trim() && [c.wins, c.trophies, c.budget].every(Number.isFinite))
      .map((c) => ({ id: c.id, name: c.name, region: c.region, wins: c.wins, trophies: c.trophies, budget: c.budget, logo: c.logo }))
  );
  const [players] = useState<PlayerStat[]>(() =>
    getPlayers()
      .filter((p) => p.role === "player" && p.name?.trim() && Number.isFinite(p.overall) && Number.isFinite(p.balance))
      .map((p) => ({ id: p.id, name: p.name, position: p.position, overall: p.overall, region: p.region, balance: p.balance }))
  );

  const clubStats = [
    { key: "wins", label: "أعلى سلسلة انتصارات", icon: Flame, color: "text-emerald-300", data: [...clubs].sort((a, b) => b.wins - a.wins), format: (v: number) => v + " فوز" },
    { key: "trophies", label: "الأكثر تحصيلاً للبطولات", icon: Trophy, color: "text-amber-300", data: [...clubs].sort((a, b) => b.trophies - a.trophies), format: (v: number) => v + " بطولة" },
    { key: "budget", label: "أعلى ميزانية نادي", icon: Wallet, color: "text-cyan-300", data: [...clubs].sort((a, b) => b.budget - a.budget), format: (v: number) => (v / 1_000_000).toFixed(1) + "م" },
  ];

  const playerStats = [
    { key: "overall", label: "أعلى تقييم عام", icon: Medal, color: "text-cyan-300", data: [...players].sort((a, b) => b.overall - a.overall), format: (v: number) => v + " OVR" },
    { key: "balance", label: "أعلى رصيد لاعب", icon: Wallet, color: "text-emerald-300", data: [...players].sort((a, b) => b.balance - a.balance), format: (v: number) => (v / 1000).toFixed(0) + "ك" },
  ];

  const stats = tab === "clubs" ? clubStats : playerStats;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={22} className="text-amber-400" />
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
          الإحصائيات والمتصدرون
        </h1>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-extrabold">
          <Plus size={12} strokeWidth={3} />
        </span>
      </div>
      <p className="text-slate-400 text-sm mb-6">قوائم المتصدرين في الأندية واللاعبين</p>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => setTab("clubs")} className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-sm font-bold border transition-colors ${tab === "clubs" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>
          <Trophy size={14} /> إحصائيات الأندية
        </button>
        <button onClick={() => setTab("players")} className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-sm font-bold border transition-colors ${tab === "players" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"}`}>
          <Users size={14} /> إحصائيات اللاعبين
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-4">
              <stat.icon size={16} className={stat.color} />
              <h2 className="text-sm font-bold text-slate-200">{stat.label}</h2>
            </div>
            {stat.data.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">لا توجد بيانات حالياً</p>
            ) : (
              <div className="space-y-2">
                {stat.data.map((item: any, i) => (
                  <div key={item.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-slate-800/40 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`text-xs font-extrabold ${i === 0 ? "text-amber-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-300" : "text-slate-500"}`}>
                        {i + 1}
                      </span>
                      <span className="min-w-0 truncate text-xs font-bold text-slate-200">{item.name}</span>
                    </div>
                    <span className={`shrink-0 text-xs font-bold tabular-nums ${stat.color}`}>
                      {stat.format(stat.key === "wins" ? item.wins : stat.key === "trophies" ? item.trophies : stat.key === "budget" ? item.budget : stat.key === "overall" ? item.overall : item.balance)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {tab === "players" && (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-cyan-300" />
            <h2 className="text-sm font-bold text-slate-200">إحصائيات تفصيلية</h2>
          </div>
          <p className="text-xs text-slate-500">ستتوفر إحصائيات تفصيلية (الهداف، الصناعة، المراوغة، الاعتراض، العرضيات، التصدي) بعد بدء المباريات الرسمية بين الأندية.</p>
        </div>
      )}
    </div>
  );
}
