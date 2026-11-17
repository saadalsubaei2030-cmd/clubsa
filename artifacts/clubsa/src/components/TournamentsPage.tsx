import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Plus, Trophy, X } from "lucide-react";
import { DISCORD_URL } from "@/data";
import {
  cancelTournament,
  createTournament,
  fetchDiscordLinkUrl,
  fetchEligibility,
  fetchTournament,
  fetchTournaments,
  registerForTournament,
  socialErrorText,
  startTournament,
  submitMatchResult,
  withdrawFromTournament,
  type BracketMatch,
  type Eligibility,
  type PrizeKind,
  type TournamentDetail,
  type TournamentStatus,
  type TournamentSummary,
} from "@/lib/social";
import type { AuthUser } from "@/types";

const display = { fontFamily: "Cairo, sans-serif" } as const;

const STATUS_LABEL: Record<TournamentStatus, { text: string; tone: string }> = {
  open: { text: "التسجيل مفتوح", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  running: { text: "جارية", tone: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" },
  finished: { text: "انتهت", tone: "border-slate-600 bg-slate-800 text-slate-300" },
  cancelled: { text: "ملغاة", tone: "border-red-500/30 bg-red-500/10 text-red-300" },
};

const PRIZE_LABEL: Record<PrizeKind, string> = { free: "مجانية", cash: "جائزة نقدية", other: "جائزة" };

function roundName(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "النهائي";
  if (fromEnd === 1) return "نصف النهائي";
  if (fromEnd === 2) return "ربع النهائي";
  return `دور الـ${2 ** (fromEnd + 1)}`;
}

function PrizeBadge({ kind, text }: { kind: PrizeKind; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-300">
      <Gift size={12} /> {kind === "free" ? (text ? `مجانية · ${text}` : "بطولة مجانية") : `${PRIZE_LABEL[kind]}: ${text}`}
    </span>
  );
}

export default function TournamentsPage({ auth, onRequireLogin }: { auth: AuthUser | null; onRequireLogin: () => void }) {
  const [list, setList] = useState<TournamentSummary[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  // نتيجة العودة من ديسكورد: ‎?discord=linked|taken|failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("discord");
    if (!result) return;
    setNotice(
      result === "linked"
        ? "تم ربط حساب ديسكورد بنجاح ✅"
        : result === "taken"
          ? "حساب الديسكورد هذا مربوط بحساب آخر في الموقع."
          : "تعذّر ربط ديسكورد. حاول مرة أخرى.",
    );
    params.delete("discord");
    params.delete("tab");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchTournaments(controller.signal)
      .then((data) => {
        setList(data.tournaments);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setList((current) => current ?? []);
          setError(socialErrorText(e));
        }
      });
    return () => controller.abort();
  }, [reload]);

  const userId = auth?.id ?? null;
  useEffect(() => {
    setElig(null);
    if (!userId) return;
    let cancelled = false;
    fetchEligibility(userId)
      .then((data) => !cancelled && setElig(data))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId, reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const linkDiscord = async () => {
    if (!userId) return onRequireLogin();
    try {
      const { url } = await fetchDiscordLinkUrl(userId);
      window.location.href = url;
    } catch (e) {
      setNotice(socialErrorText(e));
    }
  };

  if (selected !== null) {
    return (
      <TournamentView
        id={selected}
        auth={auth}
        elig={elig}
        onBack={() => {
          setSelected(null);
          refresh();
        }}
        onRequireLogin={onRequireLogin}
        onLinkDiscord={linkDiscord}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl" style={display}>
            البطولات
          </h1>
          <p className="mt-1 text-sm text-slate-400">بطولات أندية CLUBSA. التسجيل لرؤساء الأندية فقط، مع ربط حساب ديسكورد.</p>
        </div>
        {elig?.admin && (
          <button onClick={() => setCreating(true)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">
            <Plus size={14} /> بطولة جديدة
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-200">
          {notice}
        </p>
      )}

      {auth && elig && !elig.discordLinked && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
          <p className="text-xs text-indigo-100">للتسجيل في أي بطولة لازم تربط حساب ديسكورد، عشان نتواصل معك ومع خصمك.</p>
          <button onClick={() => void linkDiscord()} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">
            ربط حساب ديسكورد
          </button>
        </div>
      )}
      {auth && elig?.discordLinked && (
        <p className="mb-4 text-xs text-emerald-300">
          <Check size={12} className="me-1 inline" /> حسابك مربوط بديسكورد ({elig.discordName})
        </p>
      )}

      {error && <p role="alert" className="mb-3 text-xs text-red-300">{error}</p>}

      {list === null ? (
        <p className="py-10 text-center text-sm text-slate-500">جارٍ التحميل...</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center">
          <Trophy size={28} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-bold text-slate-300">ما فيه بطولات حاليًا</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">أول بطولة قريبًا. انضم لسيرفر الديسكورد عشان توصلك الأخبار أول بأول.</p>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500">
            انضم لديسكورد
          </a>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((t) => (
            <button key={t.id} onClick={() => setSelected(t.id)} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-start hover:border-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_LABEL[t.status].tone}`}>{STATUS_LABEL[t.status].text}</span>
                <span className="text-[11px] text-slate-500">
                  {t.entries}/{t.maxTeams} نادي
                </span>
              </div>
              <p className="text-base font-extrabold text-white" style={display}>{t.title}</p>
              <PrizeBadge kind={t.prizeKind} text={t.prizeText} />
            </button>
          ))}
        </div>
      )}

      {creating && userId && (
        <CreateModal
          userId={userId}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            refresh();
            setSelected(id);
          }}
        />
      )}
    </div>
  );
}

/* ───────────── إنشاء بطولة (مشرف) ───────────── */

function CreateModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: (id: number) => void }) {
  const [title, setTitle] = useState("");
  const [rules, setRules] = useState("");
  const [prizeKind, setPrizeKind] = useState<PrizeKind>("free");
  const [prizeText, setPrizeText] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [startsAt, setStartsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const field = "w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500";

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const { id } = await createTournament(userId, {
        title, rules, prizeKind, prizeText, maxTeams,
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      });
      onCreated(id);
    } catch (e) {
      setError(socialErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-label="بطولة جديدة" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">بطولة جديدة</h3>
          <button onClick={onClose} aria-label="إغلاق" className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
        </div>
        <label className="block text-xs text-slate-400">
          اسم البطولة
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={field} />
        </label>
        <label className="block text-xs text-slate-400">
          الشروط والقوانين
          <textarea value={rules} maxLength={2000} rows={5} onChange={(e) => setRules(e.target.value)} placeholder="مثال: رئيس النادي يسجّل، مدة الشوط 6 دقايق، الغياب 15 دقيقة = خسارة..." className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-slate-400">
            الجائزة
            <select value={prizeKind} onChange={(e) => setPrizeKind(e.target.value as PrizeKind)} className={field}>
              <option value="free">مجانية (بدون جائزة مالية)</option>
              <option value="cash">جائزة نقدية</option>
              <option value="other">جائزة أخرى</option>
            </select>
          </label>
          <label className="block text-xs text-slate-400">
            عدد الأندية
            <select value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} className={field}>
              {[4, 8, 16].map((n) => <option key={n} value={n}>{n} أندية</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs text-slate-400">
          {prizeKind === "free" ? "ملاحظة عن الجائزة (اختياري، مثل: كأس رمزي)" : "وصف الجائزة (مثل: 500 ريال للبطل)"}
          <input value={prizeText} maxLength={200} onChange={(e) => setPrizeText(e.target.value)} className={field} />
        </label>
        <label className="block text-xs text-slate-400">
          موعد البداية (اختياري)
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
        </label>
        {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
        <button disabled={busy} onClick={() => void submit()} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50">
          {busy ? "جارٍ الإنشاء..." : "إنشاء البطولة"}
        </button>
      </div>
    </div>
  );
}

/* ───────────── تفاصيل بطولة ───────────── */

function TournamentView({
  id, auth, elig, onBack, onRequireLogin, onLinkDiscord,
}: {
  id: number;
  auth: AuthUser | null;
  elig: Eligibility | null;
  onBack: () => void;
  onRequireLogin: () => void;
  onLinkDiscord: () => Promise<void>;
}) {
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const userId = auth?.id ?? null;

  useEffect(() => {
    const controller = new AbortController();
    fetchTournament(id, userId, controller.signal)
      .then((d) => setData(d))
      .catch((e) => !controller.signal.aborted && setError(socialErrorText(e)));
    return () => controller.abort();
  }, [id, userId, reload]);

  const run = async (action: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError("");
    try {
      await action();
      setReload((n) => n + 1);
    } catch (e) {
      setError(socialErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl">
        <button onClick={onBack} className="mb-4 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"><ArrowRight size={14} /> كل البطولات</button>
        <p className="py-10 text-center text-sm text-slate-500">{error || "جارٍ التحميل..."}</p>
      </div>
    );
  }

  const t = data.tournament;
  const mine = data.entries.some((e) => e.mine);
  const admin = !!elig?.admin;
  const rounds = Array.from({ length: data.rounds }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-5xl">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"><ArrowRight size={14} /> كل البطولات</button>
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${STATUS_LABEL[t.status].tone}`}>{STATUS_LABEL[t.status].text}</span>
          <PrizeBadge kind={t.prizeKind} text={t.prizeText} />
          <span className="text-[11px] text-slate-500">{data.entries.length}/{t.maxTeams} نادي</span>
          {t.startsAt && <span className="text-[11px] text-slate-500">البداية: {new Date(t.startsAt).toLocaleString("ar-SA")}</span>}
        </div>
        <h1 className="text-2xl font-extrabold text-white" style={display}>{t.title}</h1>
        {t.winner && <p className="text-sm font-bold text-amber-300"><Trophy size={14} className="me-1 inline" /> البطل: {t.winner.name}</p>}
      </div>

      {t.rules && (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-bold text-slate-200">الشروط والقوانين</h2>
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">{t.rules}</p>
        </section>
      )}

      {error && <p role="alert" className="mb-3 text-xs text-red-300">{error}</p>}

      {t.status === "open" && (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-bold text-slate-200">التسجيل</h2>
          {!auth ? (
            <button onClick={onRequireLogin} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">سجّل الدخول للتسجيل</button>
          ) : !elig ? (
            <p className="text-xs text-slate-500">جارٍ التحقق...</p>
          ) : (
            <>
              <ul className="mb-3 space-y-1 text-xs">
                <Req ok={elig.hasClub} text="أنت في نادي" />
                <Req ok={elig.isPresident} text="أنت رئيس النادي" />
                <Req ok={elig.discordLinked} text="حسابك مربوط بديسكورد" />
              </ul>
              <div className="flex flex-wrap gap-2">
                {!elig.discordLinked && (
                  <button onClick={() => void onLinkDiscord()} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">ربط ديسكورد</button>
                )}
                {mine ? (
                  <button disabled={busy} onClick={() => void run(() => withdrawFromTournament(auth.id, id), "تنسحب من البطولة؟")} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-red-300 hover:bg-slate-700 disabled:opacity-50">
                    انسحاب من البطولة
                  </button>
                ) : (
                  <button
                    disabled={busy || !elig.isPresident || !elig.discordLinked || data.entries.length >= t.maxTeams}
                    onClick={() => void run(() => registerForTournament(auth.id, id))}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {data.entries.length >= t.maxTeams ? "اكتملت المقاعد" : `سجّل ${elig.clubName ?? "ناديك"}`}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {admin && (t.status === "open" || t.status === "running") && (
        <section className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-red-900/50 bg-slate-900/60 p-4">
          <span className="text-xs font-bold text-red-200">أدوات المشرف:</span>
          {t.status === "open" && (
            <button disabled={busy} onClick={() => void run(() => startTournament(auth!.id, id), "تبدأ البطولة وتُسحب القرعة؟ ينغلق التسجيل ولا يرجع.")} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              بدء البطولة وسحب القرعة
            </button>
          )}
          <button disabled={busy} onClick={() => void run(() => cancelTournament(auth!.id, id), "إلغاء البطولة؟")} className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-bold text-red-300 disabled:opacity-50">إلغاء البطولة</button>
        </section>
      )}

      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-2 text-sm font-bold text-slate-200">الأندية المسجلة ({data.entries.length})</h2>
        {data.entries.length === 0 ? (
          <p className="text-xs text-slate-500">ما سجّل أحد بعد.</p>
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {data.entries.map((e) => (
              <li key={e.clubId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/50 px-3 py-2 text-xs">
                <span className={`font-bold ${e.mine ? "text-cyan-300" : "text-slate-200"}`}>{e.clubName}</span>
                {e.discordName && <span className="text-[11px] text-indigo-300">Discord: {e.discordName}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {rounds.length > 0 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-bold text-slate-200">شجرة البطولة</h2>
          <div className="grid gap-4 md:grid-flow-col md:auto-cols-fr">
            {rounds.map((round) => (
              <div key={round} className="space-y-2">
                <h3 className="text-[11px] font-bold text-cyan-300">{roundName(round, data.rounds)}</h3>
                {data.matches.filter((m) => m.round === round).map((m) => (
                  <MatchCard key={m.id} match={m} admin={admin && t.status === "running"} busy={busy} onResult={(a, b) => run(() => submitMatchResult(auth!.id, id, m.id, a, b))} />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={ok ? "text-emerald-300" : "text-slate-400"}>
      {ok ? <Check size={12} className="me-1 inline" /> : <X size={12} className="me-1 inline" />}
      {text}
    </li>
  );
}

function MatchCard({ match, admin, busy, onResult }: { match: BracketMatch; admin: boolean; busy: boolean; onResult: (a: number, b: number) => Promise<void> }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ready = !!match.a && !!match.b && !match.winner;
  const row = (side: BracketMatch["a"], score: number | null) => (
    <div className={`flex items-center justify-between gap-2 px-3 py-1.5 text-xs ${side && match.winner === side.id ? "font-extrabold text-emerald-300" : "text-slate-300"}`}>
      <span className="truncate">{side ? side.name : match.bye ? "—" : "بانتظار الفائز"}</span>
      <span>{score ?? ""}</span>
    </div>
  );
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
      {row(match.a, match.scoreA)}
      <div className="border-t border-slate-800/70" />
      {row(match.b, match.scoreB)}
      {match.bye && <p className="border-t border-slate-800/70 px-3 py-1 text-[10px] text-slate-500">تأهل مباشرة</p>}
      {admin && ready && (
        <div className="flex items-center gap-1.5 border-t border-slate-800/70 p-2">
          <input aria-label="نتيجة الأول" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, "").slice(0, 2))} className="w-10 rounded bg-slate-800 px-1 py-1 text-center text-xs text-white outline-none" />
          <span className="text-slate-500">-</span>
          <input aria-label="نتيجة الثاني" inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, "").slice(0, 2))} className="w-10 rounded bg-slate-800 px-1 py-1 text-center text-xs text-white outline-none" />
          <button disabled={busy || a === "" || b === ""} onClick={() => void onResult(Number(a), Number(b))} className="ms-auto rounded bg-blue-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40">
            حفظ
          </button>
        </div>
      )}
    </div>
  );
}
