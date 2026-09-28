import { Crown, Search, Shield, UserPlus, UserRound } from "lucide-react";
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

export default function ClubRosterSection({
  clubId,
  viewer,
  onOpenInvitePlayer,
}: {
  clubId: string;
  viewer?: AuthUser | null;
  onOpenInvitePlayer?: () => void;
}) {
  const club = getClubById(clubId);
  if (!club) return null;

  const members = getClubPlayers(club.id).filter((member) => member.name.trim());
  const canManageInvites =
    viewer?.clubId === club.id &&
    (viewer.role === "president" || viewer.role === "scout");
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
    <section className="mt-5 rounded-2xl border border-cyan-500/20 bg-[#0B0E14] p-5 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-900">
            {club.logo ? (
              <img src={club.logo} alt={club.name} className="h-full w-full object-cover" />
            ) : (
              <Shield size={27} className="text-cyan-300" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-cyan-300">النادي · My Club</p>
            <h2 className="mt-1 truncate text-xl font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
              {club.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{club.region} · {members.length} أعضاء</p>
          </div>
        </div>
        {canManageInvites && onOpenInvitePlayer && (
          <button
            type="button"
            onClick={onOpenInvitePlayer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-cyan-400"
          >
            <UserPlus size={17} /> دعوة لاعب إلى النادي
          </button>
        )}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound size={17} className="text-cyan-300" />
            <div>
              <h3 className="text-base font-extrabold text-white">قائمة أعضاء النادي والرتب</h3>
              <p className="mt-0.5 text-xs text-slate-500">صور وأسماء وEA ID وصلاحية كل عضو</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-extrabold text-slate-300">{members.length}</span>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center">
            <UserRound size={24} className="mx-auto text-slate-600" />
            <p className="mt-2 text-sm font-bold text-slate-300">لا يوجد أعضاء في النادي بعد</p>
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
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
      </div>
    </section>
  );
}