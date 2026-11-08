import { Router, type IRouter, type Request } from "express";
import { desc, gt, asc } from "drizzle-orm";
import { db, pool, publicChatTable } from "@workspace/db";
import { createRateLimiter, parseChatBody } from "../lib/public-chat-rules";
import { authenticate, ensureTables as ensureSocialTables } from "./social";

const router: IRouter = Router();

// حماية أساسية من الإزعاج: 10 رسائل كل 30 ثانية لكل عنوان IP، و200 رسالة في الدقيقة للموقع كله.
const perClient = createRateLimiter({ windowMs: 30_000, max: 10 });
const siteWide = createRateLimiter({ windowMs: 60_000, max: 200 });
const deleteLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

// مشرفو الموقع: إيميلات حساباتهم في متغير البيئة ADMIN_EMAILS (مفصولة بفاصلة) على Render.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

async function isAdmin(userId: string): Promise<boolean> {
  if (ADMIN_EMAILS.size === 0) return false;
  const { rows } = await pool.query<{ email: string }>("SELECT email FROM clubsa_accounts WHERE user_id = $1", [userId]);
  return rows.some((row) => ADMIN_EMAILS.has(row.email.toLowerCase()));
}

let tableReady: Promise<void> | null = null;

// ينشئ الجدول عند أول طلب حتى لا نحتاج إلى تشغيل db push يدويًا على Replit.
function ensureTable(): Promise<void> {
  tableReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_public_chat (
        id serial PRIMARY KEY,
        sender_id text NOT NULL,
        sender_name text NOT NULL,
        text text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      tableReady = null;
      throw error;
    });
  return tableReady;
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return raw?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function toMessage(row: typeof publicChatTable.$inferSelect) {
  return {
    id: row.id,
    senderId: row.senderId,
    senderName: row.senderName,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/chat/public", async (req, res): Promise<void> => {
  try {
    await ensureTable();
    const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 200);
    const after = Number.parseInt(String(req.query.after ?? ""), 10);

    const rows = Number.isFinite(after)
      ? await db.select().from(publicChatTable).where(gt(publicChatTable.id, after)).orderBy(asc(publicChatTable.id)).limit(limit)
      : (await db.select().from(publicChatTable).orderBy(desc(publicChatTable.id)).limit(limit)).reverse();

    res.setHeader("Cache-Control", "no-store");
    res.json({ messages: rows.map(toMessage) });
  } catch (error) {
    req.log?.error({ err: error }, "public chat: failed to load messages");
    res.status(500).json({ error: "chat_unavailable" });
  }
});

router.post("/chat/public", async (req, res): Promise<void> => {
  if (!perClient.allow(clientKey(req)) || !siteWide.allow("all")) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  // المرسل يُحدَّد من الحساب الموثّق (المعرّف + المفتاح السري) وليس مما يكتبه المتصفح،
  // حتى لا ينتحل أحد اسم أو صورة غيره.
  let senderId: string | null;
  let senderName: string | undefined;
  try {
    await ensureSocialTables();
    senderId = await authenticate(req);
    if (!senderId) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const { rows } = await pool.query<{ name: string }>("SELECT name FROM clubsa_social_users WHERE id = $1", [senderId]);
    senderName = rows[0]?.name;
  } catch (error) {
    req.log?.error({ err: error }, "public chat: failed to verify sender");
    res.status(500).json({ error: "chat_unavailable" });
    return;
  }

  const source = typeof req.body === "object" && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const parsed = parseChatBody({ senderId, senderName, text: source.text });
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  try {
    await ensureTable();
    const [row] = await db.insert(publicChatTable).values(parsed.value).returning();

    // تنظيف دوري: نحتفظ بآخر 2000 رسالة فقط.
    if (row.id % 50 === 0) {
      await pool.query(`DELETE FROM clubsa_public_chat WHERE id <= $1`, [row.id - 2000]);
    }

    res.status(201).json({ message: toMessage(row) });
  } catch (error) {
    req.log?.error({ err: error }, "public chat: failed to save message");
    res.status(500).json({ error: "chat_unavailable" });
  }
});

/** هل المستخدم الحالي مشرف؟ تستخدمه الواجهة لإظهار زر الحذف على رسائل الجميع. */
router.get("/chat/me", async (req, res): Promise<void> => {
  try {
    await ensureSocialTables();
    const me = await authenticate(req);
    if (!me) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ admin: await isAdmin(me) });
  } catch (error) {
    req.log?.error({ err: error }, "public chat: failed to check admin");
    res.status(500).json({ error: "chat_unavailable" });
  }
});

// يحذف الرسالة صاحبها أو المشرف فقط.
router.delete("/chat/public/:id", async (req, res): Promise<void> => {
  try {
    await ensureTable();
    await ensureSocialTables();
    const me = await authenticate(req);
    if (!me) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!deleteLimit.allow(me)) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    const id = Number(String(req.params.id));
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const { rows } = await pool.query<{ sender_id: string }>("SELECT sender_id FROM clubsa_public_chat WHERE id = $1", [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (rows[0].sender_id !== me && !(await isAdmin(me))) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    await pool.query("DELETE FROM clubsa_public_chat WHERE id = $1", [id]);
    res.json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error }, "public chat: failed to delete message");
    res.status(500).json({ error: "chat_unavailable" });
  }
});

export default router;
