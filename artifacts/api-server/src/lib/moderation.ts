import { pool } from "@workspace/db";

/** الحظر بين المستخدمين، والبلاغات، وعقوبات المشرفين (كتم/حظر). */

let ready: Promise<void> | null = null;

export function ensureModeration(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_blocks (
        blocker_id text NOT NULL,
        blocked_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (blocker_id, blocked_id)
      );
      CREATE INDEX IF NOT EXISTS clubsa_blocks_blocked_idx ON clubsa_blocks (blocked_id);
      CREATE TABLE IF NOT EXISTS clubsa_reports (
        id bigserial PRIMARY KEY,
        reporter_id text NOT NULL,
        kind text NOT NULL,
        target_user_id text NOT NULL,
        target_ref text NOT NULL,
        excerpt text NOT NULL DEFAULT '',
        reason text NOT NULL,
        note text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now(),
        handled_by text,
        handled_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS clubsa_reports_open_unique
        ON clubsa_reports (reporter_id, kind, target_ref) WHERE status = 'open';
      CREATE INDEX IF NOT EXISTS clubsa_reports_status_idx ON clubsa_reports (status, id DESC);
      CREATE TABLE IF NOT EXISTS clubsa_sanctions (
        user_id text PRIMARY KEY,
        kind text NOT NULL,
        until timestamptz,
        by_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

export type Sanction = { kind: "mute" | "ban"; until: Date | null };

/** العقوبة السارية على المستخدم (الكتم المنتهي يُتجاهل ويُحذف). */
export async function activeSanction(userId: string): Promise<Sanction | null> {
  await ensureModeration();
  const { rows } = await pool.query<{ kind: string; until: Date | null }>(
    "SELECT kind, until FROM clubsa_sanctions WHERE user_id = $1",
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.until && row.until.getTime() <= Date.now()) {
    await pool.query("DELETE FROM clubsa_sanctions WHERE user_id = $1 AND until <= now()", [userId]);
    return null;
  }
  return { kind: row.kind === "ban" ? "ban" : "mute", until: row.until };
}

export type BlockState = { iBlocked: boolean; blockedMe: boolean };

export async function blockState(me: string, other: string): Promise<BlockState> {
  await ensureModeration();
  const { rows } = await pool.query<{ blocker_id: string }>(
    "SELECT blocker_id FROM clubsa_blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)",
    [me, other],
  );
  return { iBlocked: rows.some((r) => r.blocker_id === me), blockedMe: rows.some((r) => r.blocker_id === other) };
}
