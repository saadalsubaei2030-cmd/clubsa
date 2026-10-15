import { request, SocialError } from "@/lib/social";
import type { MarketState } from "@/lib/mockData";

// سوق الانتقالات والمحفظة على الخادم: الأرصدة والصفقات تنتقل بين الحسابات فعليًا.

const BASE = "/api/market";

export type RemoteListing = {
  id: number;
  price: number;
  createdAt: string;
  player: {
    id: string;
    name: string;
    position: string | null;
    overall: number;
    avatar: string | null;
    clubId: string | null;
    clubName: string | null;
  };
};

export type BuyResult = {
  ok: true;
  price: number;
  playerShare: number;
  clubShare: number;
  newBudget: number;
};

export function getMarketState(userId: string, signal?: AbortSignal) {
  return request<MarketState>("/me", { base: BASE, userId, signal });
}

export function ackAssignment(userId: string) {
  return request<{ ok: true }>("/ack", { base: BASE, method: "POST", userId });
}

export function fetchRemoteListings(signal?: AbortSignal) {
  return request<{ listings: RemoteListing[] }>("/listings", { base: BASE, signal });
}

export function createListing(userId: string, price: number) {
  return request<{ id: number }>("/listings", { base: BASE, method: "POST", userId, body: { price } });
}

export function cancelMyListing(userId: string) {
  return request<{ ok: true }>("/listings/mine", { base: BASE, method: "DELETE", userId });
}

export function buyListing(userId: string, listingId: number) {
  return request<BuyResult>(`/listings/${listingId}/buy`, { base: BASE, method: "POST", userId });
}

export function marketErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    switch (error.code) {
      case "invalid_price": return "أدخل مبلغًا صحيحًا (رقم صحيح أكبر من صفر).";
      case "already_listed": return "أنت معروض في السوق بالفعل. ألغِ العرض الحالي أولًا.";
      case "players_only": return "عرض النفس في السوق متاح للاعبين فقط.";
      case "presidents_only": return "شراء اللاعبين متاح لرؤساء الأندية فقط.";
      case "no_club": return "لا يوجد نادٍ مرتبط بحسابك على الخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
      case "insufficient_funds": return "ميزانية ناديك لا تكفي لهذا المبلغ.";
      case "same_club": return "اللاعب في ناديك بالفعل.";
      case "unavailable": return "هذا العرض لم يعد متاحًا (بيع أو أُلغي).";
    }
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
    if (error.status === 404) return "هذه الخدمة غير متاحة حاليًا. حاول بعد قليل.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}
