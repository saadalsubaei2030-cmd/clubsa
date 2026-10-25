import { useEffect, useRef } from "react";
import { applyMarketState } from "@/lib/mockData";
import { ackAssignment, getMarketState } from "@/lib/market";
import type { AuthUser } from "@/types";

/**
 * يجلب رصيد المحفظة من الخادم كل 8 ثوانٍ ويطبّقه على الحساب المحلي،
 * وإذا اشترى نادٍ هذا اللاعب ينتقل للنادي الجديد ثم يؤكد للخادم استلام الانتقال.
 */
export function useMarketSync(auth: AuthUser | null, onChange: (userId: string) => void) {
  const callback = useRef(onChange);
  callback.current = onChange;
  const userId = auth?.id ?? null;
  const role = auth?.role ?? null;

  useEffect(() => {
    if (!userId || (role !== "player" && role !== "president")) return;
    let cancelled = false;
    let controller: AbortController | null = null;

    const tick = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const state = await getMarketState(userId, controller.signal);
        if (cancelled) return;
        if (applyMarketState(userId, state)) callback.current(userId);
        if (state.assignment || state.removed) await ackAssignment(userId).catch(() => undefined);
      } catch {
        // الخادم غير متاح الآن: نحتفظ بآخر رصيد محلي ونعيد المحاولة.
      }
    };

    // نؤخر الطلب الأول قليلًا حتى تنتهي مزامنة الملف الشخصي (تسجّل الحساب على الخادم).
    const first = window.setTimeout(() => void tick(), 1500);
    const timer = window.setInterval(() => void tick(), 8000);
    return () => {
      cancelled = true;
      controller?.abort();
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [userId, role]);
}
