import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { SITE_URL, authorizeUrl, discordConfigured, ensureDiscord, exchangeCode, getDiscordLink, readState } from "../lib/discord";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();
const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const callbackLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function back(res: Response, result: "linked" | "taken" | "failed"): void {
  res.redirect(302, `${SITE_URL}/?tab=tournaments&discord=${result}`);
}

router.get("/discord/me", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!limiter.allow(me)) return fail(res, 429, "rate_limited");
    const link = await getDiscordLink(me);
    res.json({ configured: discordConfigured(), linked: !!link, name: link?.name ?? null });
  } catch (error) {
    req.log?.error({ err: error }, "discord me failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

router.get("/discord/link-url", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!limiter.allow(me)) return fail(res, 429, "rate_limited");
    if (!discordConfigured()) return fail(res, 503, "discord_not_configured");
    if (await getDiscordLink(me)) return fail(res, 409, "already_linked");
    res.json({ url: authorizeUrl(me) });
  } catch (error) {
    req.log?.error({ err: error }, "discord link-url failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

/** ديسكورد يعيد المستخدم هنا بعد الموافقة. الهوية تأتي من state الموقّع لا من المتصفح. */
router.get("/discord/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    if (!callbackLimiter.allow(ip)) return back(res, "failed");
    if (!discordConfigured()) return back(res, "failed");
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const userId = readState(req.query.state);
    if (!code || !userId) return back(res, "failed");
    await ensureTables();
    await ensureDiscord();
    const exists = await pool.query("SELECT 1 FROM clubsa_social_users WHERE id = $1", [userId]);
    if (exists.rows.length === 0) return back(res, "failed");
    const identity = await exchangeCode(code);
    // حساب ديسكورد واحد لحساب موقع واحد، حتى لا يتحايل أحد على الحظر بحسابات متعددة.
    const inserted = await pool.query(
      `INSERT INTO clubsa_discord_links (user_id, discord_id, discord_name) VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING RETURNING user_id`,
      [userId, identity.id, identity.name],
    );
    if (inserted.rows.length === 0) {
      const mine = await pool.query<{ discord_id: string }>("SELECT discord_id FROM clubsa_discord_links WHERE user_id = $1", [userId]);
      return back(res, mine.rows[0]?.discord_id === identity.id ? "linked" : "taken");
    }
    back(res, "linked");
  } catch (error) {
    req.log?.error({ err: error }, "discord callback failed");
    if (!res.headersSent) back(res, "failed");
  }
});

export default router;
