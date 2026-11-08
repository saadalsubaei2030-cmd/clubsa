import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { SocialError, requestNewRecoveryCode } from "@/lib/social";
import { RecoveryCodeScreen } from "@/components/PasswordRecovery";

/** إصدار كود استرجاع جديد (للحسابات القديمة أو عند ضياع الكود). يتطلب كلمة المرور. */
export default function AccountSecurityCard({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await requestNewRecoveryCode(userId, password);
      setCode(result.recoveryCode);
      setPassword("");
    } catch (e) {
      setError(
        e instanceof SocialError && e.code === "invalid_login"
          ? "كلمة المرور غير صحيحة."
          : e instanceof SocialError && e.status === 429
            ? "محاولات كثيرة. حاول لاحقًا."
            : "تعذّر إصدار الكود. تأكد من الاتصال وسجّل الدخول من جديد إن استمر الخطأ.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold text-white">
        <KeyRound size={15} className="text-amber-300" /> أمان الحساب
      </h3>
      {code ? (
        <div className="mt-3">
          <RecoveryCodeScreen
            code={code}
            intro="هذا كود الاسترجاع الجديد، وأُلغي أي كود سابق. احفظه الآن، يظهر هذه المرة فقط."
            doneLabel="حفظته"
            onDone={() => {
              setCode(null);
              setOpen(false);
            }}
          />
        </div>
      ) : !open ? (
        <>
          <p className="mb-3 text-xs leading-relaxed text-slate-400">كود الاسترجاع يرجّع لك حسابك إذا نسيت كلمة المرور. أصدر كودًا جديدًا إذا ضاع عليك أو ما عندك كود.</p>
          <button onClick={() => setOpen(true)} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-slate-700">
            إصدار كود استرجاع جديد
          </button>
        </>
      ) : (
        <div className="mt-2 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="اكتب كلمة المرور للتأكيد"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
          />
          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void submit()}
              disabled={busy || password.length < 4}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {busy && <Loader2 size={13} className="animate-spin" />} إصدار الكود
            </button>
            <button onClick={() => { setOpen(false); setPassword(""); setError(""); }} className="rounded-lg bg-slate-800 px-4 text-xs text-slate-400 hover:text-slate-200">
              إلغاء
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
