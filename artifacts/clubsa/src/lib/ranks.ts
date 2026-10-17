import { SocialError, request } from "@/lib/social";
import type { ClubRank } from "@/types";

export function setClubRank(userId: string, targetId: string, rank: ClubRank) {
  return request<{ ok: true; rank: ClubRank }>(`/club-ranks/${encodeURIComponent(targetId)}`, {
    base: "/api",
    method: "POST",
    userId,
    body: { rank },
  });
}

export function rankErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if (error.status === 404 && error.code === "not_found") return "هذا اللاعب لم يعد في ناديك.";
    if (error.status === 404) return "هذه الخدمة غير متاحة حاليًا. حاول بعد قليل.";
    if (error.code === "presidents_only") return "تغيير الرتب لرئيس النادي فقط.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}
