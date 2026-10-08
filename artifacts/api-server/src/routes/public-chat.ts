import { Router, type IRouter, type Request } from "express";
import { desc, gt, asc } from "drizzle-orm";
import { db, pool, publicChatTable } from "@workspace/db";
import { createRateLimiter, parseChatBody } from "../lib/public-chat-rules";

const router: IRouter = Router();

// حماية أساسية من الإزعاج: 10 رسائل كل 30 ثانية لكل عنوان IP، و200 رسالة في الدقيقة للموقع كله.
const perClient = createRateLimiter({ windowMs: 30_000, max: 10 });
const siteWide = createRateLimiter({ windowMs: 60_000, max: 200 });

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
  const parsed = parseChatBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (!perClient.allow(clientKey(req)) || !siteWide.allow("all")) {
    res.status(429).json({ error: "rate_limited" });
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

export default router;
