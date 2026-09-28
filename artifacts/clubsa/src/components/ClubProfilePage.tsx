import { ChevronLeft, Crown, Search, Shield, UserPlus, UserRound } from "lucide-react";
import { getClubById, getClubPlayers } from "@/lib/mockData";
import { ROLE_LABELS } from "@/data";
import type { AuthUser } from "@/types";

function roleLabel(role: AuthUser["role"]) {
  return ROLE_LABELS[role] || ROLE_LABELS.player;
}

function roleBadgeClass(role: AuthUser["role"]) {
  if (role === "president") return "border-blue-400/30 bg-blue-500/15 text-blue-200";
  if (role === "scout") return "border-amber-400/30 bg-amber-500/15 text-amber-200";
  return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
}

function metricValue(player: ReturnType<typeof getClubPlayers>[number], key: string) {
  return player.player_build?.stats?.[key] ?? player.overall ?? 0;
}

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

  const members = getClubPlayers(club.id).filter((member) => member.name.trim());
  const canManageInvites = viewer?.clubId === club.id && (viewer.role === "president" || viewer.role === "scout");
  const regularPlayers = members.filter((member) => member.role === "player");
  const topStats = [
    { label: "أكثر تسجيلاً", icon: "⚽", key: "SHO", color: "text-rose-300", border: "border-rose-400/20", background: "bg-rose-500/10" },
    { label: "أكثر تمريراً", icon: "✦", key: "PAS", color: "text-cyan-300", border: "border-cyan-400/20", background: "bg-cyan-500/10" },
    { label: "أكثر مراوغة", icon: "◈", key: "DRI", color: "text-amber-300", border: "border-amber-400/20", background: "bg-amber-500/10" },
  ].map((stat) => ({
    ...stat,
    player: regularPlayers.length
      ? [...regularPlayers].sort((a, b) => metricValue(b, stat.key) - metricValue(a, stat.key))[0]
      : null,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition-colors hover:text-white">
        <ChevronLeft size={16} /> العودة
      </button>

      <section className="rounded-3xl border border-slate-800 bg-[#0B0E14] p-5 shadow-2xl shadow-slate-950/30 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-cyan-400/40 bg-slate-900">
            {club.logo ? (
              <img src={club.logo} alt={club.name} className="h-full w-full object-cover" />
            ) : (
              <Shield size={38} className="text-cyan-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-cyan-300">صفحة النادي</p>
            <h1 className="mt-1 truncate text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "Cairo, sans-serif" }}>
              {club.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{club.region} · {members.length} أعضاء</p>
          </div>
          {canManageInvites && onOpenInvitePlayer && (
            <button
              type="button"
              onClick={onOpenInvitePlayer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              <UserPlus size={17} /> دعوة لاعب
            </button>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-800 bg-[#0B0E14] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound size={18} className="text-cyan-300" />
            <div>
              <h2 className="text-lg font-extrabold text-white">أعضاء النادي</h2>
              <p className="mt-0.5 text-xs text-slate-500">صور وأسماء وEA ID ورتبة كل عضو</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-slate-300">{members.length}</span>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center">
            <UserRound size={26} className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm font-bold text-slate-300">لا يوجد أعضاء في النادي بعد</p>
            {canManageInvites && <p className="mt-1 text-xs text-slate-500">استخدم زر دعوة لاعب لإضافة أول عضو.</p>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3 transition-colors hover:border-slate-700">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-cyan-300">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-100">{member.name}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{member.ea_id || "EA ID غير محدد"}</p>
                </div>
                <span className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-extrabold ${roleBadgeClass(member.role)}`}>
                  {member.role === "president" && <Crown size={11} className="ml-1 inline-block" />}
                  {member.role === "scout" && <Search size={11} className="ml-1 inline-block" />}
                  {roleLabel(member.role)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        {topStats.map((stat) => (
          <div key={stat.key} className={`rounded-2xl border ${stat.border} ${stat.background} p-4`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-extrabold ${stat.color}`}>{stat.label}</span>
              <span className="text-lg">{stat.icon}</span>
            </div>
            <p className="mt-4 truncate text-sm font-extrabold text-white">{stat.player?.name || "—"}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {stat.player ? `${metricValue(stat.player, stat.key)} نقطة` : "لا توجد بيانات بعد"}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}