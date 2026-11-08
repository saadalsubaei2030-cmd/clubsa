import { getClubById } from "@/lib/mockData";
import type { AuthUser } from "@/types";

// الدليل الاجتماعي (بحث، ملفات، صداقات، رسائل خاصة) يعمل عبر خادم Replit.
// يمكن تغيير العنوان من متغير البيئة VITE_API_BASE_URL وقت البناء.
export const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "https://clubsa-api.onrender.com"
).replace(/\/+$/, "");

/* ───────────── الأنواع ───────────── */

export type SocialUser = {
  id: string;
  name: string;
  username: string | null;
  role: "president" | "player" | "scout";
  region: string;
  eaId: string | null;
  position: string | null;
  overall: number;
  clubId: string | null;
  clubName: string | null;
  isFreeAgent: boolean;
  avatar?: string | null;
  clubRank?: "member" | "vice" | "scout";
};

export type SocialClub = {
  id: string;
  name: string;
  region: string;
  logo?: string | null;
  presidentId: string;
  primaryColor: string;
  secondaryColor: string;
  wins: number;
  draws: number;
  losses: number;
  trophies: number;
  memberCount: number;
};

export type Relationship = "self" | "none" | "outgoing" | "incoming" | "friends";

export type FriendsState = {
  friends: SocialUser[];
  incoming: SocialUser[];
  outgoing: SocialUser[];
};

export type Conversation = {
  peer: SocialUser;
  lastText: string;
  lastAt: string;
  lastFromMe: boolean;
};

export type DirectMessage = {
  id: number;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
};

export type SyncPayload = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  region: string;
  eaId: string | null;
  position: string | null;
  overall: number;
  avatar: string | null;
  clubId: string | null;
  clubName: string | null;
  isFreeAgent: boolean;
  build?: unknown;
  club: {
    id: string;
    name: string;
    region: string;
    logo: string | null;
    primaryColor: string;
    secondaryColor: string;
    wins: number;
    draws: number;
    losses: number;
    trophies: number;
  } | null;
};

/* ───────────── المفتاح السري للمتصفح ───────────── */

// كل متصفح يملك مفتاحًا عشوائيًا يثبت أن الحساب له؛ الخادم يحفظ بصمته فقط.
const KEY_STORAGE = "clubsa_social_key";
let memoryKey: string | null = null;

function randomKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** يحفظ مفتاح هذا الجهاز بعد تسجيل الدخول (يصدره الخادم). */
export function setSocialKey(key: string): void {
  if (!/^[a-f0-9]{32}$/.test(key)) return;
  try {
    localStorage.setItem(KEY_STORAGE, key);
  } catch {
    // التخزين غير متاح: نحتفظ بالمفتاح في الذاكرة لهذه الجلسة.
  }
  memoryKey = key;
}

export function getSocialKey(): string {
  try {
    let key = localStorage.getItem(KEY_STORAGE);
    if (!key || !/^[a-f0-9]{32}$/.test(key)) {
      key = randomKey();
      localStorage.setItem(KEY_STORAGE, key);
    }
    return key;
  } catch {
    memoryKey ??= randomKey();
    return memoryKey;
  }
}

/* ───────────── الطلبات ───────────── */

export class SocialError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(`social_${status}_${code}`);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  base?: string;
  method?: string;
  body?: unknown;
  userId?: string | null;
  signal?: AbortSignal;
};

let lastPayload: SyncPayload | null = null;

async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.userId) {
    headers["x-clubsa-user"] = options.userId;
    headers["x-clubsa-key"] = getSocialKey();
  }
  const response = await fetch(`${API_BASE}${options.base ?? "/api/social"}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });
  if (!response.ok) {
    let code = "error";
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string") code = data.error;
    } catch {
      // الرد ليس JSON (مثلًا الخادم غير محدّث بعد)
    }
    throw new SocialError(response.status, code);
  }
  return (await response.json()) as T;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await send<T>(path, options);
  } catch (error) {
    // الحساب لم يُزامَن بعد على الخادم: نزامنه ثم نعيد المحاولة مرة واحدة.
    if (
      error instanceof SocialError &&
      error.status === 401 &&
      options.userId &&
      lastPayload &&
      lastPayload.id === options.userId
    ) {
      await syncProfile(lastPayload);
      return send<T>(path, options);
    }
    throw error;
  }
}

/* ───────────── المزامنة ───────────── */

function smallImage(value: string | null | undefined): string | null {
  return value && value.length <= 60_000 ? value : null;
}

export function buildSyncPayload(auth: AuthUser): SyncPayload {
  const club = auth.role === "president" && auth.clubId ? getClubById(auth.clubId) : null;
  return {
    id: auth.id,
    name: auth.name,
    username: auth.username ?? null,
    role: auth.role,
    region: auth.region,
    eaId: auth.eaId ?? null,
    position: auth.position ?? null,
    overall: auth.overall ?? 0,
    avatar: smallImage(auth.avatar),
    clubId: auth.clubId,
    clubName: auth.clubId ? auth.club : null,
    isFreeAgent: auth.isFreeAgent,
    build: auth.playerBuild ?? null,
    club:
      club && club.president_id === auth.id
        ? {
            id: club.id,
            name: club.name,
            region: club.region,
            logo: smallImage(club.logo),
            primaryColor: club.primary_color,
            secondaryColor: club.secondary_color,
            wins: club.wins,
            draws: club.draws,
            losses: club.losses,
            trophies: club.trophies,
          }
        : null,
  };
}

export async function syncProfile(payload: SyncPayload): Promise<void> {
  lastPayload = payload;
  const { id, ...body } = payload;
  await send<{ ok: true }>("/me", { method: "PUT", body, userId: id });
}

/* ───────────── البحث والملفات ───────────── */

export function searchDirectory(query: string, signal?: AbortSignal) {
  return request<{ users: SocialUser[]; clubs: SocialClub[] }>(
    `/search?q=${encodeURIComponent(query)}`,
    { signal },
  );
}

export function getSocialUser(id: string, viewerId: string | null, signal?: AbortSignal) {
  return request<{ user: SocialUser; relationship: Relationship }>(`/users/${encodeURIComponent(id)}`, {
    userId: viewerId,
    signal,
  });
}

export function getSocialClub(id: string, signal?: AbortSignal) {
  return request<{ club: SocialClub; president: SocialUser | null; roster: SocialUser[] }>(
    `/clubs/${encodeURIComponent(id)}`,
    { signal },
  );
}

/* ───────────── الصداقات ───────────── */

export function getFriends(userId: string, signal?: AbortSignal) {
  return request<FriendsState>("/friends", { userId, signal });
}

export function sendFriendRequest(userId: string, targetId: string) {
  return request<{ relationship: Relationship }>(`/friends/${encodeURIComponent(targetId)}`, {
    method: "POST",
    userId,
  });
}

export function acceptFriendRequest(userId: string, targetId: string) {
  return request<{ relationship: Relationship }>(`/friends/${encodeURIComponent(targetId)}/accept`, {
    method: "POST",
    userId,
  });
}

export function removeFriendLink(userId: string, targetId: string) {
  return request<{ relationship: Relationship }>(`/friends/${encodeURIComponent(targetId)}`, {
    method: "DELETE",
    userId,
  });
}

/* ───────────── الرسائل الخاصة ───────────── */

export function getConversations(userId: string, signal?: AbortSignal) {
  return request<{ conversations: Conversation[] }>("/conversations", { userId, signal });
}

export function getDirectMessages(userId: string, peerId: string, signal?: AbortSignal) {
  return request<{ messages: DirectMessage[] }>(`/messages/${encodeURIComponent(peerId)}`, {
    userId,
    signal,
  });
}

export function sendDirectMessage(userId: string, peerId: string, text: string) {
  return request<{ message: DirectMessage }>(`/messages/${encodeURIComponent(peerId)}`, {
    method: "POST",
    userId,
    body: { text },
  });
}

/* ───────────── رسائل الأخطاء بالعربية ───────────── */

/** رسالة خاصة بالكتم والحظر، أو null إذا كان الخطأ شيئًا آخر. */
export function moderationErrorText(error: unknown): string | null {
  if (!(error instanceof SocialError) || error.status !== 403) return null;
  if (error.code === "sanctioned_ban") return "حسابك موقوف عن الكتابة بسبب مخالفة قوانين الموقع.";
  if (error.code === "sanctioned_mute") return "حسابك مكتوم مؤقتًا بسبب مخالفة قوانين الموقع، تقدر تكتب بعد انتهاء المدة.";
  if (error.code === "you_blocked") return "أنت حاظر هذا الحساب. ألغِ الحظر أولًا إذا تبي تتواصل معه.";
  if (error.code === "blocked") return "تعذّر التواصل مع هذا الحساب.";
  return null;
}

export function socialErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    const moderated = moderationErrorText(error);
    if (moderated) return moderated;
    if (error.status === 404 && error.code === "not_found") return "لم نجد هذا الحساب. ربما لم يسجّل دخوله بعد.";
    if (error.status === 404) return "هذه الخدمة غير متاحة حاليًا. حاول بعد قليل.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
    if (error.status === 403) return "هذا الحساب مرتبط بمتصفح آخر ولا يمكن استخدامه من هنا.";
    if (error.status === 400 && error.code === "invalid_text") return "الرسالة فارغة أو أطول من 1000 حرف.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}

/* ───────────── المتصدرون العامّون (من الخادم) ───────────── */

export type LeaderboardClub = { id: string; name: string; region: string; wins: number; trophies: number; budget: number };
export type LeaderboardPlayer = { id: string; name: string; position: string | null; region: string; overall: number; balance: number };
export type Leaderboards = {
  clubs: { wins: LeaderboardClub[]; trophies: LeaderboardClub[]; budget: LeaderboardClub[] };
  players: { overall: LeaderboardPlayer[]; balance: LeaderboardPlayer[] };
};

export function fetchLeaderboards(signal?: AbortSignal) {
  return request<Leaderboards>("/leaderboards", { base: "/api", signal });
}

export function fetchAvatars(ids: string[], signal?: AbortSignal) {
  return request<{ avatars: Record<string, string | null> }>(`/avatars?ids=${ids.map(encodeURIComponent).join(",")}`, { signal });
}

export type PublicChatMessage = { id: number; senderId: string; senderName: string; text: string; createdAt: string };

export function sendPublicChatMessage(userId: string, text: string) {
  return request<{ message: PublicChatMessage }>("/chat/public", { base: "/api", method: "POST", userId, body: { text } });
}

export function fetchChatAdmin(userId: string) {
  return request<{ admin: boolean }>("/chat/me", { base: "/api", userId });
}

export function deletePublicChatMessage(userId: string, id: number) {
  return request<{ ok: boolean }>(`/chat/public/${id}`, { base: "/api", method: "DELETE", userId });
}

/* ───────────── الإشعارات ───────────── */

export type NotificationTarget = "invites" | "profile" | "chat" | "market" | "recruit" | "moderation" | "";

export type AppNotification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  target: NotificationTarget;
  createdAt: string;
  read: boolean;
};

export function fetchNotifications(userId: string, signal?: AbortSignal) {
  return request<{ unread: number; items: AppNotification[] }>("/notifications", { base: "/api", userId, signal });
}

export function markNotificationsRead(userId: string, ids?: number[]) {
  return request<{ ok: boolean }>("/notifications/read", { base: "/api", method: "POST", userId, body: ids ? { ids } : {} });
}

export function clearNotifications(userId: string) {
  return request<{ ok: boolean }>("/notifications/clear", { base: "/api", method: "POST", userId, body: {} });
}

/* ───────────── لوحة الإعلانات (أبحث عن نادي / مطلوب لاعب) ───────────── */

export type RecruitKind = "need_club" | "need_player";

export type RecruitPost = {
  id: number;
  kind: RecruitKind;
  position: string;
  region: string;
  minOverall: number;
  note: string;
  createdAt: string;
  expiresAt: string;
  poster: {
    id: string;
    name: string;
    username: string | null;
    position: string | null;
    overall: number;
    clubId: string | null;
    clubName: string | null;
    avatar: string | null;
  };
};

export function fetchRecruitPosts(
  filters: { kind?: RecruitKind | ""; position?: string; region?: string },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams();
  if (filters.kind) query.set("kind", filters.kind);
  if (filters.position) query.set("position", filters.position);
  if (filters.region) query.set("region", filters.region);
  const qs = query.toString();
  return request<{ posts: RecruitPost[] }>(`/recruit${qs ? `?${qs}` : ""}`, { base: "/api", signal });
}

export function createRecruitPost(
  userId: string,
  body: { kind: RecruitKind; position: string; region: string; minOverall: number; note: string },
) {
  return request<{ id: number }>("/recruit", { base: "/api", method: "POST", userId, body });
}

export function deleteRecruitPost(userId: string, id: number) {
  return request<{ ok: boolean }>(`/recruit/${id}`, { base: "/api", method: "DELETE", userId });
}

/* ───────────── حسابات الخادم ───────────── */

export type ServerProfile = {
  id: string;
  name: string;
  username: string | null;
  role: "president" | "player" | "scout";
  region: string;
  eaId: string | null;
  position: string | null;
  overall: number;
  avatar: string | null;
  clubId: string | null;
  clubName: string | null;
  isFreeAgent: boolean;
  clubRank: "member" | "vice" | "scout";
  build: unknown;
};

export type ServerClub = {
  id: string;
  name: string;
  region: string;
  logo: string | null;
  presidentId: string;
  primaryColor: string;
  secondaryColor: string;
  wins: number;
  draws: number;
  losses: number;
  trophies: number;
};

export function registerAccount(email: string, password: string, userId: string) {
  return request<{ ok: true }>("/auth/register", {
    base: "/api",
    method: "POST",
    body: { email, password, userId, key: getSocialKey() },
  });
}

export function loginAccount(email: string, password: string) {
  return request<{ userId: string; key: string }>("/auth/login", {
    base: "/api",
    method: "POST",
    body: { email, password },
  });
}

export function fetchAccountProfile(userId: string) {
  return request<{ profile: ServerProfile | null; club: ServerClub | null }>("/auth/me", {
    base: "/api",
    userId,
  });
}

/* ───────────── الإشراف: حظر وإبلاغ وعقوبات ───────────── */

export type ModerationState = {
  admin: boolean;
  sanction: { kind: "mute" | "ban"; until: string | null } | null;
  blockedIds: string[];
};

export type ReportKind = "chat_message" | "recruit_post" | "user";
export type ReportReason = "spam" | "abuse" | "scam" | "other";
export type ResolveAction = "dismiss" | "delete" | "mute1h" | "mute24h" | "mute7d" | "ban";

export type ModerationReport = {
  id: number;
  kind: ReportKind;
  reason: ReportReason;
  note: string;
  excerpt: string;
  createdAt: string;
  reporter: { id: string; name: string };
  target: { id: string; name: string };
  targetOpenReports: number;
};

export type ActiveSanction = { userId: string; name: string; kind: "mute" | "ban"; until: string | null };

const MOD = { base: "/api" } as const;

export function fetchModerationState(userId: string, signal?: AbortSignal) {
  return request<ModerationState>("/moderation/me", { ...MOD, userId, signal });
}

export function blockUser(userId: string, targetId: string) {
  return request<{ ok: boolean }>(`/moderation/blocks/${encodeURIComponent(targetId)}`, { ...MOD, method: "POST", userId, body: {} });
}

export function unblockUser(userId: string, targetId: string) {
  return request<{ ok: boolean }>(`/moderation/blocks/${encodeURIComponent(targetId)}`, { ...MOD, method: "DELETE", userId });
}

export function reportContent(userId: string, body: { kind: ReportKind; targetRef: string; reason: ReportReason; note?: string }) {
  return request<{ ok: boolean }>("/moderation/reports", { ...MOD, method: "POST", userId, body });
}

export function fetchReports(userId: string) {
  return request<{ reports: ModerationReport[] }>("/moderation/reports", { ...MOD, userId });
}

export function resolveReport(userId: string, reportId: number, action: ResolveAction) {
  return request<{ ok: boolean }>(`/moderation/reports/${reportId}/resolve`, { ...MOD, method: "POST", userId, body: { action } });
}

export function fetchSanctions(userId: string) {
  return request<{ sanctions: ActiveSanction[] }>("/moderation/sanctions", { ...MOD, userId });
}

export function liftSanction(userId: string, targetId: string) {
  return request<{ ok: boolean }>(`/moderation/sanctions/${encodeURIComponent(targetId)}`, { ...MOD, method: "DELETE", userId });
}
