import { useEffect, useState } from "react";
import { inviteErrorText, searchPlayersOnServer, sendClubInvite } from "@/lib/invites";
import type { SocialUser } from "@/lib/social";
import type { AuthUser } from "@/types";

/** بحث اللاعبين في الدليل العام وإرسال الدعوات عبر الخادم (يستخدمه نافذتا الدعوة). */
export function useInviteSearch(auth: AuthUser, onSent?: () => void) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SocialUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        setResults(await searchPlayersOnServer(text, auth.clubId, controller.signal));
      } catch (error) {
        if (!controller.signal.aborted) {
          setResults([]);
          setMessage({ ok: false, text: inviteErrorText(error) });
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, auth.clubId]);

  const updateQuery = (value: string) => {
    setQuery(value);
    setMessage(null);
  };

  const invite = async (player: SocialUser) => {
    setBusyId(player.id);
    setMessage(null);
    try {
      const result = await sendClubInvite(auth.id, player.id);
      setMessage({
        ok: true,
        text: result.duplicate ? `${player.name} عنده دعوة معلّقة منك.` : `تم إرسال الدعوة إلى ${player.name}`,
      });
      setQuery("");
      onSent?.();
    } catch (error) {
      setMessage({ ok: false, text: inviteErrorText(error) });
    } finally {
      setBusyId(null);
    }
  };

  return { query, updateQuery, results, searching, message, busyId, invite };
}
