import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { PLAYER_START_BALANCE } from "../lib/market-rules";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();

const listLimit = createRateLimiter({ windowMs: 60_000, max: 120 });
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

let ready: Promise<void> | null = null;

function ensureInvites(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_club_invites (
        id serial PRIMARY KEY,
        club_id text NOT NULL,
        from_user_id text NOT NULL,
        to_user_id text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        responded_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS clubsa_club_invites_one_pending
        ON clubsa_club_invites (club_id, to_user_id) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS clubsa_club_invites_to
        ON clubsa_club_invites (to_user_id, status);`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      await ensureInvites();
      res.setHeader("Cache-Control", "no-store");
      await handler(req, res);
    } catch (error) {
      req.log?.error({ err: error }, "club invites route failed");
      if (!res.headersSent) fail(res, 500, "server_error");
    }
  };
}

type InviteRow = {
  id: number;
  club_id: string;
  club_name: string;
  club_logo: string | null;
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  status: string;
  created_at: Date;
};

// الشعار قد يكون صورة كبيرة، فلا نرسل إلا الصغير منه في القوائم.
const SELECT_INVITES = `
  SELECT i.id, i.club_id, c.name AS club_name,
         CASE WHEN length(c.logo) <= 20000 THEN c.logo END AS club_logo,
         i.from_user_id, f.name AS from_name, i.to_user_id, t.name AS to_name,
         i.status, i.created_at
  FROM clubsa_club_invites i
  JOIN clubsa_social_clubs c ON c.id = i.club_id
  JOIN clubsa_social_users f ON f.id = i.from_user_id
  JOIN clubsa_social_users t ON t.id = i.to_user_id`;

function toInvite(r: InviteRow) {
  return {
    id: r.id,
    clubId: r.club_id,
    clubName: r.club_name,
    clubLogo: r.club_logo,
    fromUserId: r.from_user_id,
    fromUserName: r.from_name,
    toUserId: r.to_user_id,
    toUserName: r.to_name,
    status: r.status,
    createdAt: r.created_at,
  };
}

/* الدعوات الواردة (المعلّقة) للاعب */
router.get(
  "/club-invites/incoming",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    if (!listLimit.allow(id)) return fail(res, 429, "rate_limited");
    const { rows } = await pool.query<InviteRow>(
      `${SELECT_INVITES} WHERE i.to_user_id = $1 AND i.status = 'pending' ORDER BY i.id DESC LIMIT 50`,
      [id],
    );
    res.json({ invites: rows.map(toInvite) });
  }),
);

/* الدعوات التي أرسلها نادي المستخدم (لعرض حالتها) */
router.get(
  "/club-invites/sent",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    if (!listLimit.allow(id)) return fail(res, 429, "rate_limited");
    const { rows } = await pool.query<InviteRow>(
      `${SELECT_INVITES}
       WHERE i.club_id = (SELECT club_id FROM clubsa_social_users WHERE id = $1)
       ORDER BY i.id DESC LIMIT 100`,
      [id],
    );
    res.json({ invites: rows.map(toInvite) });
  }),
);

/* إرسال دعوة */
router.post(
  "/club-invites",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(id)) return fail(res, 429, "rate_limited");

    const toUserId = (req.body as { toUserId?: unknown } | undefined)?.toUserId;
    if (typeof toUserId !== "string" || !toUserId || toUserId.length > 100) return fail(res, 400, "invalid_target");
    if (toUserId === id) return fail(res, 400, "invalid_target");

    const sender = await pool.query<{ role: string; club_id: string | null }>(
      "SELECT role, club_id FROM clubsa_social_users WHERE id = $1",
      [id],
    );
    const from = sender.rows[0];
    if (!from) return fail(res, 401, "unauthorized");
    if (!["president", "scout"].includes(from.role) || !from.club_id) return fail(res, 403, "managers_only");

    const club = await pool.query("SELECT 1 FROM clubsa_social_clubs WHERE id = $1", [from.club_id]);
    if (!club.rowCount) return fail(res, 409, "club_not_synced");

    const target = await pool.query<{ role: string; club_id: string | null }>(
      "SELECT role, club_id FROM clubsa_social_users WHERE id = $1",
      [toUserId],
    );
    const to = target.rows[0];
    if (!to) return fail(res, 404, "not_found");
    if (to.role !== "player") return fail(res, 400, "players_only");
    if (to.club_id === from.club_id) return fail(res, 409, "already_member");

    const inserted = await pool.query(
      `INSERT INTO clubsa_club_invites (club_id, from_user_id, to_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (club_id, to_user_id) WHERE status = 'pending' DO NOTHING
       RETURNING id`,
      [from.club_id, id, toUserId],
    );
    res.status(inserted.rowCount ? 201 : 200).json({ ok: true, duplicate: !inserted.rowCount });
  }),
);

/* قبول أو رفض دعوة */
router.post(
  "/club-invites/:id/respond",
  route(async (req, res) => {
    const userId = await authenticate(req);
    if (!userId) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(userId)) return fail(res, 429, "rate_limited");

    const inviteId = Number(req.params.id);
    const status = (req.body as { status?: unknown } | undefined)?.status;
    if (!Number.isInteger(inviteId) || inviteId <= 0) return fail(res, 400, "invalid_invite");
    if (status !== "accepted" && status !== "declined") return fail(res, 400, "invalid_status");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query<{ club_id: string }>(
        "SELECT club_id FROM clubsa_club_invites WHERE id = $1 AND to_user_id = $2 AND status = 'pending' FOR UPDATE",
        [inviteId, userId],
      );
      const invite = found.rows[0];
      if (!invite) {
        await client.query("ROLLBACK");
        return fail(res, 404, "not_found");
      }

      if (status === "accepted") {
        const club = await client.query<{ name: string }>("SELECT name FROM clubsa_social_clubs WHERE id = $1", [invite.club_id]);
        if (!club.rows[0]) {
          await client.query("ROLLBACK");
          return fail(res, 409, "club_not_synced");
        }
        await client.query(
          "UPDATE clubsa_social_users SET club_id = $1, club_name = $2, is_free_agent = false, updated_at = now() WHERE id = $3",
          [invite.club_id, club.rows[0].name, userId],
        );
        // نفس آلية السوق: المتصفح يلتقط النادي الجديد ثم يؤكد الاستلام.
        await client.query(
          `INSERT INTO clubsa_market_wallets (kind, owner_id, balance, assignment_pending, assigned_club_id)
           VALUES ('user', $1, $2, true, $3)
           ON CONFLICT (kind, owner_id)
           DO UPDATE SET assignment_pending = true, assigned_club_id = $3, updated_at = now()`,
          [userId, PLAYER_START_BALANCE, invite.club_id],
        );
        // باقي الدعوات المعلّقة لهذا اللاعب تنتهي لأنه انضم لنادٍ
        await client.query(
          "UPDATE clubsa_club_invites SET status = 'declined', responded_at = now() WHERE to_user_id = $1 AND status = 'pending' AND id <> $2",
          [userId, inviteId],
        );
      }

      await client.query(
        "UPDATE clubsa_club_invites SET status = $1, responded_at = now() WHERE id = $2",
        [status, inviteId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    res.json({ ok: true });
  }),
);

export default router;
