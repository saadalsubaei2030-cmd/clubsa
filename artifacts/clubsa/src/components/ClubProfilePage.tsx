import { ChevronLeft, Crown, Shield, Trophy, UserRound, UserPlus, Wallet } from "lucide-react";
import { POSITION_LABELS } from "@/data";
import { formatBalance } from "@/lib/formatters";
import { getClubById, getClubPlayers, getProfile } from "@/lib/mockData";
import ClubSquadBuilder from "@/components/ClubSquadBuilder";
import type { AuthUser } from "@/types";

export default function ClubProfilePage({
  clubId,
  onBack,
  viewer,
  onOpenInvitePlayer,
}: {
  clubId: string;
  onBack: () => void;
  viewer?: AuthUser | null;
  onOpenInvitePlayer?: () => void;
}) {
  const club = getClubById(clubId);
  if (!club) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="font-bold text-slate-300">النادي غير موجود</p>
        <button onClick={onBack} className="mt-4 text-sm font-bold text-cyan-300">العودة</button>
      </div>
    );
  }

  const captain = getProfile(club.president_id);
  const players = getClubPlayers(club.id);

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
        <ChevronLeft size={16} /> العودة
      </button>

      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-blue-950/50 p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-blue-400/50 bg-slate-800">
            {club.logo ? <img src={club.logo} alt={club.name} className="h-full w-full object-cover" /> : <Shield size={38} className="text-slate-500" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-blue-300">ملف النادي</p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "Cairo, sans-serif" }}>{club.name}</h1>
            <p className="mt-1 text-sm text-slate-400">{club.region}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <p className="text-[11px] text-slate-400">الميزانية المتبقية</p>
              <p className="mt-1 flex items-center gap-1.5 text-xl font-extrabold text-amber-300"><Wallet size={17} /> {formatBalance(club.budget)}</p>
            </div>
            {viewer?.id === club.president_id && viewer.role === "president" && onOpenInvitePlayer && (
              <button
                type="button"
                onClick={onOpenInvitePlayer}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <UserPlus size={17} /> دعوة لاعب
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["الفوز", club.wins, "text-emerald-300"], ["التعادل", club.draws, "text-slate-200"], ["الخسارة", club.losses, "text-red-300"], ["البطولات", club.trophies, "text-amber-300"]].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-xl bg-slate-950/40 px-3 py-2 text-center">
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className={`text-lg font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Crown size={18} className="text-amber-300" />
          <h2 className="text-lg font-extrabold text-white">الكابتن والمؤسس</h2>
        </div>
        {captain ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
              {captain.avatar ? <img src={captain.avatar} alt={captain.name} className="h-full w-full object-cover" /> : <UserRound size={20} className="text-slate-500" />}
            </div>
            <div><p className="font-bold text-slate-100">{captain.name}</p><p className="text-xs text-amber-300">كابتن الفريق · مؤسس النادي</p></div>
          </div>
        ) : <p className="text-sm text-slate-500">لا توجد بيانات الكابتن حالياً</p>}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-cyan-300" />
          <h2 className="text-lg font-extrabold text-white">قائمة اللاعبين</h2>
          <span className="text-xs text-slate-500">({players.length})</span>
        </div>
        {players.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 py-8 text-center text-sm font-bold text-slate-400">لا توجد بيانات لاعبين حالياً</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-cyan-300">
                  {player.avatar ? <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" /> : <UserRound size={18} />}
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-100">{player.name}</p><p className="text-xs text-slate-500">{player.position ? POSITION_LABELS[player.position] || player.position : "المركز غير محدد"}</p></div>
                <span className="text-lg font-extrabold text-cyan-300">{player.overall || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {viewer?.clubId === club.id && viewer.role === "president" && (
        <section className="mt-5">
          <ClubSquadBuilder clubId={club.id} />
        </section>
      )}
    </div>
  );
}