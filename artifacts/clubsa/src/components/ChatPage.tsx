import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAcceptFriendRequest,
  useCreateFriendRequest,
  useDeleteFriend,
  useGetFriends,
  useGetPrivateMessages,
  useSearchUsers,
  useSendPrivateMessage,
  getGetFriendsQueryKey,
  getGetPrivateMessagesQueryKey,
  getSearchUsersQueryKey,
} from "@workspace/api-client-react";
import {
  Check,
  Lock,
  MessageCircle,
  Search,
  Send,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { FORBIDDEN_WORDS } from "@/data";
import { getChat, sendChatMessage } from "@/lib/mockData";
import type { AuthUser, ChatMessage } from "@/types";

function filterMessage(text: string): string {
  let result = text;
  FORBIDDEN_WORDS.forEach((word) => {
    result = result.replace(new RegExp(word, "gi"), "*".repeat(word.length));
  });
  return result;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  return `قبل ${Math.floor(hours / 24)} يوم`;
}

function exactTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
}

function Avatar({ name, src }: { name: string; src?: string | null }) {
  return src ? (
    <img
      src={src}
      alt=""
      className="h-9 w-9 shrink-0 rounded-full border border-slate-700 object-cover"
      data-testid={`img-avatar-${name}`}
    />
  ) : (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-cyan-300"
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}

function PersonRow({
  user,
  selected = false,
  children,
  onSelect,
}: {
  user: { id: string; name: string; username: string; avatar: string | null };
  selected?: boolean;
  children?: ReactNode;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <Avatar name={user.name} src={user.avatar} />
      <span className="min-w-0 flex-1 text-right">
        <span className="block truncate text-sm font-bold text-slate-100" data-testid={`text-name-${user.id}`}>{user.name}</span>
        <span className="block truncate text-xs text-slate-500" data-testid={`text-username-${user.id}`}>@{user.username}</span>
      </span>
    </>
  );
  return (
    <div
      data-testid={`row-user-${user.id}`}
      className={`flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
        selected ? "border-cyan-500/40 bg-cyan-500/10" : "border-slate-800 bg-slate-800/40"
      }`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2"
          data-testid={`button-open-chat-${user.id}`}
          aria-label={`افتح محادثة ${user.name}`}
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">{body}</div>
      )}
      {children}
    </div>
  );
}

function EmptyState({ icon, text, testId }: { icon: ReactNode; text: string; testId?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-slate-400" data-testid={testId}>
      {icon}
      <p className="text-sm font-bold text-slate-300">{text}</p>
    </div>
  );
}

const smallButton =
  "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export default function ChatPage({ auth, onRequireLogin }: { auth: AuthUser | null; onRequireLogin: () => void }) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [privateDraft, setPrivateDraft] = useState("");
  const [publicDraft, setPublicDraft] = useState("");
  const [showGuestAlert, setShowGuestAlert] = useState(false);
  const [publicMessages, setPublicMessages] = useState<ChatMessage[]>(() =>
    getChat().map((message) => ({ id: message.id, sender: message.sender_name, text: message.text, time: timeAgo(message.created_at) })),
  );
  const publicScrollRef = useRef<HTMLDivElement>(null);
  const privateScrollRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = searchInput.trim();
  const validUsernameQuery = trimmedQuery.length >= 2 && trimmedQuery.length <= 24 && /^[a-zA-Z0-9_]+$/.test(trimmedQuery);
  const friendsQuery = useGetFriends({
    query: { enabled: !!auth, queryKey: getGetFriendsQueryKey(), refetchInterval: 10_000 },
  });
  const friendsData = friendsQuery.data;
  const friends = friendsData?.friends ?? [];
  const incomingRequests = friendsData?.incomingRequests ?? [];
  const outgoingRequests = friendsData?.outgoingRequests ?? [];
  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId) ?? null;
  const searchQuery = useSearchUsers(
    { q: trimmedQuery },
    { query: { enabled: !!auth && validUsernameQuery, queryKey: getSearchUsersQueryKey({ q: trimmedQuery }) } },
  );
  const privateMessagesQuery = useGetPrivateMessages(selectedFriendId, {
    query: {
      enabled: !!auth && !!selectedFriendId && !!selectedFriend,
      queryKey: getGetPrivateMessagesQueryKey(selectedFriendId),
      refetchInterval: 3000,
    },
  });

  useEffect(() => {
    setSelectedFriendId("");
    setPrivateDraft("");
    void queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getSearchUsersQueryKey() });
  }, [auth?.id, queryClient]);

  const refreshRelationships = () => {
    void queryClient.invalidateQueries({ queryKey: getGetFriendsQueryKey() });
    if (trimmedQuery.length > 0) {
      void queryClient.invalidateQueries({ queryKey: getSearchUsersQueryKey({ q: trimmedQuery }) });
    }
  };

  const sendRequest = useCreateFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const deleteFriend = useDeleteFriend();
  const sendPrivateMessage = useSendPrivateMessage();

  useEffect(() => {
    if (privateScrollRef.current) privateScrollRef.current.scrollTop = privateScrollRef.current.scrollHeight;
  }, [privateMessagesQuery.data?.messages.length, selectedFriendId]);

  useEffect(() => {
    if (publicScrollRef.current) publicScrollRef.current.scrollTop = publicScrollRef.current.scrollHeight;
  }, [publicMessages.length]);

  const allMutationErrors = useMemo(
    () => [sendRequest.error, acceptRequest.error, deleteFriend.error, sendPrivateMessage.error].filter(Boolean),
    [sendRequest.error, acceptRequest.error, deleteFriend.error, sendPrivateMessage.error],
  );

  const handlePrivateSend = () => {
    const content = privateDraft.trim();
    if (!auth) {
      setShowGuestAlert(true);
      return;
    }
    if (!selectedFriend || !content || content.length > 4000 || sendPrivateMessage.isPending) return;
    sendPrivateMessage.mutate(
      { data: { receiverId: selectedFriend.id, content } },
      {
        onSuccess: () => {
          setPrivateDraft("");
          void queryClient.invalidateQueries({ queryKey: getGetPrivateMessagesQueryKey(selectedFriend.id) });
        },
      },
    );
  };

  const handlePublicSend = () => {
    if (!auth) {
      setShowGuestAlert(true);
      return;
    }
    const content = publicDraft.trim();
    if (!content) return;
    const message = sendChatMessage(auth.id, auth.name, filterMessage(content));
    setPublicMessages((current) => [...current, { id: message.id, sender: message.sender_name, text: message.text, time: "الآن" }]);
    setPublicDraft("");
  };

  const relationshipError = allMutationErrors.length > 0;
  const searchResults = searchQuery.data?.users ?? [];
  const isGuest = !auth;
  const inPrivate = Boolean(selectedFriend);

  return (
    <main dir="rtl" className="mx-auto max-w-6xl pb-12 text-slate-100">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-white sm:text-4xl" style={{ fontFamily: "Cairo, sans-serif" }}>الشات المجتمعي</h1>
        <p className="mt-2 text-sm text-slate-400">تواصل مع اللاعبين ورؤساء الأندية – رسائلك تمر تلقائيًا على فلتر الكلمات الممنوعة.</p>
      </header>

      {isGuest && (
        <div
          className="mb-5 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-950/30 px-4 py-3 text-xs text-amber-200"
          data-testid="status-guest"
        >
          <Lock size={14} className="shrink-0 text-amber-400" />
          <span>أنت تتصفح كزائر – يمكنك قراءة الرسائل ولكن لا يمكنك الكتابة. سجّل الدخول للتفاعل.</span>
          <button
            type="button"
            onClick={onRequireLogin}
            className="me-auto shrink-0 font-bold text-amber-200 underline underline-offset-2"
            data-testid="button-login-public"
          >
            تسجيل الدخول
          </button>
        </div>
      )}

      {relationshipError && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-200"
          data-testid="status-social-error"
        >
          <span>تعذّر إتمام الإجراء. تحقق من الاتصال ثم حاول مرة أخرى.</span>
          <button
            type="button"
            onClick={() => { sendRequest.reset(); acceptRequest.reset(); deleteFriend.reset(); sendPrivateMessage.reset(); }}
            className="rounded-lg p-1 hover:bg-white/10"
            aria-label="إغلاق التنبيه"
            data-testid="button-dismiss-social-error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* الدردشة */}
        <section className="flex h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60" aria-label="الدردشة">
          <div className="flex items-center gap-1 border-b border-slate-800 px-3 py-2">
            <button
              type="button"
              onClick={() => setSelectedFriendId("")}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                inPrivate ? "text-slate-400 hover:text-slate-200" : "text-slate-100"
              }`}
              data-testid="tab-public-chat"
            >
              <MessageCircle size={15} className="text-slate-400" /> الدردشة العامة
            </button>
            {selectedFriend && (
              <>
                <span className="text-slate-600">/</span>
                <span className="truncate px-2 text-sm font-bold text-cyan-300" data-testid={`text-conversation-name-${selectedFriend.id}`}>
                  {selectedFriend.name}
                </span>
              </>
            )}
          </div>

          {inPrivate && selectedFriend ? (
            <>
              <div ref={privateScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="list-private-messages">
                {privateMessagesQuery.isLoading ? (
                  <p className="py-10 text-center text-sm text-slate-500" role="status" data-testid="status-private-loading">جارٍ تحميل المحادثة...</p>
                ) : privateMessagesQuery.isError ? (
                  <div className="py-10 text-center" role="alert" data-testid="status-private-error">
                    <p className="text-sm font-bold text-slate-300">تعذّر تحميل المحادثة</p>
                    <button type="button" onClick={() => void privateMessagesQuery.refetch()} className="mt-2 text-xs font-bold text-cyan-300 underline" data-testid="button-retry-private">أعد المحاولة</button>
                  </div>
                ) : privateMessagesQuery.data?.messages.length ? (
                  privateMessagesQuery.data.messages.map((message) => {
                    const ownMessage = message.senderId === auth?.id;
                    return (
                      <div key={message.id} className={`flex ${ownMessage ? "justify-start" : "justify-end"}`} data-testid={`row-message-${message.id}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${ownMessage ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-100"}`}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6" data-testid={`text-message-content-${message.id}`}>{message.content}</p>
                          <time dateTime={message.createdAt} className="mt-1 block text-left text-[10px] opacity-60" data-testid={`text-message-time-${message.id}`}>{exactTime(message.createdAt)}</time>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState icon={<MessageCircle size={28} />} text="لا توجد رسائل بعد. ابدأ المحادثة." testId="status-private-empty" />
                )}
              </div>
              <div className="border-t border-slate-800 p-3">
                {sendPrivateMessage.isError && (
                  <p role="alert" className="mb-2 text-xs text-rose-300" data-testid="status-send-private-error">لم تُرسل الرسالة. حاول مجدداً.</p>
                )}
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor="private-message">اكتب رسالة خاصة</label>
                  <input
                    id="private-message"
                    value={privateDraft}
                    onChange={(event) => setPrivateDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") handlePrivateSend(); }}
                    maxLength={4000}
                    placeholder="اكتب رسالتك..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                    data-testid="input-private-message"
                  />
                  <button
                    type="button"
                    onClick={handlePrivateSend}
                    disabled={!privateDraft.trim() || sendPrivateMessage.isPending}
                    aria-label="إرسال الرسالة"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    data-testid="button-send-private"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div ref={publicScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="list-public-messages">
                {publicMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <EmptyState icon={<MessageCircle size={28} />} text="لا توجد بيانات حالياً" testId="status-public-empty" />
                  </div>
                ) : (
                  publicMessages.map((message) => (
                    <div key={message.id} className="text-sm" data-testid={`row-public-message-${message.id}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-cyan-300" data-testid={`text-public-sender-${message.id}`}>{message.sender}</span>
                        <span className="text-[10px] text-slate-500">{message.time}</span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-slate-200" data-testid={`text-public-content-${message.id}`}>{message.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-slate-800 p-3">
                <label className="sr-only" htmlFor="public-message">اكتب في الشات المجتمعي</label>
                <input
                  id="public-message"
                  value={publicDraft}
                  onChange={(event) => setPublicDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") handlePublicSend(); }}
                  onFocus={() => { if (!auth) setShowGuestAlert(true); }}
                  placeholder={isGuest ? "سجّل الدخول لإرسال رسالة..." : "اكتب رسالتك..."}
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                  data-testid="input-public-message"
                />
                <button
                  type="button"
                  onClick={handlePublicSend}
                  aria-label="إرسال رسالة عامة"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isGuest ? "bg-slate-800 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-500"
                  }`}
                  data-testid="button-send-public"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </section>

        {/* البحث والأصدقاء */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-3 text-sm font-extrabold text-slate-100">البحث عن لاعبين</h2>
            <label className="sr-only" htmlFor="social-search">اسم المستخدم</label>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="social-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="اسم المستخدم (بالإنجليزية)..."
                autoComplete="off"
                dir="ltr"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 pe-9 ps-3 text-left text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                data-testid="input-user-search"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="مسح البحث"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-200"
                  data-testid="button-clear-search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2" aria-live="polite">
              {!trimmedQuery ? (
                <EmptyState icon={<Search size={24} />} text="لا توجد بيانات حالياً" testId="status-search-idle" />
              ) : !validUsernameQuery ? (
                <p className="rounded-xl bg-slate-800/50 px-3 py-3 text-xs text-slate-400" data-testid="status-search-invalid">
                  اكتب من حرفين إلى 24 حرفاً إنجليزياً أو رقماً أو شرطة سفلية.
                </p>
              ) : !auth ? (
                <p className="rounded-xl bg-slate-800/50 px-3 py-3 text-xs text-slate-400" data-testid="status-search-guest">
                  سجّل الدخول للبحث عن اللاعبين.
                </p>
              ) : searchQuery.isLoading ? (
                <p className="py-3 text-center text-xs text-slate-500" role="status" data-testid="status-search-loading">جارٍ البحث...</p>
              ) : searchQuery.isError ? (
                <p className="rounded-xl bg-rose-950/30 px-3 py-3 text-xs text-rose-200" role="alert" data-testid="status-search-error">
                  تعذّر جلب النتائج.
                  <button type="button" onClick={() => void searchQuery.refetch()} className="ms-2 font-bold underline" data-testid="button-retry-search">إعادة المحاولة</button>
                </p>
              ) : searchResults.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-500" data-testid="status-search-empty">لا توجد حسابات مطابقة.</p>
              ) : (
                searchResults.map((user) => (
                  <PersonRow key={user.id} user={user}>
                    {user.relationshipStatus === "none" && (
                      <button
                        type="button"
                        disabled={sendRequest.isPending}
                        onClick={() => sendRequest.mutate({ userId: user.id }, { onSuccess: refreshRelationships })}
                        className={`${smallButton} bg-blue-600 text-white hover:bg-blue-500`}
                        data-testid={`button-request-${user.id}`}
                      >
                        <UserPlus size={13} /> إضافة
                      </button>
                    )}
                    {user.relationshipStatus === "incoming" && (
                      <button
                        type="button"
                        disabled={acceptRequest.isPending}
                        onClick={() => acceptRequest.mutate({ userId: user.id }, { onSuccess: refreshRelationships })}
                        className={`${smallButton} bg-blue-600 text-white hover:bg-blue-500`}
                        data-testid={`button-accept-search-${user.id}`}
                      >
                        <Check size={13} /> قبول
                      </button>
                    )}
                    {user.relationshipStatus === "outgoing" && (
                      <button
                        type="button"
                        disabled={deleteFriend.isPending}
                        onClick={() => deleteFriend.mutate({ userId: user.id }, { onSuccess: refreshRelationships })}
                        className={`${smallButton} border border-slate-700 text-slate-300 hover:text-rose-300`}
                        data-testid={`button-cancel-search-${user.id}`}
                      >
                        إلغاء
                      </button>
                    )}
                    {user.relationshipStatus === "accepted" && (
                      <button
                        type="button"
                        onClick={() => setSelectedFriendId(user.id)}
                        className={`${smallButton} border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10`}
                        data-testid={`button-message-search-${user.id}`}
                      >
                        مراسلة
                      </button>
                    )}
                  </PersonRow>
                ))
              )}
            </div>
          </section>

          {auth && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-100">
                  <UsersRound size={15} className="text-cyan-300" /> الأصدقاء
                </h2>
                <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-cyan-300" data-testid="text-friend-count">{friends.length}</span>
              </div>
              {friendsQuery.isLoading ? (
                <p className="py-3 text-center text-xs text-slate-500" role="status" data-testid="status-friends-loading">جارٍ التحميل...</p>
              ) : friendsQuery.isError ? (
                <p className="rounded-xl bg-rose-950/30 px-3 py-3 text-xs text-rose-200" role="alert" data-testid="status-friends-error">
                  تعذّر تحميل الأصدقاء.
                  <button type="button" onClick={() => void friendsQuery.refetch()} className="ms-2 font-bold underline" data-testid="button-retry-friends">إعادة المحاولة</button>
                </p>
              ) : friends.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-500" data-testid="status-friends-empty">لا يوجد أصدقاء بعد.</p>
              ) : (
                <div className="space-y-2" data-testid="list-friends">
                  {friends.map((friend) => (
                    <PersonRow key={friend.id} user={friend} selected={friend.id === selectedFriendId} onSelect={() => setSelectedFriendId(friend.id)}>
                      <button
                        type="button"
                        disabled={deleteFriend.isPending}
                        onClick={() => {
                          if (selectedFriendId === friend.id) setSelectedFriendId("");
                          deleteFriend.mutate({ userId: friend.id }, { onSuccess: refreshRelationships });
                        }}
                        aria-label={`إزالة ${friend.name} من الأصدقاء`}
                        className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:text-rose-300 disabled:opacity-40"
                        data-testid={`button-remove-friend-${friend.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </PersonRow>
                  ))}
                </div>
              )}

              {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
                <div className="mt-4 space-y-2 border-t border-slate-800 pt-3" data-testid="text-request-count">
                  <p className="text-[11px] font-bold text-slate-400">طلبات الصداقة</p>
                  {incomingRequests.map((user) => (
                    <PersonRow key={user.id} user={user}>
                      <button
                        type="button"
                        disabled={acceptRequest.isPending}
                        onClick={() => acceptRequest.mutate({ userId: user.id }, { onSuccess: refreshRelationships })}
                        className={`${smallButton} bg-blue-600 text-white hover:bg-blue-500`}
                        data-testid={`button-accept-${user.id}`}
                      >
                        <Check size={13} /> قبول
                      </button>
                    </PersonRow>
                  ))}
                  {outgoingRequests.map((user) => (
                    <PersonRow key={user.id} user={user}>
                      <button
                        type="button"
                        disabled={deleteFriend.isPending}
                        onClick={() => deleteFriend.mutate({ userId: user.id }, { onSuccess: refreshRelationships })}
                        className={`${smallButton} border border-slate-700 text-slate-300 hover:text-rose-300`}
                        data-testid={`button-cancel-${user.id}`}
                      >
                        <X size={12} /> إلغاء
                      </button>
                    </PersonRow>
                  ))}
                </div>
              )}
            </section>
          )}
        </aside>
      </section>

      {showGuestAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setShowGuestAlert(false)}
          data-testid="dialog-guest-login"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-dialog-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center"
          >
            <h3 id="guest-dialog-title" className="text-base font-extrabold text-white" style={{ fontFamily: "Cairo, sans-serif" }}>سجّل الدخول للمتابعة</h3>
            <p className="mb-5 mt-2 text-sm leading-6 text-slate-400">للكتابة في الشات والتواصل مع اللاعبين، سجّل الدخول أو أنشئ حساباً.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowGuestAlert(false)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700"
                data-testid="button-dismiss-guest"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => { setShowGuestAlert(false); onRequireLogin(); }}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500"
                data-testid="button-continue-login"
              >
                تسجيل الدخول
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
