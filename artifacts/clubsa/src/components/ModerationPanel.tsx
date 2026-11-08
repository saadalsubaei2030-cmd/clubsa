import { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  fetchReports,
  fetchSanctions,
  liftSanction,
  resolveReport,
  socialErrorText,
  type ActiveSanction,
  type ModerationReport,
  type ResolveAction,
} from "@/lib/social";

const REASON_LABEL: Record<string, string> = { abuse: "إساءة", spam: "سبام", scam: "نصب", other: "آخر" };
const KIND_LABEL: Record<string, string> = { chat_message: "رسالة في الدردشة", recruit_post: "إعلان", user: "حساب" };

const ACTIONS: { id: ResolveAction; label: string; tone: string }[] = [
  { id: "dismiss", label: "لا مخالفة", tone: "bg-slate-800 text-slate-300" },
  { id: "delete", label: "حذف المحتوى", tone: "bg-slate-800 text-amber-300" },
  { id: "mute1h", label: "حذف + كتم ساعة", tone: "bg-amber-700/60 text-amber-100" },
  { id: "mute24h", label: "حذف + كتم يوم", tone: "bg-amber-700/60 text-amber-100" },
  { id: "mute7d", label: "حذف + كتم أسبوع", tone: "bg-orange-700/60 text-orange-100" },
  { id: "ban", label: "حظر دائم", tone: "bg-red-700/70 text-red-100" },
];

function untilText(until: string | null): string {
  return until ? `حتى ${new Date(until).toLocaleString("ar-SA")}` : "دائم";
}

/** لوحة المشرف: البلاغات المفتوحة والعقوبات السارية. تظهر فقط لمن إيميله في ADMIN_EMAILS. */
export default function ModerationPanel({ userId }: { userId: string }) {
  const [reports, setReports] = useState<ModerationReport[] | null>(null);
  const [sanctions, setSanctions] = useState<ActiveSanction[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | string | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([fetchReports(userId), fetchSanctions(userId)]);
      setReports(r.reports);
      setSanctions(s.sanctions);
      setError("");
    } catch (e) {
      setError(socialErrorText(e));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (id: number, action: ResolveAction) => {
    if (action === "ban" && !window.confirm("متأكد من الحظر الدائم لهذا الحساب؟")) return;
    setBusy(id);
    try {
      await resolveReport(userId, id, action);
      await load();
    } catch (e) {
      setError(socialErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const lift = async (targetId: string) => {
    setBusy(targetId);
    try {
      await liftSanction(userId, targetId);
      await load();
    } catch (e) {
      setError(socialErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-2xl border border-red-900/50 bg-slate-900/60 p-4 mb-4" aria-label="لوحة الإشراف">
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-red-200">
          <ShieldAlert size={16} /> لوحة الإشراف {reports ? `(${reports.length} بلاغ مفتوح)` : ""}
        </h2>
        <button onClick={() => void load()} className="text-[11px] text-slate-400 hover:text-slate-200">
          تحديث
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300 mb-2">{error}</p>}
      {reports && reports.length === 0 && <p className="text-xs text-slate-400">لا توجد بلاغات مفتوحة.</p>}
      <ul className="space-y-3">
        {reports?.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs">
            <p className="text-slate-300">
              <b className="text-red-300">{KIND_LABEL[r.kind] ?? r.kind}</b> من <b>{r.target.name}</b> — السبب: {REASON_LABEL[r.reason] ?? r.reason}
              {r.targetOpenReports > 1 && <span className="text-amber-300"> ({r.targetOpenReports} بلاغات على هذا الحساب)</span>}
            </p>
            {r.excerpt && <p className="mt-1 rounded bg-slate-900 px-2 py-1 text-slate-200 break-words">{r.excerpt}</p>}
            {r.note && <p className="mt-1 text-slate-400">ملاحظة المبلّغ ({r.reporter.name}): {r.note}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ACTIONS.filter((a) => r.kind !== "user" || a.id !== "delete").map((a) => (
                <button
                  key={a.id}
                  disabled={busy === r.id}
                  onClick={() => void resolve(r.id, a.id)}
                  className={`rounded-md px-2 py-1 font-bold disabled:opacity-50 ${a.tone}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {sanctions.length > 0 && (
        <div className="mt-4 border-t border-slate-800 pt-3">
          <h3 className="text-xs font-bold text-slate-300 mb-2">العقوبات السارية</h3>
          <ul className="space-y-1.5">
            {sanctions.map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>
                  {s.name} — {s.kind === "ban" ? "حظر" : "كتم"} ({untilText(s.until)})
                </span>
                <button disabled={busy === s.userId} onClick={() => void lift(s.userId)} className="rounded-md bg-slate-800 px-2 py-1 font-bold text-emerald-300 disabled:opacity-50">
                  رفع العقوبة
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
