import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { CLUB_START_BUDGET, PLAYER_START_BALANCE } from "../lib/market-rules";
import { ensureTables } from "./social";

const router: IRouter = Router();
const listLimit = createRateLimiter({ windowMs: 60_000, max: 60 });

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

const LIMIT = 10;

/** متصدرون عامّون من الخادم: يراها كل الزوار دون تسجيل دخول. */
router.get("/leaderboards", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!listLimit.allow(clientKey(req))) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    await ensureTables();
    res.setHeader("Cache-Control", "public, max-age=30");

    // جدول المحافظ يُنشأ مع ensureTables؛ نستخدم LEFT JOIN لأن بعض الحسابات لم تُنشأ لها محفظة بعد.
    const clubs = await pool.query<{ id: string; name: string; region: string; wins: number; trophies: number; budget: string }>(
      `SELECT c.id, c.name, c.region, c.wins, c.trophies,
              COALESCE(w.balance, $1)::text AS budget
       FROM clubsa_social_clubs c
       LEFT JOIN clubsa_market_wallets w ON w.kind = 'club' AND w.owner_id = c.id`,
      [CLUB_START_BUDGET],
    );
    const players = await pool.query<{ id: string; name: string; position: string | null; region: string; overall: number; balance: string }>(
      `SELECT u.id, u.name, u.position, u.region, u.overall,
              COALESCE(w.balance, $1)::text AS balance
       FROM clubsa_social_users u
       LEFT JOIN clubsa_market_wallets w ON w.kind = 'user' AND w.owner_id = u.id
       WHERE u.role = 'player'`,
      [PLAYER_START_BALANCE],
    );

    const top = <T,>(rows: T[], by: (row: T) => number): T[] => [...rows].sort((a, b) => by(b) - by(a)).slice(0, LIMIT);
    const clubRows = clubs.rows.map((c) => ({ id: c.id, name: c.name, region: c.region, wins: c.wins, trophies: c.trophies, budget: Number(c.budget) }));
    const playerRows = players.rows.map((p) => ({ id: p.id, name: p.name, position: p.position, region: p.region, overall: p.overall, balance: Number(p.balance) }));

    res.json({
      clubs: {
        wins: top(clubRows, (c) => c.wins),
        trophies: top(clubRows, (c) => c.trophies),
        budget: top(clubRows, (c) => c.budget),
      },
      players: {
        overall: top(playerRows, (p) => p.overall),
        balance: top(playerRows, (p) => p.balance),
      },
    });
  } catch (error) {
    req.log?.error({ err: error }, "leaderboards route failed");
    if (!res.headersSent) res.status(500).json({ error: "server_error" });
  }
});

export default router;
