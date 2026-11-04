import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { isValidId, isValidKey } from "../lib/social-rules";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const registerLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 20 });
const loginLimitIp = createRateLimiter({ windowMs: 15 * 60_000, max: 40 });
const loginLimitEmail = createRateLimiter({ windowMs: 15 * 60_000, max: 10 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// الواجهة تفرض 8 أحرف على الحسابات الجديدة؛ الخادم يقبل 4 حتى تُرحَّل الحسابات القديمة.
const MIN_PASSWORD = 4;
const MAX_PASSWORD = 128;
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

let ready: Promise<void> | null = null;
function ensureAccounts(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_accounts (
        email text PRIMARY KEY,
        user_id text NOT NULL UNIQUE,
        pw_salt text NOT NULL,
        pw_hash text NOT NULL,
        key_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE clubsa_social_users ADD COLUMN IF NOT EXISTS player_build jsonb;`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      await ensureAccounts();
      res.setHeader("Cache-Control", "no-store");
      await handler(req, res);
    } catch (error) {
      req.log?.error({ err: error }, "accounts route failed");
      if (!res.headersSent) fail(res, 500, "server_error");
    }
  };
}

function parseCredentials(body: unknown): { email: string; password: string } | null {
  const src = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof src.email !== "string" || typeof src.password !== "string") return null;
  const email = src.email.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  if (src.password.length > MAX_PASSWORD) return null;
  return { email, password: src.password };
}

async function hashPassword(password: string, salt: Buffer): Promise<string> {
  return (await scryptAsync(password, salt, 64)).toString("hex");
}

/* تسجيل حساب جديد: المتصفح يولّد المعرّف والمفتاح السري، والخادم يحفظ بصمة المفتاح وكلمة المرور مشفّرة. */
router.post(
  "/auth/register",
  route(async (req, res) => {
    if (!registerLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const creds = parseCredentials(req.body);
    if (!creds) return fail(res, 400, "invalid_credentials");
    if (creds.password.length < MIN_PASSWORD) return fail(res, 400, "weak_password");

    const src = req.body as { userId?: unknown; key?: unknown };
    if (!isValidId(src.userId) || !isValidKey(src.key)) return fail(res, 400, "invalid_identity");

    const salt = randomBytes(16);
    const hash = await hashPassword(creds.password, salt);
    try {
      await pool.query(
        "INSERT INTO clubsa_accounts (email, user_id, pw_salt, pw_hash, key_hash) VALUES ($1, $2, $3, $4, $5)",
        [creds.email, src.userId, salt.toString("hex"), hash, sha256(src.key)],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return fail(res, 409, "email_taken");
      throw error;
    }
    res.status(201).json({ ok: true });
  }),
);

/* تسجيل الدخول: عند النجاح يُصدر الخادم مفتاحًا جديدًا لهذا الجهاز (ويبطل مفتاح الأجهزة الأخرى). */
router.post(
  "/auth/login",
  route(async (req, res) => {
    if (!loginLimitIp.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const creds = parseCredentials(req.body);
    if (!creds) return fail(res, 401, "invalid_login");
    if (!loginLimitEmail.allow(creds.email)) return fail(res, 429, "rate_limited");

    const { rows } = await pool.query<{ user_id: string; pw_salt: string; pw_hash: string }>(
      "SELECT user_id, pw_salt, pw_hash FROM clubsa_accounts WHERE email = $1",
      [creds.email],
    );
    const account = rows[0];
    // نحسب التشفير دائمًا حتى لا يكشف زمن الرد وجود البريد.
    const salt = Buffer.from(account?.pw_salt ?? "00".repeat(16), "hex");
    const attempt = Buffer.from(await hashPassword(creds.password, salt), "hex");
    const stored = Buffer.from(account?.pw_hash ?? "00".repeat(64), "hex");
    if (!account || attempt.length !== stored.length || !timingSafeEqual(attempt, stored)) {
      return fail(res, 401, "invalid_login");
    }

    const key = randomBytes(16).toString("hex");
    const keyHash = sha256(key);
    await pool.query("UPDATE clubsa_accounts SET key_hash = $1 WHERE email = $2", [keyHash, creds.email]);
    await pool.query("UPDATE clubsa_social_users SET key_hash = $1 WHERE id = $2", [keyHash, account.user_id]);
    res.json({ userId: account.user_id, key });
  }),
);

/* ملف الحساب الكامل لاستعادته على جهاز جديد (يتطلب مفتاح الجهاز). */
router.get(
  "/auth/me",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    const user = await pool.query(
      `SELECT id, name, username, role, region, ea_id, position, overall, avatar, club_id, club_name, is_free_agent, club_rank, player_build
       FROM clubsa_social_users WHERE id = $1`,
      [id],
    );
    const u = user.rows[0];
    if (!u) return res.json({ profile: null, club: null });
    const club = await pool.query(
      `SELECT id, name, region, logo, president_id, primary_color, secondary_color, wins, draws, losses, trophies
       FROM clubsa_social_clubs WHERE id = $1`,
      [u.club_id ?? ""],
    );
    res.json({
      profile: {
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        region: u.region,
        eaId: u.ea_id,
        position: u.position,
        overall: u.overall,
        avatar: u.avatar,
        clubId: u.club_id,
        clubName: u.club_name,
        isFreeAgent: u.is_free_agent,
        clubRank: u.club_rank,
        build: u.player_build,
      },
      club: club.rows[0]
        ? {
            id: club.rows[0].id,
            name: club.rows[0].name,
            region: club.rows[0].region,
            logo: club.rows[0].logo,
            presidentId: club.rows[0].president_id,
            primaryColor: club.rows[0].primary_color,
            secondaryColor: club.rows[0].secondary_color,
            wins: club.rows[0].wins,
            draws: club.rows[0].draws,
            losses: club.rows[0].losses,
            trophies: club.rows[0].trophies,
          }
        : null,
    });
  }),
);

export default router;
