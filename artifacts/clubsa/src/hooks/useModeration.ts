import { useCallback, useEffect, useSyncExternalStore } from "react";
import { blockUser, fetchModerationState, unblockUser, type ModerationState } from "@/lib/social";

// حالة واحدة مشتركة بين الدردشة والإعلانات وملف اللاعب، حتى يظهر الحظر فورًا في كل مكان.
const EMPTY: ModerationState = { admin: false, sanction: null, blockedIds: [] };

let current: { userId: string | null; state: ModerationState } = { userId: null, state: EMPTY };
const listeners = new Set<() => void>();
let inflight: string | null = null;

function publish(next: { userId: string | null; state: ModerationState }) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function load(userId: string): Promise<void> {
  if (inflight === userId) return;
  inflight = userId;
  try {
    const state = await fetchModerationState(userId);
    if (inflight === userId) publish({ userId, state });
  } catch {
    // الخادم غير متاح: نبقي الحالة الحالية بدون حظر.
  } finally {
    if (inflight === userId) inflight = null;
  }
}

function isSanctionActive(state: ModerationState): boolean {
  const s = state.sanction;
  return !!s && (s.until === null || new Date(s.until).getTime() > Date.now());
}

export function useModeration(userId: string | null) {
  const snapshot = useSyncExternalStore(subscribe, () => current);

  useEffect(() => {
    if (!userId) {
      if (current.userId !== null) publish({ userId: null, state: EMPTY });
      return;
    }
    if (current.userId !== userId) publish({ userId, state: EMPTY });
    void load(userId);
  }, [userId]);

  const state = userId && snapshot.userId === userId ? snapshot.state : EMPTY;

  const block = useCallback(
    async (targetId: string) => {
      if (!userId) return;
      await blockUser(userId, targetId);
      publish({ userId, state: { ...current.state, blockedIds: [...new Set([...current.state.blockedIds, targetId])] } });
    },
    [userId],
  );

  const unblock = useCallback(
    async (targetId: string) => {
      if (!userId) return;
      await unblockUser(userId, targetId);
      publish({ userId, state: { ...current.state, blockedIds: current.state.blockedIds.filter((id) => id !== targetId) } });
    },
    [userId],
  );

  const refresh = useCallback(() => {
    if (userId) void load(userId);
  }, [userId]);

  return {
    admin: state.admin,
    sanction: isSanctionActive(state) ? state.sanction : null,
    blockedIds: state.blockedIds,
    block,
    unblock,
    refresh,
  };
}
