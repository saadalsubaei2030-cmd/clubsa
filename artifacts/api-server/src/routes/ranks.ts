import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { PLAYER_START_BALANCE } from "../lib/market-rules";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 40 });

const RANKS = ["member", "vice", "scout"] as const;

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

/** رئيس النادي يغيّر رتبة عضو في ناديه: لاعب عادي / نائب النادي / كشاف. */
router.post("/club-ranks/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");

    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(me)) return fail(res, 429, "rate_limited");

    const target = req.params.userId;
    const rank = (req.body as { rank?: unknown } | undefined)?.rank;
    if (typeof target !== "string" || !target || target.length > 100) return fail(res, 400, "invalid_target");
    if (typeof rank !== "string" || !(RANKS as readonly string[]).includes(rank)) return fail(res, 400, "invalid_rank");
    if (target === me) return fail(res, 400, "invalid_target");

    const club = await pool.query<{ id: string }>(
      "SELECT id FROM clubsa_social_clubs WHERE president_id = $1 LIMIT 1",
      [me],
    );
    const clubId = club.rows[0]?.id;
    if (!clubId) return fail(res, 403, "presidents_only");

    const updated = await pool.query(
      `UPDATE clubsa_social_users SET club_rank = $1, updated_at = now()
       WHERE id = $2 AND club_id = $3 AND role <> 'president'`,
      [rank, target, clubId],
    );
    if (!updated.rowCount) return fail(res, 404, "not_found");
    res.json({ ok: true, rank });
  } catch (error) {
    req.log?.error({ err: error }, "club rank route failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

/**
 * طرد عضو من النادي.
 * الرئيس: يطرد أي عضو. النائب: الكشاف واللاعب العادي فقط. غيرهما لا يملك الصلاحية.
 */
router.post("/club-members/:userId/kick", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");

    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(me)) return fail(res, 429, "rate_limited");

    const target = req.params.userId;
    if (typeof target !== "string" || !target || target.length > 100 || target === me) return fail(res, 400, "invalid_target");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const actor = await client.query<{ club_id: string | null; club_rank: string }>(
        "SELECT club_id, club_rank FROM clubsa_social_users WHERE id = $1",
        [me],
      );
      const a = actor.rows[0];
      if (!a?.club_id) {
        await client.query("ROLLBACK");
        return fail(res, 403, "managers_only");
      }
      const owned = await client.query("SELECT 1 FROM clubsa_social_clubs WHERE id = $1 AND president_id = $2", [a.club_id, me]);
      const isPresident = (owned.rowCount ?? 0) > 0;
      if (!isPresident && a.club_rank !== "vice") {
        await client.query("ROLLBACK");
        return fail(res, 403, "managers_only");
      }

      const found = await client.query<{ role: string; club_rank: string }>(
        "SELECT role, club_rank FROM clubsa_social_users WHERE id = $1 AND club_id = $2 FOR UPDATE",
        [target, a.club_id],
      );
      const t = found.rows[0];
      if (!t) {
        await client.query("ROLLBACK");
        return fail(res, 404, "not_found");
      }
      if (t.role === "president") {
        await client.query("ROLLBACK");
        return fail(res, 403, "forbidden_target");
      }
      if (!isPresident && t.club_rank === "vice") {
        await client.query("ROLLBACK");
        return fail(res, 403, "forbidden_target");
      }

      await client.query(
        "UPDATE clubsa_social_users SET club_id = NULL, club_name = NULL, is_free_agent = true, club_rank = 'member', updated_at = now() WHERE id = $1",
        [target],
      );
      // المتصفح يلتقط الإزالة من /market/me ثم يؤكد الاستلام.
      await client.query(
        `INSERT INTO clubsa_market_wallets (kind, owner_id, balance, assignment_pending, assigned_club_id)
         VALUES ('user', $1, $2, true, NULL)
         ON CONFLICT (kind, owner_id)
         DO UPDATE SET assignment_pending = true, assigned_club_id = NULL, updated_at = now()`,
        [target, PLAYER_START_BALANCE],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    // إعلان السوق المفتوح لا معنى له بعد الطرد (قد لا يكون جدول السوق أُنشئ بعد، فنتجاهل الخطأ).
    await pool
      .query("UPDATE clubsa_market_listings SET status = 'cancelled' WHERE player_id = $1 AND status = 'open'", [target])
      .catch(() => undefined);
    res.json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error }, "club kick route failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

export default router;
