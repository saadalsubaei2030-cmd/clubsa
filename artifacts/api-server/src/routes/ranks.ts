import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
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

export default router;
