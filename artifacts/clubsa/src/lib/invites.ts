import { SocialError, request, searchDirectory, type SocialUser } from "@/lib/social";
import type { ClubInvite } from "@/types";

export type ServerInvite = {
  id: number;
  clubId: string;
  clubName: string;
  clubLogo: string | null;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

const BASE = "/api";

export function fetchIncomingInvites(userId: string, signal?: AbortSignal) {
  return request<{ invites: ServerInvite[] }>("/club-invites/incoming", { base: BASE, userId, signal });
}

export function fetchSentInvites(userId: string, signal?: AbortSignal) {
  return request<{ invites: ServerInvite[] }>("/club-invites/sent", { base: BASE, userId, signal });
}

export function sendClubInvite(userId: string, toUserId: string) {
  return request<{ ok: true; duplicate: boolean }>("/club-invites", {
    base: BASE,
    method: "POST",
    userId,
    body: { toUserId },
  });
}

export function respondToServerInvite(userId: string, inviteId: number, status: "accepted" | "declined") {
  return request<{ ok: true }>(`/club-invites/${inviteId}/respond`, {
    base: BASE,
    method: "POST",
    userId,
    body: { status },
  });
}

/** يحوّل دعوة الخادم إلى الشكل الذي تستخدمه نوافذ الدعوات الحالية. */
export function toClubInvite(invite: ServerInvite): ClubInvite {
  return {
    id: String(invite.id),
    club_id: invite.clubId,
    club_name: invite.clubName,
    club_logo: invite.clubLogo,
    from_user_id: invite.fromUserId,
    from_user_name: invite.fromUserName,
    to_user_id: invite.toUserId,
    to_user_name: invite.toUserName,
    status: invite.status,
    created_at: invite.createdAt,
  };
}

/** يبحث في الدليل العام عن لاعبين يمكن دعوتهم (ليسوا في ناديك). */
export async function searchPlayersOnServer(query: string, clubId: string | null, signal?: AbortSignal): Promise<SocialUser[]> {
  const data = await searchDirectory(query, signal);
  return data.users.filter((user) => user.role === "player" && user.clubId !== clubId).slice(0, 8);
}

export function inviteErrorText(error: unknown): string {
  if (error instanceof SocialError) {
    if (error.status === 429) return "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";
    if (error.status === 404 && error.code === "not_found") return "لم نجد هذا اللاعب أو الدعوة. ربما لم يسجّل دخوله بعد.";
    if (error.status === 404) return "هذه الخدمة غير متاحة حاليًا. حاول بعد قليل.";
    if (error.code === "managers_only") return "الدعوات متاحة لرئيس النادي أو الكشّاف فقط.";
    if (error.code === "club_not_synced") return "ناديك لم يُسجَّل على الخادم بعد. أعد تحميل الصفحة وحاول مجددًا.";
    if (error.code === "already_member") return "اللاعب عضو في ناديك أصلًا.";
    if (error.code === "players_only") return "يمكن دعوة اللاعبين فقط.";
    if (error.status === 401) return "تعذّر ربط حسابك بالخادم. أعد تحميل الصفحة وحاول مرة أخرى.";
  }
  return "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.";
}
