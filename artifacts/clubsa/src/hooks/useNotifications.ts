import { useCallback, useEffect, useRef, useState } from "react";
import { clearNotifications, fetchNotifications, markNotificationsRead, type AppNotification } from "@/lib/social";

const POLL_MS = 45_000;

/**
 * إشعارات المستخدم من الخادم. تُجلب كل 45 ثانية، وفقط والصفحة ظاهرة، وفور رجوع المستخدم للتبويب.
 */
export function useNotifications(userId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const loadRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    setItems([]);
    setUnread(0);
    if (!userId) return;
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await fetchNotifications(userId, controller.signal);
        if (cancelled) return;
        setItems(data.items);
        setUnread(data.unread);
      } catch {
        // الخادم غير متاح الآن: نبقي آخر قائمة ونعيد المحاولة.
      }
    };
    loadRef.current = load;

    const first = window.setTimeout(() => void load(), 2000);
    const timer = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const markRead = useCallback(
    async (ids?: number[]) => {
      if (!userId) return;
      // تحديث فوري في الواجهة، والخادم يلحق.
      setItems((current) => current.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
      setUnread((current) => (ids ? Math.max(0, current - ids.length) : 0));
      try {
        await markNotificationsRead(userId, ids);
      } catch {
        void loadRef.current();
      }
    },
    [userId],
  );

  const clear = useCallback(async () => {
    if (!userId) return;
    setItems([]);
    setUnread(0);
    try {
      await clearNotifications(userId);
    } catch {
      void loadRef.current();
    }
  }, [userId]);

  const refresh = useCallback(() => loadRef.current(), []);
  return { items, unread, markRead, clear, refresh };
}
