import { useState } from "react";
import { Trophy, MessageCircle, Gift } from "lucide-react";
import { REGIONS, TOURNAMENTS } from "@/data";
import type { TeamStanding, Match } from "@/types";

function EmptyState({ icon: Icon, text, subtext }: { icon: typeof Trophy; text: string; subtext?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 py-10 px-4 text-center">
      <Icon size={28} className="mx-auto text-slate-600 mb-3" />
      <p className="text-sm font-bold text-slate-300">{text}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}

function StandingsTable({ teams, region }: { teams: TeamStanding[]; region: string }) {
  if (!teams.length) {
    return (
      <EmptyState
        icon={Trophy}
        text={`لا توجد أندية مسجلة حالياً في ${region} — كن أول المسجلين!`}
        subtext="بمجرد تسجيل الأندية سيظهر جدول الترتيب هنا تلقائيًا."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs">
            <th className="px-3 py-2 text-right font-bold">#</th>
            <th className="px-3 py-2 text-right font-bold">النادي</th>
            <th className="px-3 py-2 font-bold">لعب</th>
            <th className="px-3 py-2 font-bold">فوز</th>
            <th className="px-3 py-2 font-bold">تعادل</th>
            <th className="px-3 py-2 font-bold">خسارة</th>
            <th className="px-3 py-2 font-bold">ف.أ</th>
            <th className="px-3 py-2 font-bold">نقاط</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.name} className={`text-center ${i % 2 ? "bg-slate-900/40" : "bg-slate-900/10"} ${i === 0 ? "border-r-2 border-emerald-400" : ""}`}>
              <td className="px-3 py-2 text-right text-slate-400">{i + 1}</td>
              <td className="px-3 py-2 text-right font-bold text-slate-100">{t.name}</td>
              <td className="px-3 py-2 text-slate-300 tabular-nums">{t.p}</td>
              <td className="px-3 py-2 text-emerald-300 tabular-nums">{t.w}</td>
              <td className="px-3 py-2 text-slate-300 tabular-nums">{t.d}</td>
              <td className="px-3 py-2 text-red-300 tabular-nums">{t.l}</td>
              <td className="px-3 py-2 text-slate-300 tabular-nums">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
              <td className="px-3 py-2 font-extrabold text-cyan-300 tabular-nums">{t.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchesList({ matches }: { matches: Match[] }) {
  if (!matches.length) {
    return (
      <EmptyState
        icon={MessageCircle}
        text="لا توجد مباريات مجدولة حالياً"
        subtext="ستظهر المباريات هنا بمجرد جدولتها بين الأندية المسجلة."
      />
    );
  }

  return (
    <div className="space-y-2">
      {matches.map((m, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 flex-1 justify-end">
            <span>{m.home}</span>
          </div>
          <div className="px-4 text-center">
            {m.score ? (
              <span className="text-lg font-extrabold text-cyan-300 tabular-nums">{m.score}</span>
            ) : (
              <span className="text-xs text-slate-500">VS</span>
            )}
            <div className="text-[10px] text-slate-500 mt-0.5">{m.date} · {m.time}</div>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100 flex-1">
            <span>{m.away}</span>
          </div>
          <span className={`ms-3 shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
            m.status === "انتهت" ? "bg-slate-800 text-slate-400" : "bg-blue-500/15 text-blue-300"
          }`}>{m.status}</span>
        </div>
      ))}
    </div>
  );
}

export default function TournamentsPage() {
  const [region, setRegion] = useState(REGIONS[0]);
  const data = TOURNAMENTS[region];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1" style={{ fontFamily: "Cairo, sans-serif" }}>
        بطولات مناطق السعودية
      </h1>
      <p className="text-slate-400 text-sm mb-6">دوريات إقليمية بين أندية Pro Clubs في كل منطقة</p>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
          <Gift size={20} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-200">جوائز مالية حقيقية</p>
          <p className="text-xs text-amber-300/80 mt-0.5">الفوز بالبطولات يمنح جوائز مالية حقيقية يتم تحديدها وتوزيعها مع كل بطولة</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {REGIONS.map((r) => (
          <button key={r} onClick={() => setRegion(r)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              r === region ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}>
            <Trophy size={14} /> {r}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div>
          <h2 className="text-sm font-bold text-slate-300 mb-2">جدول الترتيب</h2>
          <StandingsTable teams={data.teams} region={region} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-300 mb-2">المباريات</h2>
          <MatchesList matches={data.matches} />
        </div>
      </div>
    </div>
  );
}
