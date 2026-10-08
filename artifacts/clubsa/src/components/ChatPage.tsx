import { useState, useRef, useEffect } from "react";
import { Send, Search, MessageCircle, Lock, User, Shield } from "lucide-react";
import { FORBIDDEN_WORDS } from "@/data";
import { getUsers, getClubs } from "@/lib/mockData";
import type { AuthUser, ChatMessage } from "@/types";

// الدردشة العامة تمر عبر خادم Replit حتى تظهر الرسائل لكل الزوار.
// يمكن تغيير العنوان من متغير البيئة VITE_API_BASE_URL وقت البناء.
const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "https://clubsa--saadalsubaei203.replit.app"
).replace(/\/+$/, "");

type ServerMessage = {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

function toChatMessage(m: ServerMessage): ChatMessage {
  return { id: m.id, sender: m.senderName, text: m.text, time: timeAgo(m.createdAt) };
}

async function fetchMessages(signal?: AbortSignal): Promise<ServerMessage[]> {
  const response = await fetch(`${API_BASE}/api/chat/public?limit=100`, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`load_failed_${response.status}`);
  const data = (await response.json()) as { messages?: ServerMessage[] };
  return Array.isArray(data.messages) ? data.messages : [];
}

class SendError extends Error {
  status: number;
  constructor(status: number) {
    super(`send_failed_${status}`);
    this.status = status;
  }
}

async function postMessage(body: {
  senderId: string;
  senderName: string;
  text: string;
}): Promise<ServerMessage> {
  const response = await fetch(`${API_BASE}/api/chat/public`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new SendError(response.status);
  const data = (await response.json()) as { message: ServerMessage };
  return data.message;
}

function filterMessage(text: string): string {
  let result = text;
  FORBIDDEN_WORDS.forEach((w) => {
    const re = new RegExp(w, "gi");
    result = result.replace(re, "*".repeat(w.length));
  });
  return result;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
}

export default function ChatPage({
  auth,
  onRequireLogin,
  onSelectUser,
  onSelectClub,
}: {
  auth: AuthUser | null;
  onRequireLogin: () => void;
  onSelectUser?: (userId: string) => void;
  onSelectClub?: (clubId: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sendError, setSendError] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [showGuestAlert, setShowGuestAlert] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isGuest = !auth;

  // جلب المستخدمين والأندية الحقيقية المسجلة
  const allUsers = getUsers
    ? getUsers().filter((u) => u.name && u.name.trim() !== "")
    : [];
  const allClubs = getClubs ? getClubs() : [];

  const filteredUsers = allUsers.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredClubs = allClubs.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );
  const hasSearchResults =
    query.trim() !== "" &&
    (filteredUsers.length > 0 || filteredClubs.length > 0);

  // جلب الرسائل من الخادم كل 3 ثوانٍ حتى تظهر رسائل الآخرين
  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const latest = await fetchMessages(controller.signal);
        if (cancelled) return;
        setMessages(latest.map(toChatMessage));
        setLoadError(false);
        setLoaded(true);
      } catch {
        if (cancelled || controller?.signal.aborted) return;
        setLoadError(true);
      }
    };

    void load();
    const interval = setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  // النزول لآخر رسالة فقط عند وصول رسالة جديدة (وليس عند تحديث الأوقات)
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lastMessageId, messages.length]);

  const send = async () => {
    if (isGuest) {
      setShowGuestAlert(true);
      return;
    }
    const text = filterMessage(draft.trim());
    if (!text || sending || !auth) return;
    setSending(true);
    setSendError("");
    try {
      const saved = await postMessage({
        senderId: auth.id,
        senderName: auth.name,
        text,
      });
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id) ? prev : [...prev, toChatMessage(saved)],
      );
      setDraft("");
    } catch (error) {
      setSendError(
        error instanceof SendError && error.status === 429
          ? "أرسلت رسائل كثيرة، انتظر قليلًا ثم حاول مرة أخرى."
          : error instanceof SendError && error.status === 400
            ? "تعذّر إرسال الرسالة. تأكد أنها غير فارغة وأقل من 500 حرف."
            : "تعذّر إرسال الرسالة. تحقق من الاتصال وحاول مرة أخرى.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1
        className="text-2xl sm:text-3xl font-extrabold text-white mb-1"
        style={{ fontFamily: "Cairo, sans-serif" }}
      >
        الشات المجتمعي
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        تواصل مع اللاعبين ورؤساء الأندية — رسائلك تمر تلقائيًا على فلتر الكلمات
        الممنوعة
      </p>

      {isGuest && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 mb-4">
          <Lock size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300">
            أنت تتصفح كزائر — يمكنك قراءة الرسائل ولكن لا يمكنك الكتابة. سجّل
            الدخول للتفاعل.
          </span>
          <button
            onClick={onRequireLogin}
            className="text-xs font-bold text-amber-200 underline shrink-0 ms-auto"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* شات الدردشة العامة */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col h-[480px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 text-slate-300 text-sm font-bold">
            <MessageCircle size={16} /> الدردشة العامة
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <MessageCircle size={28} className="text-slate-600 mb-3" />
                <p className="text-sm font-bold text-slate-300">
                  {!loaded && !loadError
                    ? "جارٍ تحميل الرسائل..."
                    : loadError
                      ? "تعذّر الاتصال بالخادم. نعيد المحاولة تلقائيًا..."
                      : "لا توجد رسائل حالياً — كن أول من يكتب"}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-cyan-300">{m.sender}</span>
                    <span className="text-[10px] text-slate-500">{m.time}</span>
                  </div>
                  <p className="text-slate-200 mt-0.5">{m.text}</p>
                </div>
              ))
            )}
          </div>
          {(sendError || (loadError && messages.length > 0)) && (
            <p
              role="alert"
              className="px-4 py-2 text-xs text-red-300 bg-red-950/40 border-t border-red-900/60"
            >
              {sendError || "انقطع الاتصال بالخادم، وقد لا تظهر الرسائل الجديدة. نعيد المحاولة تلقائيًا..."}
            </p>
          )}
          <div className="flex items-center gap-2 p-3 border-t border-slate-800">
            <input
              value={draft}
              maxLength={500}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void send()}
              placeholder={
                isGuest ? "سجّل الدخول لإرسال رسالة..." : "اكتب رسالتك..."
              }
              className="flex-1 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => void send()}
              disabled={sending}
              aria-label="إرسال"
              className={`p-2 rounded-lg transition-colors ${isGuest || sending ? "bg-slate-700 text-slate-500" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* البحث الفعلي عن اللاعبين والأندية */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-sm font-bold text-slate-300 mb-3">
            البحث عن لاعبين / أندية
          </h2>
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اسم اللاعب أو النادي..."
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2 pe-9 ps-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {query.trim() === "" ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-500 text-xs">
                اكتب اسم للبحث عن اللاعبين أو الأندية المسجلة
              </div>
            ) : !hasSearchResults ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Search size={22} className="text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-300">
                  لا توجد نتائج مطابقة
                </p>
              </div>
            ) : (
              <>
                {filteredUsers.length > 0 && (
                  <div className="mb-2">
                    <span className="text-[11px] text-slate-400 font-bold block mb-1">
                      اللاعبون
                    </span>
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => onSelectUser && onSelectUser(user.id)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 cursor-pointer transition-colors mb-1"
                      >
                        <User size={14} className="text-cyan-400 shrink-0" />
                        <span className="text-xs text-slate-200 font-medium truncate">
                          {user.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredClubs.length > 0 && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold block mb-1">
                      الأندية
                    </span>
                    {filteredClubs.map((club) => (
                      <div
                        key={club.id}
                        onClick={() => onSelectClub && onSelectClub(club.id)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 cursor-pointer transition-colors mb-1"
                      >
                        <Shield size={14} className="text-blue-400 shrink-0" />
                        <span className="text-xs text-slate-200 font-medium truncate">
                          {club.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showGuestAlert && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setShowGuestAlert(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"
          >
            <Lock size={28} className="mx-auto text-amber-400 mb-3" />
            <h3 className="text-sm font-bold text-white mb-1">
              يلزم تسجيل الدخول
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              لإرسال الرسائل في الشات يجب تسجيل الدخول أو إنشاء حساب.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowGuestAlert(false)}
                className="flex-1 py-2 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  setShowGuestAlert(false);
                  onRequireLogin();
                }}
                className="flex-1 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                تسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
