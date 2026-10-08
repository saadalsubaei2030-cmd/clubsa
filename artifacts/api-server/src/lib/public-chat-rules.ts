// قواعد الدردشة العامة (دوال خالصة بلا اعتماديات حتى يسهل اختبارها).

export const MAX_TEXT = 500;
export const MAX_NAME = 40;
export const MAX_SENDER_ID = 64;

// نفس قائمة الواجهة (artifacts/clubsa/src/data.ts)، ويُعاد تطبيقها هنا لأن الخادم لا يثق بالمتصفح.
export const FORBIDDEN_WORDS = ["غبي", "احمق", "تافه", "نصاب", "حقير", "خرا"];

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function maskForbidden(text: string): string {
  let result = text;
  for (const word of FORBIDDEN_WORDS) {
    result = result.split(word).join("*".repeat(word.length));
  }
  return result;
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(CONTROL_CHARS, "").trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return trimmed;
}

export type ParsedChatBody =
  | { ok: true; value: { senderId: string; senderName: string; text: string } }
  | { ok: false; error: "invalid_sender" | "invalid_name" | "invalid_text" };

export function parseChatBody(body: unknown): ParsedChatBody {
  const source = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const senderId = clean(source.senderId, MAX_SENDER_ID);
  if (!senderId) return { ok: false, error: "invalid_sender" };
  const senderName = clean(source.senderName, MAX_NAME);
  if (!senderName) return { ok: false, error: "invalid_name" };
  const text = clean(source.text, MAX_TEXT);
  if (!text) return { ok: false, error: "invalid_text" };
  return {
    ok: true,
    value: { senderId, senderName: maskForbidden(senderName), text: maskForbidden(text) },
  };
}

export function createRateLimiter(options: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string, now: number = Date.now()): boolean {
      const since = now - options.windowMs;
      const recent = (hits.get(key) ?? []).filter((time) => time > since);
      if (recent.length >= options.max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) {
        for (const [existing, times] of hits) {
          if (times[times.length - 1] <= since) hits.delete(existing);
        }
      }
      return true;
    },
  };
}
