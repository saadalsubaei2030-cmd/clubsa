import { useCallback, useEffect, useState } from "react";
import { Flag, Megaphone, Plus, Trash2, User, X } from "lucide-react";
import { POSITIONS, POSITION_LABELS } from "@/data";
import { canManageClub } from "@/lib/permissions";
import {
  SocialError,
  createRecruitPost,
  deleteRecruitPost,
  fetchRecruitPosts,
  socialErrorText,
  type RecruitKind,
  type RecruitPost,
} from "@/lib/social";
import { ProfileViewer } from "@/components/DirectoryPanel";
import ReportModal from "@/components/ReportModal";
import { useModeration } from "@/hooks/useModeration";
import type { AuthUser } from "@/types";

const display = { fontFamily: "Cairo, sans-serif" } as const;
const NOTE_MAX = 200;

const KIND_LABEL: Record<RecruitKind, string> = {
  need_club: "أبحث عن نادي",
  need_player: "مطلوب لاعب",
};

const KIND_STYLE: Record<RecruitKind, string> = {
  need_club: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  need_player: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function postErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.code === "too_many_posts") return "عندك إعلانان فعّالان. احذف واحدًا أو انتظر انتهاءه.";
    if (error.code === "no_club" || error.code === "not_allowed") return "إعلان «مطلوب لاعب» لرئيس النادي أو نائبه أو الكشاف فقط.";
    if (error.code === "invalid_note") return "النص لازم يكون بين 5 و200 حرف.";
    if (error.status === 429) return "نشرت إعلانات كثيرة. حاول بعد ساعة.";
  }
  return socialErrorText(error);
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "اليوم" : days === 1 ? "أمس" : `قبل ${days} أيام`;
}

const selectClass =
  "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none";

function NewPostModal({
  auth,
  onClose,
  onCreated,
}: {
  auth: AuthUser;
  onClose: () => void;
  onCreated: () => void;
}) {
  const staff = canManageClub(auth);
  const [kind, setKind] = useState<RecruitKind>("need_club");
  const [position, setPosition] = useState(POSITIONS.some((x) => x.id === auth.position) ? (auth.position as string) : "");
  const region = "";  // المناطق مخفية حاليًا
  const [minOverall, setMinOverall] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await createRecruitPost(auth.id, {
        kind,
        position,
        region,
        minOverall: minOverall === "" ? 0 : Number(minOverall),
        note,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(postErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="إعلان جديد"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <button onClick={onClose} aria-label="إغلاق" className="absolute left-3 top-3 text-slate-500 hover:text-slate-200">
          <X size={18} />
        </button>
        <h2 className="text-lg font-extrabold text-white" style={display}>
          إعلان جديد
        </h2>

        <div className="flex gap-2">
          {(["need_club", "need_player"] as RecruitKind[]).map((k) => {
            const disabled = k === "need_player" && !staff;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
                  kind === k ? KIND_STYLE[k] : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {KIND_LABEL[k]}
              </button>
            );
          })}
        </div>
        {!staff && <p className="text-xs text-slate-500">«مطلوب لاعب» يفتح لرئيس النادي أو نائبه أو الكشاف.</p>}

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-xs text-slate-400">
            {kind === "need_club" ? "مركزي" : "المركز المطلوب"}
            <select value={position} onChange={(e) => setPosition(e.target.value)} className={`${selectClass} w-full`}>
              <option value="">أي مركز</option>
              {POSITIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-xs text-slate-400">
          {kind === "need_club" ? "تقييمي (OVR)" : "أقل تقييم مطلوب (OVR)"}
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={minOverall}
            onChange={(e) => setMinOverall(e.target.value)}
            placeholder="اختياري"
            className={`${selectClass} w-full`}
          />
        </label>

        <label className="block space-y-1 text-xs text-slate-400">
          <span className="flex justify-between">
            <span>تفاصيل الإعلان</span>
            <span>
              {note.length}/{NOTE_MAX}
            </span>
          </span>
          <textarea
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder={kind === "need_club" ? "مثال: لاعب جاد أتواجد مساءً، أبي نادي منظم." : "مثال: نبي قلب دفاع يلعب بروح الفريق ويتواجد أيام المباريات."}
            className={`${selectClass} w-full resize-none`}
          />
        </label>

        {error && (
          <p role="alert" className="text-xs text-red-300">
            {error}
          </p>
        )}
        <p className="text-[11px] text-slate-500">يبقى الإعلان 14 يومًا ثم يُحذف تلقائيًا. الحد الأقصى إعلانان فعّالان.</p>
        <button
          onClick={() => void submit()}
          disabled={busy || note.trim().length < 5}
          className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {busy ? "جارٍ النشر..." : "انشر الإعلان"}
        </button>
      </div>
    </div>
  );
}

export default function RecruitPage({
  auth,
  onRequireLogin,
}: {
  auth: AuthUser | null;
  onRequireLogin: () => void;
}) {
  const [kind, setKind] = useState<RecruitKind | "">("");
  const [position, setPosition] = useState("");
  const region = "";
  const [posts, setPosts] = useState<RecruitPost[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const moderation = useModeration(auth?.id ?? null);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetchRecruitPosts({ kind, position, region }, controller.signal)
      .then((data) => setPosts(data.posts))
      .catch((e) => {
        if (!controller.signal.aborted) {
          setPosts((current) => current ?? []);
          setError(socialErrorText(e));
        }
      });
    return () => controller.abort();
  }, [kind, position, region, reload]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const remove = async (id: number) => {
    if (!auth) return;
    try {
      await deleteRecruitPost(auth.id, id);
      setPosts((current) => current?.filter((p) => p.id !== id) ?? current);
    } catch (e) {
      setError(postErrorText(e));
    }
  };

  const kindTabs: { id: RecruitKind | ""; label: string }[] = [
    { id: "", label: "الكل" },
    { id: "need_club", label: "أبحث عن نادي" },
    { id: "need_player", label: "مطلوب لاعب" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white sm:text-3xl" style={display}>
            <Megaphone size={22} className="text-cyan-400" /> إعلانات الفرق واللاعبين
          </h1>
          <p className="mt-1 text-sm text-slate-400">لاعب يدور نادي أو نادي يدور لاعب. افتح الملف وراسله مباشرة.</p>
        </div>
        <button
          onClick={() => (auth ? setCreating(true) : onRequireLogin())}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-500"
        >
          <Plus size={16} /> إعلان جديد
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="تصفية الإعلانات">
        <div className="flex gap-1.5" role="tablist">
          {kindTabs.map((t) => (
            <button
              key={t.id || "all"}
              role="tab"
              aria-selected={kind === t.id}
              onClick={() => setKind(t.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                kind === t.id ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select aria-label="المركز" value={position} onChange={(e) => setPosition(e.target.value)} className={selectClass}>
          <option value="">كل المراكز</option>
          {POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      {posts === null ? (
        <p className="py-10 text-center text-sm text-slate-500">جارٍ التحميل...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center">
          <p className="text-sm font-bold text-slate-300">ما فيه إعلانات بهالفلتر</p>
          <p className="mt-1 text-xs text-slate-500">كن أول من ينشر إعلان.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {posts.filter((p) => !moderation.blockedIds.includes(p.poster.id)).map((p) => (
            <article key={p.id} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${KIND_STYLE[p.kind]}`}>{KIND_LABEL[p.kind]}</span>
                <span className="text-[11px] text-slate-500">{daysAgo(p.createdAt)}</span>
              </div>

              <div className="flex items-center gap-3">
                {p.poster.avatar ? (
                  <img src={p.poster.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800">
                    <User size={18} className="text-cyan-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-white">{p.poster.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.kind === "need_player" && p.poster.clubName
                      ? `نادي ${p.poster.clubName}`
                      : [p.poster.position && (POSITION_LABELS[p.poster.position] ?? p.poster.position), p.poster.overall > 0 && `OVR ${p.poster.overall}`]
                          .filter(Boolean)
                          .join(" · ") || "لاعب"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-300">
                <span className="rounded bg-slate-800 px-2 py-0.5">{p.position ? POSITION_LABELS[p.position] ?? p.position : "أي مركز"}</span>
                {p.minOverall > 0 && <span className="rounded bg-slate-800 px-2 py-0.5">{p.kind === "need_player" ? `OVR ${p.minOverall}+` : `OVR ${p.minOverall}`}</span>}
              </div>

              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{p.note}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewUser(p.poster.id)}
                  className="flex-1 rounded-lg bg-slate-800 py-2 text-xs font-bold text-cyan-300 hover:bg-slate-700"
                >
                  عرض الملف والتواصل
                </button>
                {auth && auth.id !== p.poster.id && (
                  <button
                    onClick={() => setReportingId(p.id)}
                    aria-label="إبلاغ عن الإعلان"
                    className="rounded-lg bg-slate-800 px-3 text-amber-300 hover:bg-slate-700"
                  >
                    <Flag size={14} />
                  </button>
                )}
                {auth?.id === p.poster.id && (
                  <button
                    onClick={() => void remove(p.id)}
                    aria-label="حذف الإعلان"
                    className="rounded-lg bg-slate-800 px-3 text-red-300 hover:bg-slate-700"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && auth && <NewPostModal auth={auth} onClose={() => setCreating(false)} onCreated={refresh} />}
      {auth && reportingId !== null && (
        <ReportModal userId={auth.id} target={{ kind: "recruit_post", targetRef: String(reportingId), label: "الإعلان" }} onClose={() => setReportingId(null)} />
      )}
      {viewUser && <ProfileViewer userId={viewUser} auth={auth} onClose={() => setViewUser(null)} onRequireLogin={onRequireLogin} />}
    </div>
  );
}
