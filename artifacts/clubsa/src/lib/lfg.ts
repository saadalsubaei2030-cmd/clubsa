import { SocialError, request } from "@/lib/social";

export type LfgKind = "seeking_club" | "seeking_player";

export type LfgPost = {
  id: number;
  kind: LfgKind;
  position: string; // "ANY" أو معرّف المركز
  platform: string; // "ANY" | "PS" | "XBOX" | "PC"
  minOverall: number;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    username: string | null;
    role: string;
    region: string;
    overall: number;
    avatar: string | null;
    position: string | null;
    clubId: string | null;
    clubName: string | null;
  };
};

export type LfgFilters = {
  kind?: LfgKind | "";
  position?: string;
  platform?: string;
  region?: string;
};

export const PLATFORM_LABELS: Record<string, string> = {
  ANY: "أي منصة",
  PS: "PlayStation",
  XBOX: "Xbox",
  PC: "PC",
};

export function fetchLfgPosts(filters: LfgFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== "ANY") params.set(key, value);
  }
  const query = params.toString();
  return request<{ posts: LfgPost[] }>(`/lfg/posts${query ? `?${query}` : ""}`, { base: "/api", signal });
}

export function fetchMyLfgPosts(userId: string, signal?: AbortSignal) {
  return request<{ posts: LfgPost[] }>("/lfg/mine", { base: "/api", userId, signal });
}

export function createLfgPost(
  userId: string,
  input: { kind: LfgKind; position: string; platform: string; minOverall: number; body: string },
) {
  return request<{ ok: true }>("/lfg/posts", { base: "/api", method: "POST", userId, body: input });
}

export function closeLfgPost(userId: string, postId: number) {
  return request<{ ok: true }>(`/lfg/posts/${postId}`, { base: "/api", method: "DELETE", userId });
}

export function lfgErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if (error.status === 404 && error.code !== "not_found") return "الخادم لم يُحدَّث بعد. أعد نشر الخادم على Replit ثم حاول مجددًا.";
    if (error.code === "players_only") return "هذا النوع من المنشورات للاعبين فقط.";
    if (error.code === "presidents_only") return "هذا النوع من المنشورات لرؤساء الأندية الذين لديهم نادٍ.";
    if (error.code === "too_many_posts") return "وصلت للحد الأقصى (3 منشورات مفتوحة). احذف واحدًا ثم حاول.";
    if (error.code === "invalid_post") return "تحقق من البيانات. النص لا يزيد عن 400 حرف.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}
