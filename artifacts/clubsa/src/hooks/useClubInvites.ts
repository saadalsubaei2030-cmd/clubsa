import { useCallback, useEffect, useRef, useState } from "react";
import { fetchIncomingInvites, fetchSentInvites, type ServerInvite } from "@/lib/invites";
import type { AuthUser } from "@/types";

/**
 * يجلب الدعوات من الخادم العام كل 15 ثانية:
 * الواردة للاعب، والمرسلة من نادي المدير (لعرض حالتها).
 */
export function useClubInvites(auth: AuthUser | null) {
  const [incoming, setIncoming] = useState<ServerInvite[]>([]);
  const [sent, setSent] = useState<ServerInvite[]>([]);
  const userId = auth?.id ?? null;
  const role = auth?.role ?? null;
  const hasClub = Boolean(auth?.clubId);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!userId) {
      setIncoming([]);
      setSent([]);
      refreshRef.current = async () => undefined;
      return;
    }
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      if (role === "player") {
        try {
          const data = await fetchIncomingInvites(userId, controller.signal);
          if (!cancelled) setIncoming(data.invites);
        } catch {
          // الخادم غير متاح الآن: نبقي آخر قائمة ونعيد المحاولة.
        }
      }
      if ((role === "president" || role === "scout") && hasClub) {
        try {
          const data = await fetchSentInvites(userId, controller.signal);
          if (!cancelled) setSent(data.invites);
        } catch {
          // نفس الشيء
        }
      }
    };
    refreshRef.current = load;

    const first = window.setTimeout(() => void load(), 1500);
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [userId, role, hasClub]);

  const refresh = useCallback(() => refreshRef.current(), []);
  return { incoming, sent, refresh };
}
