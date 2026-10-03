import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/react";
import { useSignUp } from "@clerk/react/legacy";
import {
  getGetMyProfileQueryKey,
  useCreateMyProfile,
} from "@workspace/api-client-react";
import type { ProfileInput } from "@workspace/api-client-react";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  Shield,
  Upload,
  User,
} from "lucide-react";
import { REGIONS } from "@/data";

/* ───────────────────────── الثوابت والأنواع ───────────────────────── */

type Platform = "playstation" | "xbox" | "pc";
type Role = "president" | "player";
type PositionGroup = "attack" | "midfield" | "defense" | "goalkeeper";
type Phase = "form" | "verify" | "saving";
type FieldErrors = Record<string, string>;

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "playstation", label: "PlayStation" },
  { id: "xbox", label: "Xbox" },
  { id: "pc", label: "PC" },
];

const POSITIONS: { id: PositionGroup; label: string }[] = [
  { id: "attack", label: "هجوم" },
  { id: "midfield", label: "وسط" },
  { id: "defense", label: "دفاع" },
  { id: "goalkeeper", label: "حارس" },
];

const STEPS = [
  { n: 1, label: "الحساب" },
  { n: 2, label: "اللعبة" },
  { n: 3, label: "الدور" },
];

const GMAIL_PATTERN = /^[^\s@]+@gmail\.com$/i;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

/* ───────────────────────── رسائل الأخطاء بالعربية ───────────────────────── */

function clerkErrorText(error: unknown): string {
  const first = (error as { errors?: { code?: string }[] } | null)?.errors?.[0];
  switch (first?.code) {
    case "form_identifier_exists":
      return "هذا البريد الإلكتروني مسجّل مسبقًا. جرّب تسجيل الدخول.";
    case "form_password_pwned":
      return "كلمة المرور هذه ظهرت في تسريبات سابقة. اختر كلمة مرور أقوى.";
    case "form_password_length_too_short":
      return "كلمة المرور قصيرة جدًا.";
    case "form_password_not_strong_enough":
      return "كلمة المرور ضعيفة. أضف أحرفًا وأرقامًا ورموزًا.";
    case "form_param_format_invalid":
    case "form_param_nil":
      return "بعض البيانات غير صحيحة. راجع الحقول وحاول مرة أخرى.";
    case "form_code_incorrect":
      return "رمز التحقق غير صحيح.";
    case "verification_expired":
      return "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.";
    case "verification_failed":
      return "فشل التحقق. اطلب رمزًا جديدًا.";
    case "too_many_requests":
      return "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
    default:
      return "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }
}

type ProfileFailure = "username" | "exists" | "other";

function classifyProfileError(error: unknown): { kind: ProfileFailure; message: string } {
  const message = (error as { data?: { error?: unknown } } | null)?.data?.error;
  if (message === "Username already taken") {
    return { kind: "username", message: "اسم المستخدم هذا مستخدم بالفعل. اختر اسمًا آخر." };
  }
  if (message === "Profile already exists") {
    return { kind: "exists", message: "" };
  }
  if (message === "Only approved email domains can register") {
    return { kind: "other", message: "نطاق البريد الإلكتروني هذا غير مدعوم للتسجيل." };
  }
  if (message === "Club not found") {
    return { kind: "other", message: "لم نعثر على النادي بهذا الاسم." };
  }
  return {
    kind: "other",
    message: "تعذّر حفظ ملفك الشخصي. تحقق من الاتصال وحاول مرة أخرى.",
  };
}

/* ───────────────────────── أدوات مساعدة ───────────────────────── */

function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode"));
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("canvas"));
          return;
        }
        const side = Math.min(image.width, image.height);
        const sx = (image.width - side) / 2;
        const sy = (image.height - side) / 2;
        context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/png"));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ───────────────────────── مكونات العرض ───────────────────────── */

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-300">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
          <AlertCircle size={12} className="shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function Stepper({ step, verifying }: { step: number; verifying: boolean }) {
  return (
    <ol className="mb-8 flex items-center" aria-label="خطوات التسجيل">
      {STEPS.map((item, index) => {
        const done = verifying || item.n < step;
        const current = !verifying && item.n === step;
        return (
          <li key={item.n} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-current={current ? "step" : undefined}
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-extrabold transition-all ${
                  done
                    ? "border-cyan-500 bg-cyan-600 text-white"
                    : current
                      ? "border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_-4px_rgba(34,211,238,0.6)]"
                      : "border-slate-700 bg-slate-900 text-slate-500"
                }`}
              >
                {done ? <Check size={16} /> : item.n}
              </div>
              <span className={`text-[11px] font-bold ${current || done ? "text-slate-200" : "text-slate-500"}`}>
                {item.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-2 mb-5 h-px flex-1 transition-colors ${
                  verifying || item.n < step ? "bg-cyan-500/70" : "bg-slate-800"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  disabledId,
  columns = 4,
}: {
  options: { id: T; label: string }[];
  value: T | "";
  onChange: (id: T) => void;
  disabledId?: string;
  columns?: 3 | 4 | 5;
}) {
  const cols = columns === 3 ? "grid-cols-3" : columns === 5 ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-4";
  return (
    <div role="radiogroup" className={`grid gap-2 ${cols}`}>
      {options.map((option) => {
        const selected = value === option.id;
        const disabled = disabledId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
              selected
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-200"
                : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function RoleCard({
  selected,
  title,
  description,
  icon,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-right transition-all ${
        selected
          ? "border-cyan-400 bg-gradient-to-br from-cyan-500/15 to-blue-600/10 shadow-[0_0_40px_-12px_rgba(34,211,238,0.55)]"
          : "border-slate-800 bg-slate-900 hover:border-slate-600"
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
          selected ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-400 group-hover:text-slate-200"
        }`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-base font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
      </span>
      {selected && (
        <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-slate-950">
          <Check size={12} />
        </span>
      )}
    </button>
  );
}

/* ───────────────────────── الصفحة الرئيسية ───────────────────────── */

export default function SignUpWizard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { isSignedIn } = useClerkAuth();
  const { isLoaded, signUp, setActive } = useSignUp();
  const createProfile = useCreateMyProfile();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // الخطوة 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  // الخطوة 2
  const [eaId, setEaId] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [region, setRegion] = useState<string>("");
  // الخطوة 3
  const [role, setRole] = useState<Role | "">("");
  const [clubName, setClubName] = useState("");
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [clubDescription, setClubDescription] = useState("");
  const [primaryPosition, setPrimaryPosition] = useState<PositionGroup | "">("");
  const [secondaryPosition, setSecondaryPosition] = useState<PositionGroup | "none" | "">("");
  // التحقق من البريد
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // عندما تُنشأ الجلسة ولا ينجح حفظ الملف، نعيد المحاولة بدون إنشاء حساب جديد
  const sessionReady = useRef<{ userId: string | null } | null>(null);
  const flowStarted = useRef(false);

  const referralCode = new URLSearchParams(window.location.search).get("ref");

  useEffect(() => {
    if (isSignedIn && !flowStarted.current) setLocation("/");
  }, [isSignedIn, setLocation]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  /* ── التحقق من المدخلات لكل خطوة ── */

  const validateStep1 = (): FieldErrors => {
    const next: FieldErrors = {};
    const mail = email.trim();
    if (!mail) next.email = "أدخل بريدك الإلكتروني.";
    else if (!GMAIL_PATTERN.test(mail)) next.email = "يجب أن ينتهي البريد الإلكتروني بـ @gmail.com فقط.";
    if (password.length < 8) next.password = "كلمة المرور يجب ألا تقل عن 8 أحرف.";
    if (confirm !== password) next.confirm = "كلمتا المرور غير متطابقتين.";
    const name = fullName.trim();
    if (name.length < 2) next.fullName = "أدخل اسمك الكامل (حرفان على الأقل).";
    else if (name.length > 60) next.fullName = "الاسم طويل جدًا (60 حرفًا كحد أقصى).";
    if (!USERNAME_PATTERN.test(username.trim())) {
      next.username = "اسم المستخدم من 3 إلى 24 حرفًا: إنجليزية وأرقام وشرطة سفلية فقط.";
    }
    return next;
  };

  const validateStep2 = (): FieldErrors => {
    const next: FieldErrors = {};
    const id = eaId.trim();
    if (id.length < 3) next.eaId = "معرّف EA ID إلزامي (3 أحرف على الأقل).";
    else if (id.length > 32) next.eaId = "معرّف EA ID طويل جدًا (32 حرفًا كحد أقصى).";
    if (!platform) next.platform = "اختر منصة اللعب.";
    if (!region) next.region = "اختر منطقتك.";
    return next;
  };

  const validateStep3 = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!role) {
      next.role = "اختر دورك للمتابعة.";
      return next;
    }
    if (role === "president") {
      const name = clubName.trim();
      if (name.length < 2) next.clubName = "أدخل اسم النادي (حرفان على الأقل).";
      else if (name.length > 60) next.clubName = "اسم النادي طويل جدًا (60 حرفًا كحد أقصى).";
    } else {
      if (!primaryPosition) next.primaryPosition = "اختر مركزك الأساسي.";
      if (secondaryPosition && secondaryPosition !== "none" && secondaryPosition === primaryPosition) {
        next.secondaryPosition = "يجب أن يختلف المركز الثانوي عن الأساسي.";
      }
    }
    return next;
  };

  const goNext = () => {
    setBanner("");
    const found = step === 1 ? validateStep1() : validateStep2();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep((current) => (current === 1 ? 2 : 3));
  };

  const goBack = () => {
    setBanner("");
    setErrors({});
    setStep((current) => (current === 3 ? 2 : 1));
  };

  /* ── حفظ الملف الشخصي بعد تفعيل الجلسة ── */

  const saveExtras = (userId: string | null) => {
    if (!userId) return;
    try {
      window.localStorage.setItem(
        `clubsa:signup-extras:${userId}`,
        JSON.stringify({
          platform,
          primaryPosition: role === "player" ? primaryPosition : null,
          secondaryPosition: role === "player" && secondaryPosition !== "none" ? secondaryPosition || null : null,
          clubDescription: role === "president" ? clubDescription.trim() : null,
          clubLogo: role === "president" ? clubLogo : null,
        }),
      );
    } catch {
      // التخزين المحلي غير متاح؛ هذه البيانات إضافية ولا تمنع التسجيل.
    }
  };

  const saveProfile = async (userId: string | null) => {
    setPhase("saving");
    setBanner("");
    const data: ProfileInput = {
      username: username.trim(),
      name: fullName.trim(),
      role: role === "president" ? "president" : "player",
      region,
      eaId: eaId.trim(),
      isFreeAgent: role === "player",
      clubName: role === "president" ? clubName.trim() : null,
      referralCode: referralCode ? referralCode.trim().slice(0, 32) : null,
    };
    try {
      await createProfile.mutateAsync({ data });
      saveExtras(userId);
    } catch (error) {
      const failure = classifyProfileError(error);
      if (failure.kind !== "exists") {
        setPhase("form");
        if (failure.kind === "username") {
          setStep(1);
          setErrors({ username: failure.message });
        } else {
          setBanner(failure.message);
        }
        return;
      }
    }
    await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    setLocation("/");
  };

  type SetActiveFn = NonNullable<ReturnType<typeof useSignUp>["setActive"]>;

  const finishSignUp = async (activate: SetActiveFn, sessionId: string | null, userId: string | null) => {
    flowStarted.current = true;
    await activate({ session: sessionId });
    sessionReady.current = { userId };
    await saveProfile(userId);
  };

  /* ── إنشاء الحساب (نهاية الخطوة 3) ── */

  const handleCreate = async () => {
    setBanner("");
    const found = validateStep3();
    setErrors(found);
    if (Object.keys(found).length > 0 || busy) return;

    // الجلسة جاهزة من محاولة سابقة: نعيد حفظ الملف فقط
    if (sessionReady.current) {
      setBusy(true);
      await saveProfile(sessionReady.current.userId);
      setBusy(false);
      return;
    }

    if (!isLoaded || !signUp || !setActive) return;
    setBusy(true);
    try {
      let current = await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
      });

      // بعض إعدادات Clerk تطلب حقولًا إضافية؛ نعبئها من بياناتنا
      const missing: string[] = current.missingFields;
      const patch: { firstName?: string; lastName?: string; username?: string } = {};
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      if (missing.includes("first_name")) patch.firstName = firstName;
      if (missing.includes("last_name")) patch.lastName = rest.join(" ") || firstName;
      if (missing.includes("username")) patch.username = username.trim();
      if (Object.keys(patch).length > 0) current = await signUp.update(patch);

      if (current.status === "complete") {
        await finishSignUp(setActive, current.createdSessionId, current.createdUserId);
        return;
      }

      const unverified: string[] = current.unverifiedFields;
      if (unverified.includes("email_address")) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setCode("");
        setResendIn(30);
        setPhase("verify");
        return;
      }

      setBanner("تعذّر إكمال التسجيل. راجع بياناتك وحاول مرة أخرى.");
    } catch (error) {
      setBanner(clerkErrorText(error));
    } finally {
      setBusy(false);
    }
  };

  /* ── التحقق من البريد ── */

  const handleVerify = async () => {
    setBanner("");
    if (!isLoaded || !signUp || !setActive || busy) return;
    if (code.trim().length < 6) {
      setErrors({ code: "أدخل رمز التحقق المكوّن من 6 أرقام." });
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete") {
        await finishSignUp(setActive, result.createdSessionId, result.createdUserId);
      } else {
        setBanner("تعذّر إكمال التحقق. حاول مرة أخرى.");
      }
    } catch (error) {
      setBanner(clerkErrorText(error));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!isLoaded || !signUp || resendIn > 0) return;
    setBanner("");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendIn(30);
    } catch (error) {
      setBanner(clerkErrorText(error));
    }
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      setErrors((current) => ({ ...current, clubLogo: "اختر صورة بحجم أقل من 3 ميغابايت." }));
      return;
    }
    try {
      setClubLogo(await readLogo(file));
      clearError("clubLogo");
    } catch {
      setErrors((current) => ({ ...current, clubLogo: "تعذّرت قراءة الصورة. جرّب صورة أخرى." }));
    }
  };

  /* ───────────────────────── العرض ───────────────────────── */

  const verifying = phase === "verify";
  const saving = phase === "saving";

  const titles: Record<number, { title: string; subtitle: string }> = {
    1: { title: "أنشئ حسابك", subtitle: "ابدأ ببياناتك الأساسية للانضمام إلى مجتمع CLUBSA." },
    2: { title: "معلومات اللعبة", subtitle: "نحتاج معرّفك ومنصتك حتى يجدك اللاعبون والأندية." },
    3: { title: "اختر دورك", subtitle: "حدّد كيف ستستخدم المنصة، ويمكنك التطوير لاحقًا." },
  };
  const header = verifying
    ? { title: "تأكيد البريد الإلكتروني", subtitle: `أرسلنا رمزًا مكوّنًا من 6 أرقام إلى ${email.trim()}.` }
    : saving
      ? { title: "جارٍ تجهيز ملفك", subtitle: "لحظات ونكمل إعداد حسابك." }
      : titles[step];

  return (
    <div
      dir="rtl"
      className="relative min-h-[100dvh] overflow-hidden bg-slate-950 px-4 py-8 text-slate-100 sm:py-12"
      style={{ fontFamily: "Tajawal, sans-serif" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgba(6,182,212,0.20),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_100%_100%,rgba(37,99,235,0.14),transparent_70%)]"
      />

      <div className="relative mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-base font-extrabold text-slate-950">
            S
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
            CLUBSA
          </span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur sm:p-8">
          <Stepper step={step} verifying={verifying || saving} />

          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>
              {header.title}
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-400">{header.subtitle}</p>
          </div>

          {banner && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
              <span className="leading-6">{banner}</span>
            </div>
          )}

          {saving ? (
            <div className="flex flex-col items-center gap-3 py-10 text-slate-400" role="status">
              <Loader2 size={30} className="animate-spin text-cyan-400" />
              <p className="text-sm">جارٍ حفظ ملفك الشخصي...</p>
            </div>
          ) : verifying ? (
            <div className="space-y-5">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                  <MailCheck size={26} />
                </div>
              </div>
              <Field id="verify-code" label="رمز التحقق" error={errors.code}>
                <input
                  id="verify-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    clearError("code");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleVerify();
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  placeholder="000000"
                  className={`${inputClass} text-center text-lg tracking-[0.5em]`}
                />
              </Field>
              <button type="button" onClick={() => void handleVerify()} disabled={busy} className={`${primaryButton} w-full`}>
                {busy && <Loader2 size={15} className="animate-spin" />}
                تأكيد وإنشاء الحساب
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => void handleResend()}
                  disabled={resendIn > 0}
                  className="font-bold text-cyan-400 transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:text-slate-600"
                >
                  {resendIn > 0 ? `إعادة الإرسال بعد ${resendIn} ثانية` : "إعادة إرسال الرمز"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("form");
                    setStep(1);
                    setBanner("");
                    setErrors({});
                  }}
                  className="text-slate-400 transition-colors hover:text-slate-200"
                >
                  تغيير البريد الإلكتروني
                </button>
              </div>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                if (step < 3) goNext();
                else void handleCreate();
              }}
              className="space-y-5"
            >
              {step === 1 && (
                <>
                  <Field id="su-email" label="البريد الإلكتروني" error={errors.email} hint="يُقبل بريد Gmail فقط.">
                    <input
                      id="su-email"
                      type="email"
                      value={email}
                      onChange={(event) => { setEmail(event.target.value); clearError("email"); }}
                      autoComplete="email"
                      dir="ltr"
                      maxLength={254}
                      placeholder="name@gmail.com"
                      className={`${inputClass} text-left`}
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="su-password" label="كلمة المرور" error={errors.password} hint="8 أحرف على الأقل.">
                      <div className="relative">
                        <input
                          id="su-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => { setPassword(event.target.value); clearError("password"); }}
                          autoComplete="new-password"
                          dir="ltr"
                          className={`${inputClass} pl-10 text-left`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <Field id="su-confirm" label="تأكيد كلمة المرور" error={errors.confirm}>
                      <input
                        id="su-confirm"
                        type={showPassword ? "text" : "password"}
                        value={confirm}
                        onChange={(event) => { setConfirm(event.target.value); clearError("confirm"); }}
                        autoComplete="new-password"
                        dir="ltr"
                        className={`${inputClass} text-left`}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="su-name" label="الاسم الكامل" error={errors.fullName}>
                      <input
                        id="su-name"
                        value={fullName}
                        onChange={(event) => { setFullName(event.target.value); clearError("fullName"); }}
                        autoComplete="name"
                        maxLength={60}
                        placeholder="اكتب اسمك"
                        className={inputClass}
                      />
                    </Field>
                    <Field id="su-username" label="اسم المستخدم" error={errors.username} hint="يظهر في ملفك العام.">
                      <input
                        id="su-username"
                        value={username}
                        onChange={(event) => { setUsername(event.target.value); clearError("username"); }}
                        autoComplete="username"
                        dir="ltr"
                        maxLength={24}
                        placeholder="striker_23"
                        className={`${inputClass} text-left`}
                      />
                    </Field>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <Field id="su-ea" label="معرّف EA ID" error={errors.eaId} hint="إلزامي، ويظهر في بطاقة ملفك.">
                    <input
                      id="su-ea"
                      value={eaId}
                      onChange={(event) => { setEaId(event.target.value); clearError("eaId"); }}
                      dir="ltr"
                      maxLength={32}
                      placeholder="EA_PLAYER_10"
                      className={`${inputClass} text-left`}
                    />
                  </Field>
                  <div>
                    <span className="mb-1.5 block text-xs font-bold text-slate-300">منصة اللعب</span>
                    <ChipGroup
                      options={PLATFORMS}
                      value={platform}
                      columns={3}
                      onChange={(id) => { setPlatform(id); clearError("platform"); }}
                    />
                    {errors.platform && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
                        <AlertCircle size={12} /> {errors.platform}
                      </p>
                    )}
                  </div>
                  <Field id="su-region" label="المنطقة" error={errors.region}>
                    <select
                      id="su-region"
                      value={region}
                      onChange={(event) => { setRegion(event.target.value); clearError("region"); }}
                      className={inputClass}
                    >
                      <option value="">اختر منطقتك</option>
                      {REGIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </Field>
                </>
              )}

              {step === 3 && (
                <>
                  <div role="radiogroup" aria-label="اختيار الدور" className="grid gap-3 sm:grid-cols-2">
                    <RoleCard
                      selected={role === "president"}
                      title="رئيس نادي"
                      description="أنشئ ناديك، أدر التشكيلة، واستقطب اللاعبين."
                      icon={<Shield size={22} />}
                      onSelect={() => { setRole("president"); clearError("role"); }}
                    />
                    <RoleCard
                      selected={role === "player"}
                      title="لاعب"
                      description="أنشئ ملفك، حدّد مراكزك، وانضم إلى نادٍ يناسبك."
                      icon={<User size={22} />}
                      onSelect={() => { setRole("player"); clearError("role"); }}
                    />
                  </div>
                  {errors.role && (
                    <p className="flex items-center gap-1.5 text-xs text-red-400" role="alert">
                      <AlertCircle size={12} /> {errors.role}
                    </p>
                  )}

                  {role === "president" && (
                    <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                      <Field id="su-club" label="اسم النادي" error={errors.clubName}>
                        <input
                          id="su-club"
                          value={clubName}
                          onChange={(event) => { setClubName(event.target.value); clearError("clubName"); }}
                          maxLength={60}
                          placeholder="اكتب اسم ناديك"
                          className={inputClass}
                        />
                      </Field>
                      <div>
                        <span className="mb-1.5 block text-xs font-bold text-slate-300">شعار النادي (اختياري)</span>
                        <div className="flex items-center gap-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-700 bg-slate-800/50 text-slate-500">
                            {clubLogo ? (
                              <img src={clubLogo} alt="معاينة شعار النادي" className="h-full w-full object-cover" />
                            ) : (
                              <Shield size={22} />
                            )}
                          </div>
                          <label className={`${secondaryButton} cursor-pointer`}>
                            <Upload size={15} />
                            {clubLogo ? "تغيير الشعار" : "رفع شعار"}
                            <input type="file" accept="image/*" onChange={(event) => void handleLogo(event)} className="sr-only" />
                          </label>
                          {clubLogo && (
                            <button type="button" onClick={() => setClubLogo(null)} className="text-xs text-slate-400 hover:text-red-300">
                              إزالة
                            </button>
                          )}
                        </div>
                        {errors.clubLogo && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
                            <AlertCircle size={12} /> {errors.clubLogo}
                          </p>
                        )}
                      </div>
                      <Field id="su-desc" label="وصف مبدئي (اختياري)" hint={`${clubDescription.length}/200`}>
                        <textarea
                          id="su-desc"
                          value={clubDescription}
                          onChange={(event) => setClubDescription(event.target.value.slice(0, 200))}
                          rows={3}
                          placeholder="عرّف لاعبيك بناديك وأهدافه..."
                          className={`${inputClass} resize-none`}
                        />
                      </Field>
                    </div>
                  )}

                  {role === "player" && (
                    <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                      <div>
                        <span className="mb-1.5 block text-xs font-bold text-slate-300">المركز الأساسي</span>
                        <ChipGroup
                          options={POSITIONS}
                          value={primaryPosition}
                          onChange={(id) => {
                            setPrimaryPosition(id);
                            if (secondaryPosition === id) setSecondaryPosition("");
                            clearError("primaryPosition");
                          }}
                        />
                        {errors.primaryPosition && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
                            <AlertCircle size={12} /> {errors.primaryPosition}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="mb-1.5 block text-xs font-bold text-slate-300">المركز الثانوي (اختياري)</span>
                        <ChipGroup
                          columns={5}
                          options={[...POSITIONS, { id: "none" as const, label: "بدون" }]}
                          value={secondaryPosition}
                          disabledId={primaryPosition}
                          onChange={(id) => { setSecondaryPosition(id); clearError("secondaryPosition"); }}
                        />
                        {errors.secondaryPosition && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
                            <AlertCircle size={12} /> {errors.secondaryPosition}
                          </p>
                        )}
                      </div>
                      <p className="text-[11px] leading-5 text-slate-500">
                        ستُسجَّل كلاعب حر، ويمكنك الانضمام إلى نادٍ لاحقًا عبر الدعوات وسوق الانتقالات.
                      </p>
                    </div>
                  )}

                  <div id="clerk-captcha" />
                </>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <button type="button" onClick={goBack} disabled={busy} className={secondaryButton}>
                    <ChevronRight size={16} />
                    رجوع
                  </button>
                ) : (
                  <span />
                )}
                {step < 3 ? (
                  <button type="submit" className={primaryButton}>
                    التالي
                    <ChevronLeft size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={busy || !isLoaded} className={primaryButton}>
                    {busy && <Loader2 size={15} className="animate-spin" />}
                    إنشاء الحساب
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          لديك حساب؟{" "}
          <Link href="/sign-in" className="font-bold text-cyan-400 hover:text-cyan-300">
            تسجيل الدخول
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            العودة إلى الموقع
          </Link>
        </p>
      </div>
    </div>
  );
}
