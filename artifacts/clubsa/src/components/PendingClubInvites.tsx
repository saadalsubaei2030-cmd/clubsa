import { Bell, Check, Shield, X } from "lucide-react";
import type { ClubInvite } from "@/types";

export default function PendingClubInvites({
  invites,
  onRespond,
}: {
  invites: ClubInvite[];
  onRespond: (inviteId: string, status: "accepted" | "declined") => void;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell size={18} className="text-cyan-300" />
        <div>
          <h2 className="text-lg font-extrabold text-white">دعوات الانضمام إلى الأندية</h2>
          <p className="mt-0.5 text-xs text-slate-500">راجع الدعوات الواردة واختر النادي المناسب لك.</p>
        </div>
        {invites.length > 0 && (
          <span className="mr-auto rounded-full bg-cyan-500/15 px-2 py-1 text-[11px] font-extrabold text-cyan-300">
            {invites.length}
          </span>
        )}
      </div>

      {invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-5 text-center">
          <p className="text-sm font-bold text-slate-300">لا توجد دعوات معلّقة</p>
          <p className="mt-1 text-xs text-slate-500">ستظهر هنا أي دعوة جديدة من مدير نادٍ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950/45 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-cyan-300">
                  {invite.club_logo ? (
                    <img src={invite.club_logo} alt={invite.club_name} className="h-full w-full object-cover" />
                  ) : (
                    <Shield size={18} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-100">{invite.club_name}</p>
                  <p className="mt-1 truncate text-xs text-slate-400">دعوة من {invite.from_user_name} للانضمام إلى النادي</p>
                </div>
              </div>
              <div className="flex gap-2 sm:w-48">
                <button
                  type="button"
                  onClick={() => onRespond(invite.id, "accepted")}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-emerald-500"
                >
                  <Check size={14} /> قبول
                </button>
                <button
                  type="button"
                  onClick={() => onRespond(invite.id, "declined")}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-extrabold text-slate-300 transition-colors hover:border-red-400/50 hover:text-red-300"
                >
                  <X size={14} /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}