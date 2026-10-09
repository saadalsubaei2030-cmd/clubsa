import { useCallback, useEffect, useRef, useState } from "react";
import { Search, User, Shield, Send, X, UserPlus, Check, MessageCircle, Users, UserMinus } from "lucide-react";
import { ROLE_LABELS } from "@/data";
import {
  acceptFriendRequest,
  getConversations,
  getDirectMessages,
  getFriends,
  getSocialClub,
  getSocialUser,
  removeFriendLink,
  searchDirectory,
  sendDirectMessage,
  sendFriendRequest,
  socialErrorText,
} from "@/lib/social";
import type {
  Conversation,
  DirectMessage,
  FriendsState,
  Relationship,
  SocialClub,
  SocialUser,
} from "@/lib/social";
import type { AuthUser } from "@/types";

type View =
  | { kind: "user"; id: string }
  | { kind: "club"; id: string }
  | { kind: "dm"; peer: SocialUser }
  | null;

type Tab = "search" | "friends" | "messages";

function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role;
}

function Avatar({ user, size = 32 }: { user: SocialUser; size?: number }) {
  return user.avatar ? (
    <img src={user.avatar} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-slate-700 flex items-center justify-center shrink-0"
    >
      <User size={size / 2} className="text-cyan-300" />
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute top-3 left-3 text-slate-500 hover:text-slate-200"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ───────────── ملف لاعب ───────────── */

function UserModal({
  id,
  auth,
  onClose,
  onOpen,
  onRequireLogin,
}: {
  id: string;
  auth: AuthUser | null;
  onClose: () => void;
  onOpen: (view: View) => void;
  onRequireLogin: () => void;
}) {
  const [user, setUser] = useState<SocialUser | null>(null);
  const [rel, setRel] = useState<Relationship>("none");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getSocialUser(id, auth?.id ?? null, controller.signal)
      .then((data) => {
        setUser(data.user);
        setRel(data.relationship);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(socialErrorText(e));
      });
    return () => controller.abort();
  }, [id, auth?.id]);

  const act = async (fn: (me: string, other: string) => Promise<{ relationship: Relationship }>) => {
    if (!auth) return onRequireLogin();
    setBusy(true);
    setError("");
    try {
      setRel((await fn(auth.id, id)).relationship);
    } catch (e) {
      setError(socialErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const btn = "flex-1 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1";

  return (
    <Modal onClose={onClose}>
      {!user ? (
        <p className="text-sm text-center text-slate-400 py-6">{error || "جارٍ التحميل..."}</p>
      ) : (
        <>
          <div className="flex flex-col items-center text-center mb-4">
            <Avatar user={user} size={64} />
            <h3 className="text-base font-bold text-white mt-2">{user.name}</h3>
            {user.username && <span className="text-xs text-slate-500">@{user.username}</span>}
            <span className="text-xs text-cyan-300 mt-1">{roleLabel(user.role)}</span>
          </div>
          <dl className="text-xs text-slate-300 space-y-1.5 mb-4">
            {user.region && <Row k="المنطقة" v={user.region} />}
            {user.eaId && <Row k="EA ID" v={user.eaId} />}
            {user.position && <Row k="المركز" v={user.position} />}
            {user.overall > 0 && <Row k="التقييم" v={String(user.overall)} />}
            <Row k="النادي" v={user.clubName ?? (user.isFreeAgent ? "لاعب حر" : "—")} />
          </dl>
          {user.clubId && user.clubName && (
            <button
              onClick={() => onOpen({ kind: "club", id: user.clubId! })}
              className="w-full mb-3 py-2 rounded-lg text-xs font-bold bg-slate-800 text-blue-300 hover:bg-slate-700 flex items-center justify-center gap-1"
            >
              <Shield size={13} /> عرض النادي
            </button>
          )}
          {error && <p role="alert" className="text-xs text-red-300 mb-2">{error}</p>}
          {rel === "self" ? (
            <p className="text-center text-xs text-slate-500">هذا ملفك الشخصي</p>
          ) : (
            <div className="flex gap-2">
              {rel === "none" && (
                <button disabled={busy} onClick={() => void act(sendFriendRequest)} className={`${btn} bg-blue-600 hover:bg-blue-500 text-white`}>
                  <UserPlus size={13} /> إضافة صديق
                </button>
              )}
              {rel === "outgoing" && (
                <button disabled={busy} onClick={() => void act(removeFriendLink)} className={`${btn} bg-slate-800 text-slate-300`}>
                  إلغاء الطلب
                </button>
              )}
              {rel === "incoming" && (
                <button disabled={busy} onClick={() => void act(acceptFriendRequest)} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>
                  <Check size={13} /> قبول الطلب
                </button>
              )}
              {rel === "friends" && (
                <button disabled={busy} onClick={() => void act(removeFriendLink)} className={`${btn} bg-slate-800 text-red-300`}>
                  <UserMinus size={13} /> إزالة الصديق
                </button>
              )}
              <button
                onClick={() => (auth ? onOpen({ kind: "dm", peer: user }) : onRequireLogin())}
                className={`${btn} bg-cyan-600 hover:bg-cyan-500 text-white`}
              >
                <MessageCircle size={13} /> رسالة خاصة
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-200 truncate">{v}</dd>
    </div>
  );
}

/* ───────────── ملف نادٍ ───────────── */

function ClubModal({ id, onClose, onOpen }: { id: string; onClose: () => void; onOpen: (view: View) => void }) {
  const [data, setData] = useState<{ club: SocialClub; president: SocialUser | null; roster: SocialUser[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getSocialClub(id, controller.signal)
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(socialErrorText(e));
      });
    return () => controller.abort();
  }, [id]);

  return (
    <Modal onClose={onClose}>
      {!data ? (
        <p className="text-sm text-center text-slate-400 py-6">{error || "جارٍ التحميل..."}</p>
      ) : (
        <>
          <div className="flex flex-col items-center text-center mb-4">
            {data.club.logo ? (
              <img src={data.club.logo} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: data.club.primaryColor }}
              >
                <Shield size={28} style={{ color: data.club.secondaryColor }} />
              </div>
            )}
            <h3 className="text-base font-bold text-white mt-2">{data.club.name}</h3>
            {data.club.region && <span className="text-xs text-slate-500">{data.club.region}</span>}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px] mb-4">
            <Stat k="فوز" v={data.club.wins} />
            <Stat k="تعادل" v={data.club.draws} />
            <Stat k="خسارة" v={data.club.losses} />
            <Stat k="كؤوس" v={data.club.trophies} />
          </div>
          {data.president && (
            <>
              <span className="text-[11px] text-slate-400 font-bold block mb-1">الرئيس</span>
              <UserRow user={data.president} onClick={() => onOpen({ kind: "user", id: data.president!.id })} />
            </>
          )}
          <span className="text-[11px] text-slate-400 font-bold block mt-3 mb-1">
            الأعضاء ({data.club.memberCount})
          </span>
          {data.roster.length === 0 ? (
            <p className="text-xs text-slate-500">لا يوجد أعضاء مسجلون بعد</p>
          ) : (
            data.roster.map((u) => <UserRow key={u.id} user={u} onClick={() => onOpen({ kind: "user", id: u.id })} />)
          )}
        </>
      )}
    </Modal>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg bg-slate-800/60 py-2">
      <div className="text-sm font-bold text-white">{v}</div>
      <div className="text-slate-500">{k}</div>
    </div>
  );
}

function UserRow({ user, onClick, sub }: { user: SocialUser; onClick: () => void; sub?: string }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 cursor-pointer transition-colors mb-1"
    >
      <Avatar user={user} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-200 font-medium truncate">{user.name}</div>
        <div className="text-[10px] text-slate-500 truncate">
          {sub ?? `${roleLabel(user.role)}${user.clubName ? ` · ${user.clubName}` : ""}`}
        </div>
      </div>
    </div>
  );
}

/* ───────────── رسائل خاصة ───────────── */

function DmModal({ peer, auth, onClose }: { peer: SocialUser; auth: AuthUser; onClose: () => void }) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const data = await getDirectMessages(auth.id, peer.id, controller.signal);
        if (!cancelled) {
          setMessages(data.messages);
          setError("");
        }
      } catch (e) {
        if (!cancelled && !controller?.signal.aborted) setError(socialErrorText(e));
      }
    };
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, [auth.id, peer.id]);

  const lastId = messages.length ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lastId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const { message } = await sendDirectMessage(auth.id, peer.id, text);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setDraft("");
      setError("");
    } catch (e) {
      setError(socialErrorText(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-3 pe-6">
        <Avatar user={peer} size={32} />
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{peer.name}</div>
          <div className="text-[10px] text-slate-500">رسالة خاصة</div>
        </div>
      </div>
      <div ref={scrollRef} className="h-64 overflow-y-auto space-y-2 mb-3 rounded-lg bg-slate-950/50 p-2">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500 text-center pt-24">ابدأ المحادثة</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === auth.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-1.5 text-xs break-words ${mine ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-300 mb-2">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          maxLength={1000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void send()}
          placeholder="اكتب رسالتك..."
          className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
        />
        <button
          onClick={() => void send()}
          disabled={sending}
          aria-label="إرسال"
          className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </Modal>
  );
}

/* ───────────── اللوحة الرئيسية ───────────── */

export default function DirectoryPanel({
  auth,
  onRequireLogin,
}: {
  auth: AuthUser | null;
  onRequireLogin: () => void;
}) {
  const [tab, setTab] = useState<Tab>("search");
  const [view, setView] = useState<View>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ users: SocialUser[]; clubs: SocialClub[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState<FriendsState | null>(null);
  const [convs, setConvs] = useState<Conversation[] | null>(null);

  const userId = auth?.id ?? null;

  // البحث من الخادم (مؤجَّل نصف ثانية بعد آخر ضغطة)
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setError("");
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchDirectory(q, controller.signal)
        .then((data) => {
          setResults(data);
          setError("");
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(socialErrorText(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const reload = useCallback(
    async (which: Tab) => {
      if (!userId) return;
      try {
        if (which === "friends") setFriends(await getFriends(userId));
        if (which === "messages") setConvs((await getConversations(userId)).conversations);
        setError("");
      } catch (e) {
        setError(socialErrorText(e));
      }
    },
    [userId],
  );

  // تحديث القوائم عند فتح التبويب وكل 5 ثوانٍ، وعند إغلاق أي نافذة
  useEffect(() => {
    if (tab === "search" || !userId) return;
    void reload(tab);
    const timer = setInterval(() => void reload(tab), 5000);
    return () => clearInterval(timer);
  }, [tab, userId, reload, view]);

  const open = (next: View) => setView(next);

  const tabBtn = (id: Tab, label: string, Icon: typeof Search) => (
    <button
      key={id}
      onClick={() => {
        setTab(id);
        setError("");
        if (id !== "search" && !auth) onRequireLogin();
      }}
      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${tab === id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
    >
      <Icon size={12} /> {label}
    </button>
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex gap-1 p-1 rounded-lg bg-slate-800/60 mb-3">
        {tabBtn("search", "بحث", Search)}
        {tabBtn("friends", "أصدقائي", Users)}
        {tabBtn("messages", "رسائلي", MessageCircle)}
      </div>

      {error && <p role="alert" className="text-xs text-red-300 mb-2">{error}</p>}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {tab === "search" && (
          <>
            <div className="relative mb-3">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اسم اللاعب أو النادي..."
                className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2 pe-9 ps-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
              />
            </div>
            {!query.trim() ? (
              <p className="py-6 text-center text-xs text-slate-500">اكتب اسمًا للبحث عن اللاعبين أو الأندية</p>
            ) : searching && !results ? (
              <p className="py-6 text-center text-xs text-slate-500">جارٍ البحث...</p>
            ) : results && results.users.length === 0 && results.clubs.length === 0 ? (
              <p className="py-6 text-center text-xs font-bold text-slate-300">
                لا توجد نتائج مطابقة
                <span className="block font-normal text-slate-500 mt-1">يظهر الحساب في البحث بعد تسجيل دخوله مرة واحدة</span>
              </p>
            ) : (
              results && (
                <>
                  {results.users.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[11px] text-slate-400 font-bold block mb-1">اللاعبون</span>
                      {results.users.map((u) => (
                        <UserRow key={u.id} user={u} onClick={() => open({ kind: "user", id: u.id })} />
                      ))}
                    </div>
                  )}
                  {results.clubs.length > 0 && (
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block mb-1">الأندية</span>
                      {results.clubs.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => open({ kind: "club", id: c.id })}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 cursor-pointer mb-1"
                        >
                          <Shield size={14} className="text-blue-400 shrink-0" />
                          <span className="text-xs text-slate-200 font-medium truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 ms-auto">{c.memberCount} عضو</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </>
        )}

        {tab === "friends" &&
          (!auth ? (
            <p className="py-6 text-center text-xs text-slate-500">سجّل الدخول لرؤية أصدقائك</p>
          ) : !friends ? (
            <p className="py-6 text-center text-xs text-slate-500">جارٍ التحميل...</p>
          ) : (
            <>
              {friends.incoming.length > 0 && (
                <div>
                  <span className="text-[11px] text-emerald-300 font-bold block mb-1">طلبات واردة</span>
                  {friends.incoming.map((u) => (
                    <UserRow key={u.id} user={u} onClick={() => open({ kind: "user", id: u.id })} />
                  ))}
                </div>
              )}
              <div>
                <span className="text-[11px] text-slate-400 font-bold block mb-1">الأصدقاء</span>
                {friends.friends.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">لا يوجد أصدقاء بعد. ابحث عن لاعب وأضفه.</p>
                ) : (
                  friends.friends.map((u) => (
                    <UserRow key={u.id} user={u} onClick={() => open({ kind: "user", id: u.id })} />
                  ))
                )}
              </div>
              {friends.outgoing.length > 0 && (
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block mb-1">طلبات مرسلة</span>
                  {friends.outgoing.map((u) => (
                    <UserRow key={u.id} user={u} onClick={() => open({ kind: "user", id: u.id })} />
                  ))}
                </div>
              )}
            </>
          ))}

        {tab === "messages" &&
          (!auth ? (
            <p className="py-6 text-center text-xs text-slate-500">سجّل الدخول لرؤية رسائلك</p>
          ) : !convs ? (
            <p className="py-6 text-center text-xs text-slate-500">جارٍ التحميل...</p>
          ) : convs.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">لا توجد محادثات. افتح ملف لاعب وأرسل له رسالة.</p>
          ) : (
            convs.map((c) => (
              <UserRow
                key={c.peer.id}
                user={c.peer}
                sub={`${c.lastFromMe ? "أنت: " : ""}${c.lastText}`}
                onClick={() => open({ kind: "dm", peer: c.peer })}
              />
            ))
          ))}
      </div>

      {view?.kind === "user" && (
        <UserModal
          key={view.id}
          id={view.id}
          auth={auth}
          onClose={() => setView(null)}
          onOpen={open}
          onRequireLogin={onRequireLogin}
        />
      )}
      {view?.kind === "club" && <ClubModal key={view.id} id={view.id} onClose={() => setView(null)} onOpen={open} />}
      {view?.kind === "dm" && auth && <DmModal peer={view.peer} auth={auth} onClose={() => setView(null)} />}
    </div>
  );
}
