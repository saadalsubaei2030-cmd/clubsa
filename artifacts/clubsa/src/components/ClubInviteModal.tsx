import { Bell, Check, X } from "lucide-react";
import type { ClubInvite } from "@/types";

export default function ClubInviteModal({
  invites,
  onClose,
  onRespond,
}: {
  invites: ClubInvite[];
  onClose: () => void;
  onRespond: (inviteId: string, status: "accepted" | "declined") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-cyan-300" />
            <h2 className="text-lg font-extrabold text-white">دعوات الأندية</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white" aria-label="إغلاق">×</button>
        </div>

        {invites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-8 text-center">
            <p className="text-sm font-bold text-slate-300">لا توجد دعوات معلّقة</p>
            <p className="mt-1 text-xs text-slate-500">ستظهر هنا دعوات الانضمام الجديدة.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950">
                    {invite.club_logo ? (
                      <img src={invite.club_logo} alt={invite.club_name} className="h-full w-full object-cover" />
                    ) : (
                      <Bell size={18} className="text-cyan-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-slate-100">{invite.club_name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      دعوة من {invite.from_user_name} للانضمام إلى النادي
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onRespond(invite.id, "accepted")}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-emerald-500"
                  >
                    <Check size={14} /> قبول
                  </button>
                  <button
                    onClick={() => onRespond(invite.id, "declined")}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-extrabold text-slate-300 hover:border-red-400/50 hover:text-red-300"
                  >
                    <X size={14} /> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="mt-5 w-full rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:border-slate-500 hover:text-white">
          إغلاق
        </button>
      </div>
    </div>
  );
}