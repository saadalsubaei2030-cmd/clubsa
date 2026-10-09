import { getClubById } from "@/lib/mockData";
import type { AuthUser } from "@/types";

// الدليل الاجتماعي (بحث، ملفات، صداقات، رسائل خاصة) يعمل عبر خادم Replit.
// يمكن تغيير العنوان من متغير البيئة VITE_API_BASE_URL وقت البناء.
export const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "https://clubsa--saadalsubaei203.replit.app"
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
  const response = await fetch(`${API_BASE}/api/social${path}`, {
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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
  return value && value.length <= 190_000 ? value : null;
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

export function socialErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if (error.status === 404 && error.code === "not_found") return "لم نجد هذا الحساب. ربما لم يسجّل دخوله بعد.";
    if (error.status === 404) return "الخادم لم يُحدَّث بعد. أعد نشر الخادم على Replit ثم حاول مجددًا.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
    if (error.status === 403) return "هذا الحساب مرتبط بمتصفح آخر ولا يمكن استخدامه من هنا.";
    if (error.status === 400 && error.code === "invalid_text") return "الرسالة فارغة أو أطول من 1000 حرف.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}
