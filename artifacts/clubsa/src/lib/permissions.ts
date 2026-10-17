import type { AuthUser } from "@/types";

/** من يقدر يدعو اللاعبين: رئيس النادي، أو من عيّنه الرئيس نائبًا أو كشّافًا. */
export function canManageClub<T extends Pick<AuthUser, "role" | "clubId" | "clubRank">>(auth: T | null | undefined): auth is T {
  if (!auth?.clubId) return false;
  return (
    auth.role === "president" ||
    auth.role === "scout" ||
    auth.clubRank === "vice" ||
    auth.clubRank === "scout"
  );
}
