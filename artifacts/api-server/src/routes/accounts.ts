import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { isValidId, isValidKey } from "../lib/social-rules";
import { authenticate, ensureTables } from "./social";
import { mailConfigured, sendMail } from "../lib/mailer";

const router: IRouter = Router();
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const registerLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 20 });
const loginLimitIp = createRateLimiter({ windowMs: 15 * 60_000, max: 40 });
const loginLimitEmail = createRateLimiter({ windowMs: 15 * 60_000, max: 10 });

const forgotLimitIp = createRateLimiter({ windowMs: 60 * 60_000, max: 10 });
const forgotLimitEmail = createRateLimiter({ windowMs: 60 * 60_000, max: 3 });
const resetLimitIp = createRateLimiter({ windowMs: 15 * 60_000, max: 20 });
const resetLimitEmail = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
const recoveryCodeLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 5 });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// الواجهة تفرض 8 أحرف على الحسابات الجديدة؛ الخادم يقبل 4 حتى تُرحَّل الحسابات القديمة.
const MIN_PASSWORD = 4;
const MAX_PASSWORD = 128;
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
// كلمة المرور الجديدة عند الاسترجاع: 8 أحرف على الأقل (مثل التسجيل الجديد).
const MIN_NEW_PASSWORD = 8;
const RESET_TOKEN_MINUTES = 30;
const SITE_URL = (process.env.SITE_URL || "https://clubsa-fc.com").replace(/\/+$/, "");

// أحرف بلا لبس (بدون 0/O و1/I) ليسهل نسخ الكود وكتابته.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** كود استرجاع من 16 رمزًا (80 بت عشوائية)، يُعرض مرة واحدة بصيغة XXXX-XXXX-XXXX-XXXX. */
function generateRecoveryCode(): string {
  const bytes = randomBytes(16);
  let raw = "";
  for (const byte of bytes) raw += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return raw.match(/.{4}/g)!.join("-");
}

function normalizeRecoveryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 16 ? raw : null;
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

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
      ALTER TABLE clubsa_accounts ADD COLUMN IF NOT EXISTS recovery_hash text;
      CREATE TABLE IF NOT EXISTS clubsa_password_resets (
        token_hash text PRIMARY KEY,
        email text NOT NULL,
        expires_at timestamptz NOT NULL
      );
      CREATE INDEX IF NOT EXISTS clubsa_password_resets_email_idx ON clubsa_password_resets (email);
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
    const recoveryCode = generateRecoveryCode();
    try {
      await pool.query(
        "INSERT INTO clubsa_accounts (email, user_id, pw_salt, pw_hash, key_hash, recovery_hash) VALUES ($1, $2, $3, $4, $5, $6)",
        [creds.email, src.userId, salt.toString("hex"), hash, sha256(src.key), sha256(normalizeRecoveryCode(recoveryCode)!)],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return fail(res, 409, "email_taken");
      throw error;
    }
    // الكود يظهر للمستخدم هذه المرة فقط، ولا نخزّن منه إلا بصمته.
    res.status(201).json({ ok: true, recoveryCode });
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

/** يبطل مفاتيح كل الأجهزة (بعد تغيير كلمة المرور) فيحتاج الجميع لتسجيل دخول جديد. */
async function revokeDeviceKeys(email: string, userId: string): Promise<void> {
  const dead = sha256(randomBytes(16).toString("hex"));
  await pool.query("UPDATE clubsa_accounts SET key_hash = $1 WHERE email = $2", [dead, email]);
  await pool.query("UPDATE clubsa_social_users SET key_hash = $1 WHERE id = $2", [dead, userId]);
}

async function setPassword(email: string, password: string): Promise<void> {
  const salt = randomBytes(16);
  const hash = await hashPassword(password, salt);
  await pool.query("UPDATE clubsa_accounts SET pw_salt = $1, pw_hash = $2 WHERE email = $3", [salt.toString("hex"), hash, email]);
}

/* نسيت كلمة المرور: نرسل رابطًا صالحًا 30 دقيقة. الرد ثابت دائمًا حتى لا نكشف هل البريد مسجل. */
router.post(
  "/auth/forgot",
  route(async (req, res) => {
    if (!forgotLimitIp.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const src = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
    const email = typeof src.email === "string" ? src.email.trim().toLowerCase() : "";
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) return fail(res, 400, "invalid_email");

    // نرد فورًا بنفس الرد في كل الحالات، ثم نكمل العمل.
    res.json({ ok: true });

    if (!forgotLimitEmail.allow(email)) return;
    if (!mailConfigured()) {
      req.log?.warn("password reset requested but mail is not configured (BREVO_API_KEY / MAIL_FROM)");
      return;
    }
    try {
      const { rows } = await pool.query("SELECT 1 FROM clubsa_accounts WHERE email = $1", [email]);
      if (rows.length === 0) return;
      const token = randomBytes(32).toString("hex");
      await pool.query("DELETE FROM clubsa_password_resets WHERE email = $1 OR expires_at < now()", [email]);
      await pool.query(
        "INSERT INTO clubsa_password_resets (token_hash, email, expires_at) VALUES ($1, $2, now() + ($3 || ' minutes')::interval)",
        [sha256(token), email, String(RESET_TOKEN_MINUTES)],
      );
      const link = `${SITE_URL}/?reset=${token}`;
      await sendMail({
        to: email,
        subject: "استرجاع كلمة المرور - CLUBSA",
        text: `وصلنا طلب لاسترجاع كلمة المرور لحسابك في CLUBSA.\nافتح الرابط التالي خلال ${RESET_TOKEN_MINUTES} دقيقة لتعيين كلمة مرور جديدة:\n${link}\n\nإذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء.`,
        html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8">
<p>وصلنا طلب لاسترجاع كلمة المرور لحسابك في <b>CLUBSA</b>.</p>
<p>اضغط الزر التالي خلال ${RESET_TOKEN_MINUTES} دقيقة لتعيين كلمة مرور جديدة:</p>
<p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">تعيين كلمة مرور جديدة</a></p>
<p style="color:#64748b;font-size:13px">إذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء.</p></div>`,
      });
    } catch (error) {
      req.log?.error({ err: error }, "password reset email failed");
    }
  }),
);

/* تعيين كلمة مرور جديدة بالرابط الذي وصل بالإيميل. */
router.post(
  "/auth/reset-token",
  route(async (req, res) => {
    if (!resetLimitIp.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const src = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
    if (typeof src.token !== "string" || !/^[0-9a-f]{64}$/.test(src.token)) return fail(res, 400, "invalid_token");
    if (typeof src.newPassword !== "string" || src.newPassword.length > MAX_PASSWORD) return fail(res, 400, "invalid_credentials");
    if (src.newPassword.length < MIN_NEW_PASSWORD) return fail(res, 400, "weak_password");

    // حذف الصف يضمن أن الرابط يُستخدم مرة واحدة حتى مع طلبين متزامنين.
    const used = await pool.query<{ email: string }>(
      "DELETE FROM clubsa_password_resets WHERE token_hash = $1 AND expires_at > now() RETURNING email",
      [sha256(src.token)],
    );
    const email = used.rows[0]?.email;
    if (!email) return fail(res, 400, "invalid_token");

    const account = await pool.query<{ user_id: string }>("SELECT user_id FROM clubsa_accounts WHERE email = $1", [email]);
    if (!account.rows[0]) return fail(res, 400, "invalid_token");
    await setPassword(email, src.newPassword);
    await revokeDeviceKeys(email, account.rows[0].user_id);
    res.json({ ok: true });
  }),
);

/* تعيين كلمة مرور جديدة بكود الاسترجاع. الكود يُستهلك ويصدر كود جديد. */
router.post(
  "/auth/reset",
  route(async (req, res) => {
    if (!resetLimitIp.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const src = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
    const email = typeof src.email === "string" ? src.email.trim().toLowerCase() : "";
    const code = normalizeRecoveryCode(src.recoveryCode);
    if (!EMAIL_PATTERN.test(email) || email.length > 254 || !code) return fail(res, 400, "invalid_recovery");
    if (typeof src.newPassword !== "string" || src.newPassword.length > MAX_PASSWORD) return fail(res, 400, "invalid_credentials");
    if (src.newPassword.length < MIN_NEW_PASSWORD) return fail(res, 400, "weak_password");
    if (!resetLimitEmail.allow(email)) return fail(res, 429, "rate_limited");

    const { rows } = await pool.query<{ user_id: string; recovery_hash: string | null }>(
      "SELECT user_id, recovery_hash FROM clubsa_accounts WHERE email = $1",
      [email],
    );
    const account = rows[0];
    const stored = account?.recovery_hash ?? "00".repeat(32);
    const matches = safeEqualHex(sha256(code), stored);
    if (!account || !account.recovery_hash || !matches) return fail(res, 400, "invalid_recovery");

    const newCode = generateRecoveryCode();
    await setPassword(email, src.newPassword);
    await pool.query("UPDATE clubsa_accounts SET recovery_hash = $1 WHERE email = $2", [sha256(normalizeRecoveryCode(newCode)!), email]);
    await pool.query("DELETE FROM clubsa_password_resets WHERE email = $1", [email]);
    await revokeDeviceKeys(email, account.user_id);
    res.json({ ok: true, recoveryCode: newCode });
  }),
);

/* إصدار كود استرجاع جديد (للحسابات الموجودة أو عند ضياعه). يتطلب جهازًا مسجّلًا وكلمة المرور. */
router.post(
  "/auth/recovery-code",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    if (!recoveryCodeLimit.allow(id)) return fail(res, 429, "rate_limited");
    const password = (req.body as { password?: unknown } | undefined)?.password;
    if (typeof password !== "string" || password.length > MAX_PASSWORD) return fail(res, 400, "invalid_credentials");

    const { rows } = await pool.query<{ email: string; pw_salt: string; pw_hash: string }>(
      "SELECT email, pw_salt, pw_hash FROM clubsa_accounts WHERE user_id = $1",
      [id],
    );
    const account = rows[0];
    if (!account) return fail(res, 404, "no_account");
    const attempt = await hashPassword(password, Buffer.from(account.pw_salt, "hex"));
    if (!safeEqualHex(attempt, account.pw_hash)) return fail(res, 401, "invalid_login");

    const code = generateRecoveryCode();
    await pool.query("UPDATE clubsa_accounts SET recovery_hash = $1 WHERE email = $2", [sha256(normalizeRecoveryCode(code)!), account.email]);
    res.json({ ok: true, recoveryCode: code });
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
