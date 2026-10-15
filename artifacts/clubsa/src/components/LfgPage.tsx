import { useCallback, useEffect, useState } from "react";
import { Megaphone, Send, Trash2, Plus, X, MapPin, Loader2 } from "lucide-react";
import { POSITIONS, REGIONS } from "@/data";
import { sendDirectMessage, socialErrorText } from "@/lib/social";
import {
  PLATFORM_LABELS,
  closeLfgPost,
  createLfgPost,
  fetchLfgPosts,
  lfgErrorText,
  type LfgKind,
  type LfgPost,
} from "@/lib/lfg";
import type { AuthUser } from "@/types";

const display = { fontFamily: "Cairo, sans-serif" } as const;

const KIND_TABS: { id: LfgKind | ""; label: string }[] = [
  { id: "", label: "الكل" },
  { id: "seeking_club", label: "لاعبون يدورون نادي" },
  { id: "seeking_player", label: "أندية تدور لاعبين" },
];

const POSITION_LABEL: Record<string, string> = {
  ANY: "أي مركز",
  ...Object.fromEntries(POSITIONS.map((p) => [p.id, p.label])),
};

const selectClass =
  "rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none";

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  return `قبل ${Math.round(hours / 24)} يوم`;
}

function PostCard({
  post,
  auth,
  onRequireLogin,
  onClosed,
}: {
  post: LfgPost;
  auth: AuthUser | null;
  onRequireLogin: () => void;
  onClosed: () => void;
}) {
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const mine = auth?.id === post.author.id;
  const club = post.kind === "seeking_player";

  const send = async () => {
    if (!auth) return onRequireLogin();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setNote(null);
    try {
      await sendDirectMessage(auth.id, post.author.id, body);
      setText("");
      setComposing(false);
      setNote({ ok: true, text: "وصلت رسالتك. الرد يجيك في الرسائل الخاصة." });
    } catch (error) {
      setNote({ ok: false, text: socialErrorText(error) });
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!auth) return;
    setBusy(true);
    try {
      await closeLfgPost(auth.id, post.id);
      onClosed();
    } catch (error) {
      setNote({ ok: false, text: lfgErrorText(error) });
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        {post.author.avatar ? (
          <img src={post.author.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-extrabold text-slate-300">
            {post.author.name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate text-sm font-extrabold text-white" style={display}>
              {post.author.name}
            </h3>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                club ? "bg-amber-500/15 text-amber-300" : "bg-cyan-500/15 text-cyan-300"
              }`}
            >
              {club ? `نادي ${post.author.clubName ?? ""}`.trim() + " يدور لاعب" : "يدور نادي"}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{POSITION_LABEL[post.position] ?? post.position}</span>
            <span>{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
            {post.author.region && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} aria-hidden /> {post.author.region}
              </span>
            )}
            {!club && post.author.overall > 0 && <span>تقييمه {post.author.overall}</span>}
            {club && post.minOverall > 0 && <span>أقل تقييم مطلوب {post.minOverall}</span>}
            <span className="text-slate-500">{timeAgo(post.createdAt)}</span>
          </p>
        </div>
      </div>

      {post.body && <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-300">{post.body}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {mine ? (
          <button
            onClick={close}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
          >
            <Trash2 size={13} aria-hidden /> إغلاق المنشور
          </button>
        ) : (
          <button
            onClick={() => (auth ? setComposing((v) => !v) : onRequireLogin())}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            <Send size={13} aria-hidden /> {club ? "قدّم على النادي" : "راسل اللاعب"}
          </button>
        )}
      </div>

      {composing && (
        <div className="mt-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={club ? "عرّف بنفسك: مركزك، تقييمك، ومتى تلعب." : "اكتب رسالتك للاعب."}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {busy ? "جاري الإرسال..." : "إرسال"}
          </button>
        </div>
      )}

      {note && <p className={`mt-3 text-xs ${note.ok ? "text-emerald-300" : "text-rose-300"}`}>{note.text}</p>}
    </article>
  );
}

function ComposeForm({
  auth,
  kind,
  onDone,
  onCancel,
}: {
  auth: AuthUser;
  kind: LfgKind;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [position, setPosition] = useState(kind === "seeking_club" ? auth.position || "ANY" : "ANY");
  const [platform, setPlatform] = useState("ANY");
  const [minOverall, setMinOverall] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await createLfgPost(auth.id, { kind, position, platform, minOverall, body: body.trim() });
      onDone();
    } catch (e) {
      setError(lfgErrorText(e));
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-white" style={display}>
          {kind === "seeking_club" ? "أدور نادي" : "ناديي يدور لاعب"}
        </h2>
        <button onClick={onCancel} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800">
          <X size={16} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs font-bold text-slate-400">
          {kind === "seeking_club" ? "مركزك" : "المركز المطلوب"}
          <select value={position} onChange={(e) => setPosition(e.target.value)} className={`${selectClass} mt-1 w-full`}>
            <option value="ANY">أي مركز</option>
            {POSITIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-400">
          المنصة
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`${selectClass} mt-1 w-full`}>
            {Object.entries(PLATFORM_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {kind === "seeking_player" && (
          <label className="block text-xs font-bold text-slate-400">
            أقل تقييم (اختياري)
            <input
              type="number"
              min={0}
              max={99}
              value={minOverall}
              onChange={(e) => setMinOverall(Math.min(99, Math.max(0, Math.floor(Number(e.target.value) || 0))))}
              className={`${selectClass} mt-1 w-full`}
            />
          </label>
        )}
      </div>

      <label className="mt-3 block text-xs font-bold text-slate-400">
        تفاصيل (اختياري)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={400}
          rows={3}
          placeholder={
            kind === "seeking_club"
              ? "مثال: ألعب أيام الأسبوع بعد العشاء، عندي مايك، وأبي نادي جاد."
              : "مثال: نلعب كل ليلة الساعة 10، ناقصنا مهاجم يلتزم بالتدريب."
          }
          className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
        />
        <span className="text-[11px] text-slate-500">{body.length}/400</span>
      </label>

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="animate-spin" aria-hidden />} نشر
        </button>
        <button onClick={onCancel} className="rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800">
          إلغاء
        </button>
      </div>
    </div>
  );
}

export default function LfgPage({ auth, onRequireLogin }: { auth: AuthUser | null; onRequireLogin: () => void }) {
  const [kind, setKind] = useState<LfgKind | "">("");
  const [position, setPosition] = useState("ANY");
  const [platform, setPlatform] = useState("ANY");
  const [region, setRegion] = useState("");
  const [posts, setPosts] = useState<LfgPost[] | null>(null);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const data = await fetchLfgPosts({ kind, position, platform, region }, signal);
        setPosts(data.posts);
        setError("");
      } catch (e) {
        if (signal?.aborted) return;
        setError(lfgErrorText(e));
        setPosts((prev) => prev ?? []);
      }
    },
    [kind, position, platform, region],
  );

  useEffect(() => {
    const controller = new AbortController();
    setPosts(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // نوع المنشور الذي يقدر هذا الحساب ينشره
  const myKind: LfgKind | null = auth
    ? auth.role === "player"
      ? "seeking_club"
      : auth.role === "president" && auth.clubId
        ? "seeking_player"
        : null
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0">
      <div className="mb-1 flex items-center gap-2">
        <Megaphone size={22} className="text-cyan-400" />
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl" style={display}>
          الفرص
        </h1>
      </div>
      <p className="mb-6 text-sm text-slate-400">لاعب يدور نادي، أو نادي يدور لاعب. اختر وراسل مباشرة.</p>

      <div className="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1">
        {KIND_TABS.map((t) => (
          <button
            key={t.id || "all"}
            onClick={() => setKind(t.id)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${
              kind === t.id
                ? "border-blue-500 bg-blue-600 text-white"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={position} onChange={(e) => setPosition(e.target.value)} className={selectClass} aria-label="المركز">
          <option value="ANY">كل المراكز</option>
          {POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectClass} aria-label="المنصة">
          <option value="ANY">كل المنصات</option>
          <option value="PS">PlayStation</option>
          <option value="XBOX">Xbox</option>
          <option value="PC">PC</option>
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectClass} aria-label="المنطقة">
          <option value="">كل المناطق</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div className="ms-auto">
          {myKind ? (
            <button
              onClick={() => setComposing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-cyan-400"
            >
              <Plus size={15} aria-hidden /> {myKind === "seeking_club" ? "أدور نادي" : "ناديي يدور لاعب"}
            </button>
          ) : !auth ? (
            <button onClick={onRequireLogin} className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800">
              سجّل دخولك لتنشر
            </button>
          ) : null}
        </div>
      </div>

      {composing && auth && myKind && (
        <div className="mb-6">
          <ComposeForm
            auth={auth}
            kind={myKind}
            onCancel={() => setComposing(false)}
            onDone={() => {
              setComposing(false);
              void load();
            }}
          />
        </div>
      )}

      {error && <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

      {posts === null ? (
        <div className="flex justify-center py-12 text-slate-500">
          <Loader2 className="animate-spin" aria-label="جاري التحميل" />
        </div>
      ) : posts.length === 0 && !error ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-12 text-center">
          <Megaphone size={28} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm font-bold text-slate-300">ما فيه منشورات بهذي الفلاتر</p>
          <p className="mt-1 text-xs text-slate-500">غيّر الفلاتر، أو كن أول من ينشر.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} auth={auth} onRequireLogin={onRequireLogin} onClosed={() => void load()} />
          ))}
        </div>
      )}
    </div>
  );
}
