import { useEffect, useMemo } from "react";
import { buildSyncPayload, syncProfile } from "@/lib/social";
import type { SyncPayload } from "@/lib/social";
import type { AuthUser } from "@/types";

/**
 * يزامن الملف الشخصي (والنادي لرئيس النادي) مع خادم الدليل المشترك
 * حتى يظهر الحساب في بحث الآخرين ويمكنهم مراسلته وإضافته.
 */
export function useSocialSync(auth: AuthUser | null) {
  const signature = useMemo(
    () => (auth ? JSON.stringify(buildSyncPayload(auth)) : ""),
    [auth],
  );

  useEffect(() => {
    if (!signature) return;
    const payload = JSON.parse(signature) as SyncPayload;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void syncProfile(payload).catch(() => undefined);
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [signature]);
}
