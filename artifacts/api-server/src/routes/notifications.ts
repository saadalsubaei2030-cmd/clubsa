import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { ensureNotifications } from "../lib/notify";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();
const readLimit = createRateLimiter({ windowMs: 60_000, max: 120 });
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 40 });

const LIST_LIMIT = 30;
const MAX_IDS = 50;

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

type Row = { id: string; kind: string; title: string; body: string; target: string; created_at: Date; read_at: Date | null };

router.get("/notifications", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    await ensureNotifications();
    res.setHeader("Cache-Control", "no-store");
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!readLimit.allow(me)) return fail(res, 429, "rate_limited");

    const [list, unread] = await Promise.all([
      pool.query<Row>(
        `SELECT id::text, kind, title, body, target, created_at, read_at
         FROM clubsa_notifications WHERE user_id = $1 ORDER BY id DESC LIMIT ${LIST_LIMIT}`,
        [me],
      ),
      pool.query<{ n: number }>("SELECT count(*)::int AS n FROM clubsa_notifications WHERE user_id = $1 AND read_at IS NULL", [me]),
    ]);
    res.json({
      unread: unread.rows[0]?.n ?? 0,
      items: list.rows.map((r) => ({
        id: Number(r.id),
        kind: r.kind,
        title: r.title,
        body: r.body,
        target: r.target,
        createdAt: r.created_at,
        read: r.read_at !== null,
      })),
    });
  } catch (error) {
    req.log?.error({ err: error }, "notifications list failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

/** يعلّم إشعارات معيّنة كمقروءة (ids)، أو كلها إذا لم تُرسل ids. */
router.post("/notifications/read", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    await ensureNotifications();
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(me)) return fail(res, 429, "rate_limited");

    const ids = (req.body as { ids?: unknown } | undefined)?.ids;
    if (ids === undefined) {
      await pool.query("UPDATE clubsa_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL", [me]);
    } else {
      if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every((id) => Number.isInteger(id) && id > 0)) return fail(res, 400, "invalid_ids");
      await pool.query("UPDATE clubsa_notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL AND id = ANY($2::bigint[])", [me, ids]);
    }
    res.json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error }, "notifications read failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

/** يمسح كل إشعارات المستخدم. */
router.post("/notifications/clear", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    await ensureNotifications();
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(me)) return fail(res, 429, "rate_limited");
    await pool.query("DELETE FROM clubsa_notifications WHERE user_id = $1", [me]);
    res.json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error }, "notifications clear failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

export default router;
