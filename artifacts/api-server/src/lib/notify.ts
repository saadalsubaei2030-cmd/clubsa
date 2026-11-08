import { pool } from "@workspace/db";

/** إشعارات داخل الموقع. الإرسال "أطلق وانسَ": أي فشل هنا لا يجب أن يعطّل العملية الأصلية. */

export type NotifyTarget = "invites" | "profile" | "chat" | "market" | "recruit";

export type NotifyInput = {
  kind: string;
  title: string;
  body?: string;
  target?: NotifyTarget;
  /** إشعار غير مقروء بنفس المفتاح يُحدَّث بدل أن يتكرر (مثل رسائل نفس المرسل). */
  dedupeKey?: string;
};

const KEEP_PER_USER = 50;
const MAX_TITLE = 120;
const MAX_BODY = 240;

let ready: Promise<void> | null = null;

export function ensureNotifications(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_notifications (
        id bigserial PRIMARY KEY,
        user_id text NOT NULL,
        kind text NOT NULL,
        title text NOT NULL,
        body text NOT NULL DEFAULT '',
        target text NOT NULL DEFAULT '',
        dedupe_key text,
        created_at timestamptz NOT NULL DEFAULT now(),
        read_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS clubsa_notifications_user_idx ON clubsa_notifications (user_id, id DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS clubsa_notifications_dedupe_idx
        ON clubsa_notifications (user_id, dedupe_key) WHERE read_at IS NULL AND dedupe_key IS NOT NULL;`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

async function insertNotification(userId: string, input: NotifyInput): Promise<void> {
  await ensureNotifications();
  await pool.query(
    `INSERT INTO clubsa_notifications (user_id, kind, title, body, target, dedupe_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, dedupe_key) WHERE read_at IS NULL AND dedupe_key IS NOT NULL
     DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, created_at = now()`,
    [userId, input.kind, input.title.slice(0, MAX_TITLE), (input.body ?? "").slice(0, MAX_BODY), input.target ?? "", input.dedupeKey ?? null],
  );
  // نحتفظ بآخر 50 إشعارًا لكل مستخدم حتى لا يكبر الجدول.
  await pool.query(
    `DELETE FROM clubsa_notifications
     WHERE user_id = $1 AND id NOT IN (SELECT id FROM clubsa_notifications WHERE user_id = $1 ORDER BY id DESC LIMIT ${KEEP_PER_USER})`,
    [userId],
  );
}

export function notify(userId: string, input: NotifyInput): void {
  insertNotification(userId, input).catch(() => undefined);
}

/** يجلب اسم شخص (المرسل مثلًا) ثم يبني الإشعار منه. */
export function notifyWithName(recipientId: string, nameOfUserId: string, build: (name: string) => NotifyInput): void {
  pool
    .query<{ name: string }>("SELECT name FROM clubsa_social_users WHERE id = $1", [nameOfUserId])
    .then((result) => {
      const name = (result.rows[0]?.name ?? "لاعب").slice(0, 40);
      return insertNotification(recipientId, build(name));
    })
    .catch(() => undefined);
}
