import { Search, Send, Shield, X } from "lucide-react";
import { useInviteSearch } from "@/hooks/useInviteSearch";
import type { AuthUser } from "@/types";

export default function InvitePlayerModal({
  auth,
  onClose,
  onInviteSent,
}: {
  auth: AuthUser;
  onClose: () => void;
  onInviteSent: () => void;
}) {
  const { query, updateQuery, results: candidates, searching, message, busyId, invite } = useInviteSearch(auth, onInviteSent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-[#0B0E14] p-5 shadow-2xl shadow-cyan-950/30"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
              <Send size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-cyan-300">إدارة النادي</p>
              <h2 className="mt-0.5 text-lg font-extrabold text-white">دعوة لاعب إلى النادي</h2>
              <p className="mt-1 text-xs text-slate-500">ابحث باستخدام اسم اللاعب أو Username أو EA ID</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative">
          <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="اكتب EA ID أو Username..."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pr-10 pl-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-400"
          />
        </div>

        {query.trim() && (
          <div className="mt-3 space-y-2">
            {searching ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">جاري البحث...</p>
            ) : candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 px-3 py-6 text-center">
                <p className="text-sm font-bold text-slate-300">لم يتم العثور على لاعب</p>
                <p className="mt-1 text-xs text-slate-500">تأكد من كتابة EA ID أو Username بشكل صحيح.</p>
              </div>
            ) : (
              candidates.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 text-cyan-300">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="h-full w-full object-cover" />
                    ) : (
                      <Shield size={17} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-100">{player.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      @{player.username || "player"} · {player.eaId || "EA ID غير محدد"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void invite(player)}
                    disabled={busyId === player.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-extrabold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
                  >
                    <Send size={13} /> دعوة
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {message && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-xs font-bold ${
              message.ok ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}