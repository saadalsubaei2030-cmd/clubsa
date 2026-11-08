import { useState, type ReactNode } from "react";
import { AlertCircle, Check, ChevronLeft, Copy, KeyRound, Loader2, Mail } from "lucide-react";
import { SocialError, forgotPassword, resetPasswordWithCode, resetPasswordWithToken } from "@/lib/social";
import { validateLoginEmail } from "@/lib/emailValidation";

const display = { fontFamily: "Cairo, sans-serif" } as const;
const MIN_PASSWORD = 8;

const inputClass =
  "w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500";

function recoveryErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.code === "invalid_recovery") return "الإيميل أو كود الاسترجاع غير صحيح.";
    if (error.code === "invalid_token") return "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.";
    if (error.code === "weak_password") return `كلمة المرور الجديدة لا تقل عن ${MIN_PASSWORD} أحرف.`;
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}

function ErrorLine({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div role="alert" className="mt-3 flex items-center gap-1.5 text-red-400">
      <AlertCircle size={12} className="shrink-0" />
      <span className="text-xs">{text}</span>
    </div>
  );
}

function PrimaryButton({ disabled, busy, onClick, children }: { disabled?: boolean; busy?: boolean; onClick: () => void; children: ReactNode }) {
  const off = disabled || busy;
  return (
    <button
      disabled={off}
      onClick={onClick}
      className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors ${
        off ? "cursor-not-allowed bg-slate-800 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-500"
      }`}
    >
      {busy && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/** يعرض كود الاسترجاع مرة واحدة ويطلب من المستخدم تأكيد حفظه. */
export function RecoveryCodeScreen({
  code,
  onDone,
  doneLabel = "حفظت الكود، متابعة",
  intro,
}: {
  code: string;
  onDone: () => void;
  doneLabel?: string;
  intro?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* النسخ غير متاح: المستخدم ينسخه يدويًا */
    }
  };

  return (
    <>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
        <KeyRound size={18} className="text-amber-300" />
      </div>
      <h2 className="mb-1 text-lg font-extrabold text-white" style={display}>
        كود استرجاع حسابك
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        {intro ?? "احفظ هذا الكود في مكان آمن (لقطة شاشة أو ملاحظات). تحتاجه لاسترجاع حسابك إذا نسيت كلمة المرور. يظهر هذه المرة فقط."}
      </p>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-slate-950/60 px-4 py-3">
        <span dir="ltr" className="select-all font-mono text-base font-bold tracking-wider text-amber-200">
          {code}
        </span>
        <button onClick={copy} aria-label="نسخ الكود" className="shrink-0 rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white">
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
      <label className="mt-4 flex cursor-pointer select-none items-center gap-2">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 accent-cyan-500" />
        <span className="text-xs text-slate-300">حفظت الكود في مكان آمن</span>
      </label>
      <PrimaryButton disabled={!saved} onClick={onDone}>
        {doneLabel}
      </PrimaryButton>
    </>
  );
}

type View = "menu" | "email" | "code" | "token" | "done";

export default function PasswordRecovery({
  initialToken,
  initialEmail,
  onBackToLogin,
}: {
  initialToken?: string | null;
  initialEmail?: string;
  onBackToLogin: (email?: string) => void;
}) {
  const [view, setView] = useState<View>(initialToken ? "token" : "menu");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const emailError = validateLoginEmail(email);
  const passwordOk = newPassword.length >= MIN_PASSWORD;

  const back = () => {
    setError("");
    setSent(false);
    setView("menu");
  };

  const sendEmail = async () => {
    setBusy(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(recoveryErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await resetPasswordWithCode(email.trim(), recoveryCode, newPassword);
      setNewCode(result.recoveryCode);
    } catch (e) {
      setError(recoveryErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submitToken = async () => {
    if (!initialToken) return;
    setBusy(true);
    setError("");
    try {
      await resetPasswordWithToken(initialToken, newPassword);
      setView("done");
    } catch (e) {
      setError(recoveryErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  // بعد الاسترجاع بالكود يصدر كود جديد ويجب أن يحفظه المستخدم قبل المتابعة.
  if (newCode) {
    return (
      <RecoveryCodeScreen
        code={newCode}
        intro="تم تغيير كلمة المرور. كودك القديم أُلغي، وهذا كودك الجديد. احفظه الآن، يظهر هذه المرة فقط."
        doneLabel="حفظته، تسجيل الدخول"
        onDone={() => onBackToLogin(email.trim())}
      />
    );
  }

  if (view === "done") {
    return (
      <>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
          <Check size={18} className="text-emerald-400" />
        </div>
        <h2 className="mb-1 text-lg font-extrabold text-white" style={display}>
          تم تغيير كلمة المرور
        </h2>
        <p className="text-xs leading-relaxed text-slate-400">سجّل دخولك بكلمة المرور الجديدة. أُغلقت جلساتك على الأجهزة الأخرى.</p>
        <PrimaryButton onClick={() => onBackToLogin()}>تسجيل الدخول</PrimaryButton>
      </>
    );
  }

  return (
    <>
      {view !== "menu" && view !== "token" && (
        <button onClick={back} className="mb-3 flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-200">
          <ChevronLeft size={14} />
          رجوع
        </button>
      )}

      {view === "menu" && (
        <>
          <h2 className="mb-1 text-lg font-extrabold text-white" style={display}>
            استرجاع كلمة المرور
          </h2>
          <p className="mb-5 text-xs text-slate-400">اختر الطريقة المناسبة لك.</p>
          <div className="space-y-2.5">
            <button
              onClick={() => setView("email")}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-start hover:border-cyan-500"
            >
              <Mail size={18} className="shrink-0 text-cyan-300" />
              <span>
                <span className="block text-sm font-bold text-white">رابط على الإيميل</span>
                <span className="block text-[11px] text-slate-400">نرسل لك رابطًا صالحًا 30 دقيقة.</span>
              </span>
            </button>
            <button
              onClick={() => setView("code")}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-start hover:border-cyan-500"
            >
              <KeyRound size={18} className="shrink-0 text-amber-300" />
              <span>
                <span className="block text-sm font-bold text-white">عندي كود الاسترجاع</span>
                <span className="block text-[11px] text-slate-400">الكود الذي ظهر لك عند التسجيل.</span>
              </span>
            </button>
          </div>
          <button onClick={() => onBackToLogin()} className="mt-4 w-full text-xs text-cyan-400 hover:text-cyan-300">
            رجوع لتسجيل الدخول
          </button>
        </>
      )}

      {view === "email" && (
        <>
          <h2 className="mb-1 text-lg font-extrabold text-white" style={display}>
            رابط الاسترجاع
          </h2>
          {sent ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                إذا كان هذا الإيميل مسجلًا لدينا فسيصلك رابط الاسترجاع خلال دقائق. تفقّد صندوق الوارد وقسم الرسائل غير المرغوبة (Spam).
              </p>
              <p className="mt-2 text-xs text-slate-500">ما وصلك شيء؟ جرّب الاسترجاع بكود الاسترجاع بدلًا من ذلك.</p>
              <PrimaryButton onClick={() => onBackToLogin()}>رجوع لتسجيل الدخول</PrimaryButton>
            </>
          ) : (
            <>
              <p className="mb-4 text-xs text-slate-400">اكتب إيميل حسابك وسنرسل لك رابطًا لتعيين كلمة مرور جديدة.</p>
              <input
                type="email"
                value={email}
                maxLength={254}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className={inputClass}
              />
              <ErrorLine text={error} />
              <PrimaryButton disabled={emailError !== ""} busy={busy} onClick={() => void sendEmail()}>
                أرسل الرابط
              </PrimaryButton>
            </>
          )}
        </>
      )}

      {view === "code" && (
        <>
          <h2 className="mb-1 text-lg font-extrabold text-white" style={display}>
            الاسترجاع بالكود
          </h2>
          <p className="mb-4 text-xs text-slate-400">اكتب إيميل حسابك وكود الاسترجاع وكلمة المرور الجديدة.</p>
          <div className="space-y-3">
            <input type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="الإيميل" className={inputClass} />
            <input
              dir="ltr"
              value={recoveryCode}
              maxLength={24}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className={`${inputClass} font-mono tracking-wider`}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={`كلمة المرور الجديدة (${MIN_PASSWORD} أحرف على الأقل)`}
              className={inputClass}
            />
          </div>
          <ErrorLine text={error} />
          <PrimaryButton
            disabled={emailError !== "" || recoveryCode.replace(/[^a-zA-Z0-9]/g, "").length !== 16 || !passwordOk}
            busy={busy}
            onClick={() => void submitCode()}
          >
            تغيير كلمة المرور
          </PrimaryButton>
        </>
      )}

      {view === "token" && (
        <>
          <h2 className="mb-1 text-lg font-extrabold text-white" style={display}>
            كلمة مرور جديدة
          </h2>
          <p className="mb-4 text-xs text-slate-400">اكتب كلمة المرور الجديدة لحسابك.</p>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`كلمة المرور الجديدة (${MIN_PASSWORD} أحرف على الأقل)`}
            className={inputClass}
          />
          <ErrorLine text={error} />
          <PrimaryButton disabled={!passwordOk} busy={busy} onClick={() => void submitToken()}>
            حفظ كلمة المرور
          </PrimaryButton>
        </>
      )}
    </>
  );
}
