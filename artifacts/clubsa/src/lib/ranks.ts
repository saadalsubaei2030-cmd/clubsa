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

export function kickMember(userId: string, targetId: string) {
  return request<{ ok: true }>(`/club-members/${encodeURIComponent(targetId)}/kick`, {
    base: "/api",
    method: "POST",
    userId,
  });
}

export function listMemberForSale(userId: string, targetId: string, price: number) {
  return request<{ ok: true; id: number }>(`/club-members/${encodeURIComponent(targetId)}/list`, {
    base: "/api",
    method: "POST",
    userId,
    body: { price },
  });
}

export function saleErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.code === "invalid_price") return "أدخل مبلغًا صحيحًا (رقم صحيح أكبر من صفر).";
    if (error.code === "already_listed") return "هذا اللاعب معروض للبيع بالفعل.";
    if (error.code === "presidents_only") return "عرض اللاعبين للبيع لرئيس النادي فقط.";
    if (error.status === 404 && error.code === "not_found") return "هذا اللاعب لم يعد في ناديك.";
    if (error.status === 404) return "هذه الخدمة غير متاحة حاليًا. حاول بعد قليل.";
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}

export function kickErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if (error.status === 404 && error.code === "not_found") return "هذا اللاعب لم يعد في ناديك.";
    if (error.status === 404) return "هذه الخدمة غير متاحة حاليًا. حاول بعد قليل.";
    if (error.code === "managers_only" || error.code === "forbidden_target") return "ليست لديك صلاحية طرد هذا العضو.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}

/** الرئيس يطرد أي عضو، والنائب يطرد الكشاف واللاعب العادي فقط. */
export function canKickMember(
  viewer: { role: string; clubRank?: string } | null | undefined,
  target: { role: string; rank: string },
): boolean {
  if (!viewer || target.role === "president") return false;
  if (viewer.role === "president") return true;
  return viewer.clubRank === "vice" && target.rank !== "vice";
}
