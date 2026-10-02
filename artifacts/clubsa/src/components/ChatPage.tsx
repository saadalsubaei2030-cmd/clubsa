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
  ArrowDownLeft,
  Check,
  CircleUserRound,
  Clock3,
  Lock,
  MessageCircle,
  MessageSquareText,
  Search,
  Send,
  ShieldCheck,
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

function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  return src ? (
    <img
      src={src}
      alt=""
      className={`${sizeClass} rounded-full border border-white/10 object-cover`}
      data-testid={`img-avatar-${name}`}
    />
  ) : (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-teal-200/15 bg-teal-300/10 font-bold text-teal-100`} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

function PersonRow({
  user,
  selected = false,
  relationshipStatus,
  children,
  onSelect,
}: {
  user: { id: string; name: string; username: string; avatar: string | null };
  selected?: boolean;
  relationshipStatus?: "none" | "incoming" | "outgoing" | "accepted";
  children?: ReactNode;
  onSelect?: () => void;
}) {
  const relationshipLabel = {
    none: "غير مرتبط",
    incoming: "طلب وارد",
    outgoing: "طلب مرسل",
    accepted: "صديق",
  } as const;
  return (
    <div
      data-testid={`row-user-${user.id}`}
      className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
        selected ? "border-teal-200/25 bg-teal-200/[0.08]" : "border-transparent bg-[#101d24] hover:border-white/10"
      }`}
    >
      {onSelect ? (
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-right" data-testid={`button-open-chat-${user.id}`} aria-label={`افتح محادثة ${user.name}`}>
          <Avatar name={user.name} src={user.avatar} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[#edf5f2]" data-testid={`text-name-${user.id}`}>{user.name}</span>
            <span className="mt-0.5 block truncate text-xs text-[#8ba19f]" data-testid={`text-username-${user.id}`}>@{user.username}</span>
          </span>
          <MessageCircle size={15} className={selected ? "text-teal-200" : "text-[#69827f]"} />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={user.name} src={user.avatar} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-[#edf5f2]" data-testid={`text-name-${user.id}`}>{user.name}</span>
            <span className="mt-0.5 block truncate text-xs text-[#8ba19f]" data-testid={`text-username-${user.id}`}>@{user.username}</span>
          </span>
        </div>
      )}
      {relationshipStatus && <span className="hidden shrink-0 text-[10px] text-[#829994] sm:inline" data-testid={`status-relationship-${user.id}`}>{relationshipLabel[relationshipStatus]}</span>}
      {children}
    </div>
  );
}

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

  return (
    <main dir="rtl" className="mx-auto max-w-6xl pb-12 text-[#eaf2ef]">
      <header className="mb-6 flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-teal-200/80">
            <ShieldCheck size={14} /> مجتمع موثوق للاعبين
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#f1f5ec] sm:text-3xl">الأصدقاء والرسائل</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#93a7a3]">ابحث عن لاعبين موثوقين، أرسل طلب صداقة، وتابع حديثك الخاص بعد القبول.</p>
        </div>
        {auth ? (
          <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-[#14232a] px-3 py-2 text-xs text-[#a8bfba] sm:self-auto" data-testid="status-account-ready">
            <span className="h-2 w-2 rounded-full bg-[#71c8ad]" />
            مرحباً، {auth.name}
          </div>
        ) : (
          <button type="button" onClick={onRequireLogin} data-testid="button-login-social" className="inline-flex items-center gap-2 self-start rounded-xl bg-teal-200 px-4 py-2.5 text-sm font-extrabold text-[#10211f] transition hover:bg-teal-100 sm:self-auto">
            <Lock size={15} /> سجّل الدخول للتواصل
          </button>
        )}
      </header>

      {!auth && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/[0.06] p-3.5 text-sm text-amber-100/90" data-testid="status-guest">
          <Lock size={17} className="mt-0.5 shrink-0 text-amber-200" />
          <p className="leading-6">تحتاج إلى ملف CLUBSA مكتمل لإدارة الأصدقاء وبدء محادثات خاصة. يمكنك استكشاف الشات المجتمعي أدناه كزائر.</p>
        </div>
      )}

      {relationshipError && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm text-rose-100" data-testid="status-social-error">
          <span>تعذّر إتمام الإجراء. تحقق من الاتصال ثم حاول مرة أخرى.</span>
          <button type="button" onClick={() => { sendRequest.reset(); acceptRequest.reset(); deleteFriend.reset(); sendPrivateMessage.reset(); }} className="rounded-lg p-1 text-rose-100 hover:bg-white/10" aria-label="إغلاق التنبيه" data-testid="button-dismiss-social-error"><X size={16} /></button>
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.86fr)_minmax(0,1.45fr)]" aria-label="الأصدقاء والمحادثة الخاصة">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-white/[0.09] bg-[#111e24] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#7f9994]">اكتشاف اللاعبين</p>
                <h2 className="mt-1 text-base font-extrabold">ابحث باسم المستخدم</h2>
              </div>
              <div className="rounded-xl bg-teal-200/10 p-2 text-teal-100"><Search size={17} /></div>
            </div>
            <label className="sr-only" htmlFor="social-search">اسم المستخدم</label>
            <div className="relative">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#728d87]" />
              <input
                id="social-search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="مثال: striker_23"
                autoComplete="off"
                dir="ltr"
                className="w-full rounded-xl border border-white/10 bg-[#0b171c] py-3 pe-10 ps-3 text-left text-sm text-[#edf5f2] outline-none transition placeholder:text-[#617975] focus:border-teal-200/50 focus:ring-2 focus:ring-teal-200/10"
                data-testid="input-user-search"
              />
              {searchInput && <button type="button" onClick={() => setSearchInput("")} aria-label="مسح البحث" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#78918c] hover:bg-white/10" data-testid="button-clear-search"><X size={14} /></button>}
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#78918c]">بحث دقيق عن اسم المستخدم، من حرفين إلى 24 حرفاً إنجليزياً أو رقماً أو شرطة سفلية.</p>

            <div className="mt-4 space-y-2" aria-live="polite">
              {!trimmedQuery ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center" data-testid="status-search-idle">
                  <CircleUserRound size={22} className="mx-auto mb-2 text-[#66817b]" />
                  <p className="text-xs text-[#8da29d]">ابدأ بكتابة اسم مستخدم للعثور على اللاعبين.</p>
                </div>
              ) : trimmedQuery.length < 2 ? (
                <p className="rounded-xl bg-[#0c181d] px-3 py-3 text-xs text-[#a2b5b0]" data-testid="status-search-minimum">أدخل حرفين على الأقل لبدء البحث.</p>
              ) : !validUsernameQuery ? (
                <p className="rounded-xl border border-amber-200/10 bg-amber-200/[0.04] px-3 py-3 text-xs leading-5 text-amber-100/80" data-testid="status-search-invalid">استخدم من حرفين إلى 24 حرفاً إنجليزياً أو رقماً أو شرطة سفلية فقط.</p>
              ) : searchQuery.isLoading ? (
                <div className="space-y-2" role="status" data-testid="status-search-loading">
                  {[0, 1].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-[#0c181d] p-3"><div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.07]" /><div className="flex-1 space-y-2"><div className="h-3 w-2/5 animate-pulse rounded bg-white/[0.07]" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.05]" /></div></div>)}
                </div>
              ) : searchQuery.isError ? (
                <div className="rounded-xl border border-rose-200/10 bg-rose-200/[0.04] px-3 py-3 text-xs text-rose-100" role="alert" data-testid="status-search-error">
                  لم نتمكن من جلب نتائج البحث.
                  <button type="button" onClick={() => void searchQuery.refetch()} className="ms-2 font-bold underline underline-offset-2" data-testid="button-retry-search">إعادة المحاولة</button>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center" data-testid="status-search-empty">
                  <Search size={20} className="mx-auto mb-2 text-[#66817b]" />
                  <p className="text-xs text-[#8da29d]">لا توجد حسابات مطابقة لـ <b dir="ltr" className="text-[#d7e6e1]">{trimmedQuery}</b>.</p>
                </div>
              ) : (
                searchResults.map((user) => (
                  <PersonRow key={user.id} user={user} relationshipStatus={user.relationshipStatus}>
                    {user.relationshipStatus === "none" && (
                      <button type="button" disabled={!auth || sendRequest.isPending} onClick={() => sendRequest.mutate({ userId: user.id }, { onSuccess: refreshRelationships })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-200 px-2.5 py-2 text-[11px] font-extrabold text-[#10211f] transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50" data-testid={`button-request-${user.id}`}>
                        <UserPlus size={14} /> إضافة
                      </button>
                    )}
                    {user.relationshipStatus === "incoming" && (
                      <button type="button" disabled={!auth || acceptRequest.isPending} onClick={() => acceptRequest.mutate({ userId: user.id }, { onSuccess: refreshRelationships })} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-200 px-2.5 py-2 text-[11px] font-extrabold text-[#10211f] transition hover:bg-teal-100 disabled:opacity-50" data-testid={`button-accept-search-${user.id}`}>
                        <Check size={14} /> قبول
                      </button>
                    )}
                    {user.relationshipStatus === "outgoing" && (
                      <button type="button" disabled={!auth || deleteFriend.isPending} onClick={() => deleteFriend.mutate({ userId: user.id }, { onSuccess: refreshRelationships })} className="shrink-0 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-bold text-[#a9bbb6] transition hover:border-rose-200/20 hover:text-rose-100 disabled:opacity-50" data-testid={`button-cancel-search-${user.id}`}>
                        إلغاء الطلب
                      </button>
                    )}
                    {user.relationshipStatus === "accepted" && (
                      <button type="button" onClick={() => setSelectedFriendId(user.id)} className="shrink-0 rounded-lg border border-teal-100/15 px-2.5 py-2 text-[11px] font-bold text-teal-100 transition hover:bg-teal-100/10" data-testid={`button-message-search-${user.id}`}>
                        مراسلة
                      </button>
                    )}
                  </PersonRow>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.09] bg-[#111e24] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.12)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#7f9994]">دائرتك</p>
                <h2 className="mt-1 flex items-center gap-2 text-base font-extrabold"><UsersRound size={16} className="text-teal-100" /> الأصدقاء</h2>
              </div>
              <span className="rounded-full bg-[#20332f] px-2.5 py-1 text-xs font-bold text-teal-100" data-testid="text-friend-count">{friends.length}</span>
            </div>
            {!auth ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center" data-testid="status-friends-guest">
                <Lock size={19} className="mx-auto mb-2 text-[#78918c]" />
                <p className="text-xs text-[#8da29d]">سجّل الدخول لعرض قائمة أصدقائك.</p>
              </div>
            ) : friendsQuery.isLoading ? (
              <div className="space-y-2" role="status" data-testid="status-friends-loading">
                {[0, 1, 2].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-[#0c181d] p-3"><div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.07]" /><div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.07]" /></div>)}
              </div>
            ) : friendsQuery.isError ? (
              <div className="rounded-xl bg-rose-200/[0.05] px-3 py-3 text-xs text-rose-100" role="alert" data-testid="status-friends-error">
                تعذّر تحميل الأصدقاء.
                <button type="button" onClick={() => void friendsQuery.refetch()} className="ms-2 font-bold underline" data-testid="button-retry-friends">إعادة المحاولة</button>
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center" data-testid="status-friends-empty">
                <UsersRound size={20} className="mx-auto mb-2 text-[#66817b]" />
                <p className="text-xs text-[#8da29d]">لا يوجد أصدقاء بعد. ابحث عن لاعب وابدأ بالتواصل.</p>
              </div>
            ) : (
              <div className="space-y-2" data-testid="list-friends">
                {friends.map((friend) => (
                  <PersonRow key={friend.id} user={friend} selected={friend.id === selectedFriendId} onSelect={() => setSelectedFriendId(friend.id)}>
                    <button type="button" disabled={deleteFriend.isPending} onClick={() => {
                      if (selectedFriendId === friend.id) setSelectedFriendId("");
                      deleteFriend.mutate({ userId: friend.id }, { onSuccess: refreshRelationships });
                    }} aria-label={`إزالة ${friend.name} من الأصدقاء`} className="shrink-0 rounded-lg p-2 text-[#728b85] transition hover:bg-rose-200/10 hover:text-rose-100 disabled:opacity-40" data-testid={`button-remove-friend-${friend.id}`}>
                      <Trash2 size={15} />
                    </button>
                  </PersonRow>
                ))}
              </div>
            )}
          </section>

          {auth && (
            <section className="rounded-2xl border border-white/[0.09] bg-[#111e24] p-4 sm:p-5" aria-label="طلبات الصداقة">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-extrabold"><ArrowDownLeft size={16} className="text-[#c6a878]" /> طلبات الصداقة</h2>
                <span className="text-[11px] text-[#819792]" data-testid="text-request-count">{incomingRequests.length + outgoingRequests.length} معلّق</span>
              </div>
              {friendsQuery.isLoading ? (
                <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" data-testid="status-requests-loading" />
              ) : friendsQuery.isError ? (
                <p className="text-xs text-rose-100" data-testid="status-requests-error">طلبات الصداقة غير متاحة حالياً.</p>
              ) : incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <p className="rounded-xl bg-[#0c181d] px-3 py-3 text-xs text-[#829994]" data-testid="status-requests-empty">لا توجد طلبات معلّقة.</p>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold text-[#cdb687]">وصلتك</p>
                      <div className="space-y-2">{incomingRequests.map((user) => (
                        <PersonRow key={user.id} user={user}>
                          <button type="button" disabled={acceptRequest.isPending} onClick={() => acceptRequest.mutate({ userId: user.id }, { onSuccess: refreshRelationships })} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#d3bb88] px-2.5 py-2 text-[11px] font-extrabold text-[#251f15] transition hover:bg-[#e2d0a8] disabled:opacity-50" data-testid={`button-accept-${user.id}`}><Check size={14} /> قبول</button>
                        </PersonRow>
                      ))}</div>
                    </div>
                  )}
                  {outgoingRequests.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-bold text-[#829994]">أرسلتها</p>
                      <div className="space-y-2">{outgoingRequests.map((user) => (
                        <PersonRow key={user.id} user={user}>
                          <button type="button" disabled={deleteFriend.isPending} onClick={() => deleteFriend.mutate({ userId: user.id }, { onSuccess: refreshRelationships })} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-bold text-[#a4b6b1] transition hover:border-rose-200/20 hover:text-rose-100 disabled:opacity-50" data-testid={`button-cancel-${user.id}`}><X size={13} /> إلغاء</button>
                        </PersonRow>
                      ))}</div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </aside>

        <section className="flex min-h-[500px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111e24] shadow-[0_16px_48px_rgba(0,0,0,0.16)] sm:min-h-[660px]" aria-label="المحادثة الخاصة">
          {selectedFriend ? (
            <>
              <header className="flex items-center gap-3 border-b border-white/[0.08] bg-[#14232a] px-4 py-4 sm:px-5">
                <Avatar name={selectedFriend.name} src={selectedFriend.avatar} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-extrabold" data-testid={`text-conversation-name-${selectedFriend.id}`}>{selectedFriend.name}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8ba19b]"><span className="h-1.5 w-1.5 rounded-full bg-[#71c8ad]" /> صديق موثّق · محادثة خاصة</p>
                </div>
                <button type="button" onClick={() => setSelectedFriendId("")} aria-label="إغلاق المحادثة" className="rounded-lg p-2 text-[#819792] transition hover:bg-white/[0.06] hover:text-white lg:hidden" data-testid="button-close-conversation"><X size={17} /></button>
              </header>
              <div ref={privateScrollRef} className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(43,90,79,0.08),transparent_55%)] px-4 py-5 sm:px-6" aria-live="polite" data-testid="list-private-messages">
                {privateMessagesQuery.isLoading ? (
                  <div className="space-y-4 py-2" role="status" data-testid="status-private-loading">
                    <div className="ms-auto h-14 w-3/5 animate-pulse rounded-2xl bg-white/[0.06]" />
                    <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-teal-100/[0.07]" />
                    <div className="ms-auto h-12 w-1/2 animate-pulse rounded-2xl bg-white/[0.06]" />
                  </div>
                ) : privateMessagesQuery.isError ? (
                  <div className="flex h-full min-h-48 flex-col items-center justify-center text-center" role="alert" data-testid="status-private-error">
                    <MessageSquareText size={25} className="mb-3 text-rose-200/70" />
                    <p className="text-sm font-bold">تعذّر تحميل المحادثة</p>
                    <button type="button" onClick={() => void privateMessagesQuery.refetch()} className="mt-2 text-xs font-bold text-teal-100 underline underline-offset-4" data-testid="button-retry-private">أعد المحاولة</button>
                  </div>
                ) : privateMessagesQuery.data?.messages.length ? (
                  privateMessagesQuery.data.messages.map((message) => {
                    const ownMessage = message.senderId === auth?.id;
                    return (
                      <div key={message.id} className={`flex ${ownMessage ? "justify-start" : "justify-end"}`} data-testid={`row-message-${message.id}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${ownMessage ? "rounded-tr-sm bg-[#21352f] text-[#e9f3ed]" : "rounded-tl-sm bg-[#d0bd90] text-[#251f18]"}`}>
                          <p className="whitespace-pre-wrap break-words text-sm leading-6" data-testid={`text-message-content-${message.id}`}>{message.content}</p>
                          <time dateTime={message.createdAt} className={`mt-1 block text-left text-[10px] ${ownMessage ? "text-[#93afa4]" : "text-[#6b604c]"}`} data-testid={`text-message-time-${message.id}`}>{exactTime(message.createdAt)}</time>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center px-4 text-center" data-testid="status-private-empty">
                    <div className="mb-4 rounded-2xl border border-teal-100/10 bg-teal-100/[0.04] p-4 text-teal-100"><MessageCircle size={24} /></div>
                    <p className="text-sm font-extrabold">بداية حديث جديد</p>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-[#829994]">لا توجد رسائل بينكما حتى الآن. ابدأ برسالة قصيرة وتابعوا التنسيق هنا.</p>
                  </div>
                )}
              </div>
              <div className="border-t border-white/[0.08] bg-[#14232a] p-3 sm:p-4">
                {!auth ? (
                  <button type="button" onClick={onRequireLogin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#20352f] px-4 py-3 text-sm font-bold text-teal-100" data-testid="button-login-private"><Lock size={15} /> سجّل الدخول للرد</button>
                ) : (
                  <>
                    {sendPrivateMessage.isError && <p role="alert" className="mb-2 text-xs text-rose-200" data-testid="status-send-private-error">لم تُرسل الرسالة. تحقق من الاتصال وحاول مجدداً.</p>}
                    <div className="flex items-end gap-2">
                      <label className="sr-only" htmlFor="private-message">اكتب رسالة خاصة</label>
                      <textarea
                        id="private-message"
                        rows={1}
                        value={privateDraft}
                        onChange={(event) => setPrivateDraft(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handlePrivateSend(); } }}
                        maxLength={4000}
                        placeholder="اكتب رسالتك هنا..."
                        className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-white/10 bg-[#0b171c] px-3.5 py-3 text-sm leading-5 text-[#edf5f2] outline-none placeholder:text-[#617975] focus:border-teal-200/40"
                        data-testid="input-private-message"
                      />
                      <button type="button" onClick={handlePrivateSend} disabled={!privateDraft.trim() || privateDraft.trim().length > 4000 || sendPrivateMessage.isPending} aria-label="إرسال الرسالة" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-200 text-[#10211f] transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:bg-[#263833] disabled:text-[#698079]" data-testid="button-send-private">
                        {sendPrivateMessage.isPending ? <Clock3 size={17} className="animate-pulse" /> : <Send size={17} />}
                      </button>
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-[#718883]">
                      <span>Enter للإرسال · Shift + Enter لسطر جديد</span>
                      <span data-testid="text-private-character-count">{privateDraft.length}/4000</span>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center" data-testid="status-conversation-unselected">
              <div className="relative mb-5">
                <div className="absolute inset-0 scale-150 rounded-full bg-teal-200/[0.04]" />
                <div className="relative rounded-2xl border border-teal-100/10 bg-[#172a2b] p-5 text-teal-100"><MessageSquareText size={29} strokeWidth={1.5} /></div>
              </div>
              <p className="text-lg font-extrabold">مساحتك الخاصة تبدأ هنا</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#8ba09a]">
                {auth ? "اختر صديقاً من قائمتك لعرض محادثتكما الخاصة وإرسال الرسائل." : "سجّل الدخول عبر ملف CLUBSA لعرض الأصدقاء والمحادثات الخاصة."}
              </p>
              {!auth && <button type="button" onClick={onRequireLogin} className="mt-5 rounded-xl bg-teal-200 px-4 py-2.5 text-sm font-extrabold text-[#10211f] transition hover:bg-teal-100" data-testid="button-login-conversation">تسجيل الدخول</button>}
              {auth && friends.length === 0 && !friendsQuery.isLoading && <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-[11px] text-[#9ab0aa]"><UserPlus size={14} /> ابدأ بإضافة لاعب من البحث</p>}
            </div>
          )}
        </section>
      </section>

      <section className="mt-8 border-t border-white/[0.08] pt-7" aria-label="الدردشة المجتمعية">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-[10px] font-bold tracking-[0.16em] text-[#c3ad7f]">المساحة المفتوحة</p>
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><MessageCircle size={18} className="text-[#d0bd90]" /> الشات المجتمعي</h2>
          </div>
          <p className="text-xs text-[#879b96]">تواصل مع اللاعبين ورؤساء الأندية · تمر الرسائل على فلتر الكلمات الممنوعة</p>
        </div>
        {isGuest && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-200/15 bg-amber-200/[0.05] px-4 py-3 text-xs text-amber-100/90" data-testid="status-public-guest">
            <Lock size={14} className="shrink-0 text-amber-200" />
            يمكنك قراءة الرسائل كزائر. سجّل الدخول للتفاعل.
            <button type="button" onClick={onRequireLogin} className="me-auto shrink-0 font-bold text-amber-100 underline underline-offset-2" data-testid="button-login-public">تسجيل الدخول</button>
          </div>
        )}
        <div className="flex h-[390px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111e24]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 text-sm font-bold text-[#d1ddd7]">
            <span className="flex items-center gap-2"><MessageCircle size={15} className="text-[#d0bd90]" /> دردشة CLUBSA المفتوحة</span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-[#86a098]"><span className="h-1.5 w-1.5 rounded-full bg-[#71c8ad]" /> مباشرة</span>
          </div>
          <div ref={publicScrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite" data-testid="list-public-messages">
            {publicMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center" data-testid="status-public-empty">
                <MessageCircle size={26} className="mb-3 text-[#66817b]" />
                <p className="text-sm font-bold text-[#c4d1cb]">لا توجد رسائل حالياً</p>
                <p className="mt-1 text-xs text-[#819691]">كن أول من يبدأ الحديث.</p>
              </div>
            ) : publicMessages.map((message) => (
              <div key={message.id} className="text-sm" data-testid={`row-public-message-${message.id}`}>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-teal-100" data-testid={`text-public-sender-${message.id}`}>{message.sender}</span>
                  <span className="text-[10px] text-[#718883]">{message.time}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-[#d3ddd8]" data-testid={`text-public-content-${message.id}`}>{message.text}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.08] p-3">
            <label className="sr-only" htmlFor="public-message">اكتب في الشات المجتمعي</label>
            <input
              id="public-message"
              value={publicDraft}
              onChange={(event) => setPublicDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") handlePublicSend(); }}
              onFocus={() => { if (!auth) setShowGuestAlert(true); }}
              placeholder={isGuest ? "سجّل الدخول لإرسال رسالة..." : "اكتب رسالتك..."}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b171c] px-3.5 py-2.5 text-sm text-[#edf5f2] outline-none placeholder:text-[#617975] focus:border-teal-200/40"
              data-testid="input-public-message"
            />
            <button type="button" onClick={handlePublicSend} aria-label="إرسال رسالة عامة" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d0bd90] text-[#251f18] transition hover:bg-[#e0cda0]" data-testid="button-send-public"><Send size={16} /></button>
          </div>
        </div>
      </section>

      {showGuestAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071114]/75 px-4 backdrop-blur-sm" onClick={() => setShowGuestAlert(false)} data-testid="dialog-guest-login">
          <div role="dialog" aria-modal="true" aria-labelledby="guest-dialog-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#14232a] p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200/10 text-amber-100"><Lock size={21} /></div>
            <h3 id="guest-dialog-title" className="text-base font-extrabold">يلزم ملف CLUBSA</h3>
            <p className="mb-5 mt-2 text-sm leading-6 text-[#9aada7]">لإرسال الرسائل والتواصل مع الأصدقاء، أكمل تسجيل الدخول وملفك الشخصي.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowGuestAlert(false)} className="flex-1 rounded-xl border border-white/10 bg-[#1b2c31] py-2.5 text-sm font-bold text-[#bdcbc5] transition hover:bg-[#24383b]" data-testid="button-dismiss-guest">إلغاء</button>
              <button type="button" onClick={() => { setShowGuestAlert(false); onRequireLogin(); }} className="flex-1 rounded-xl bg-teal-200 py-2.5 text-sm font-extrabold text-[#10211f] transition hover:bg-teal-100" data-testid="button-continue-login">تسجيل الدخول</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}