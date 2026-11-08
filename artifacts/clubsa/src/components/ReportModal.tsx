import { useState } from "react";
import { Flag, X } from "lucide-react";
import { SocialError, reportContent, socialErrorText, type ReportKind, type ReportReason } from "@/lib/social";

export type ReportTarget = { kind: ReportKind; targetRef: string; label: string };

const REASONS: { id: ReportReason; label: string }[] = [
  { id: "abuse", label: "سب أو إساءة" },
  { id: "spam", label: "إعلانات مزعجة / سبام" },
  { id: "scam", label: "نصب أو احتيال" },
  { id: "other", label: "سبب آخر" },
];

export default function ReportModal({ userId, target, onClose }: { userId: string; target: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("abuse");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await reportContent(userId, { kind: target.kind, targetRef: target.targetRef, reason, note: note.trim() });
      setDone(true);
    } catch (e) {
      if (e instanceof SocialError && e.code === "already_reported") setError("سبق وأبلغت عن هذا المحتوى، والإدارة بتراجعه.");
      else if (e instanceof SocialError && e.code === "cannot_report_self") setError("ما تقدر تبلّغ عن نفسك.");
      else if (e instanceof SocialError && e.status === 404) setError("هذا المحتوى لم يعد موجودًا.");
      else if (e instanceof SocialError && e.status === 429) setError("أبلغت عن محتوى كثير، حاول بعد شوي.");
      else setError(socialErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div role="dialog" aria-label="إبلاغ" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Flag size={15} className="text-red-300" /> إبلاغ عن {target.label}
          </h3>
          <button onClick={onClose} aria-label="إغلاق" className="text-slate-500 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>
        {done ? (
          <>
            <p className="text-sm text-emerald-300 mb-4">وصل بلاغك للإدارة وبنراجعه. شكرًا لك.</p>
            <button onClick={onClose} className="w-full py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-200">
              إغلاق
            </button>
          </>
        ) : (
          <>
            <fieldset className="space-y-1.5 mb-3">
              {REASONS.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input type="radio" name="report-reason" checked={reason === r.id} onChange={() => setReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <textarea
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="تفاصيل إضافية (اختياري)"
              rows={2}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500 mb-3"
            />
            {error && <p role="alert" className="text-xs text-red-300 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-400">
                إلغاء
              </button>
              <button disabled={busy} onClick={() => void submit()} className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">
                {busy ? "جارٍ الإرسال..." : "إرسال البلاغ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
