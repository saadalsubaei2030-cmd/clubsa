import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { NotificationTarget } from "@/lib/social";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "الآن";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  return `قبل ${Math.floor(hours / 24)} يوم`;
}

export default function NotificationBell({
  userId,
  onNavigate,
}: {
  userId: string;
  onNavigate: (target: NotificationTarget) => void;
}) {
  const { items, unread, markRead, clear, refresh } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => {
          setOpen((value) => !value);
          void refresh();
        }}
        aria-label={unread ? `الإشعارات (${unread} جديد)` : "الإشعارات"}
        aria-expanded={open}
        className="relative rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-cyan-300"
        title="الإشعارات"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="الإشعارات"
          className="fixed inset-x-4 top-14 z-50 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
            <span className="text-sm font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
              الإشعارات
            </span>
            {items.length > 0 && (
              <span className="flex items-center gap-3 text-[11px]">
                {unread > 0 && (
                  <button onClick={() => void markRead()} className="text-cyan-400 hover:text-cyan-300">
                    تعليم الكل كمقروء
                  </button>
                )}
                <button onClick={() => void clear()} className="text-slate-500 hover:text-red-300">
                  مسح الكل
                </button>
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">ما عندك إشعارات حاليًا</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) void markRead([n.id]);
                    setOpen(false);
                    if (n.target) onNavigate(n.target);
                  }}
                  className={`flex w-full items-start gap-2.5 border-b border-slate-800/60 px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-800/60 ${
                    n.read ? "" : "bg-cyan-500/5"
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-cyan-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${n.read ? "text-slate-300" : "font-bold text-white"}`}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}
                    <span className="mt-1 block text-[10px] text-slate-600">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
