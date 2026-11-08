import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { isValidId } from "../lib/social-rules";
import { adminUserIds, isAdmin } from "../lib/admin";
import { activeSanction, ensureModeration } from "../lib/moderation";
import { notify } from "../lib/notify";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();

const readLimit = createRateLimiter({ windowMs: 60_000, max: 120 });
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 40 });
const reportLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 10 });

const MAX_BLOCKS = 200;
const REASONS = ["spam", "abuse", "scam", "other"] as const;
const REPORT_KINDS = ["chat_message", "recruit_post", "user"] as const;
const DURATIONS: Record<string, number | null> = { "1h": 3_600_000, "24h": 86_400_000, "7d": 604_800_000, perm: null };
const DURATION_LABELS: Record<string, string> = { "1h": "ساعة", "24h": "24 ساعة", "7d": "7 أيام", perm: "بشكل دائم" };

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

type Handler = (req: Request, res: Response, me: string) => Promise<void>;

/** يتحقق من الهوية ويُنشئ الجداول ويلتقط الأخطاء. */
function authed(handler: Handler, options: { admin?: boolean; write?: boolean } = {}) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      await ensureModeration();
      res.setHeader("Cache-Control", "no-store");
      const me = await authenticate(req);
      if (!me) return fail(res, 401, "unauthorized");
      if (!(options.write ? writeLimit : readLimit).allow(me)) return fail(res, 429, "rate_limited");
      if (options.admin && !(await isAdmin(me))) return fail(res, 403, "admin_only");
      await handler(req, res, me);
    } catch (error) {
      req.log?.error({ err: error }, "moderation route failed");
      if (!res.headersSent) fail(res, 500, "server_error");
    }
  };
}

/* ───────────── حالة المستخدم الحالية ───────────── */

router.get(
  "/moderation/me",
  authed(async (_req, res, me) => {
    const [admin, sanction, blocks] = await Promise.all([
      isAdmin(me),
      activeSanction(me),
      pool.query<{ blocked_id: string }>("SELECT blocked_id FROM clubsa_blocks WHERE blocker_id = $1", [me]),
    ]);
    res.json({
      admin,
      sanction: sanction ? { kind: sanction.kind, until: sanction.until } : null,
      blockedIds: blocks.rows.map((r) => r.blocked_id),
    });
  }),
);

/* ───────────── الحظر بين المستخدمين ───────────── */

router.post(
  "/moderation/blocks/:userId",
  authed(
    async (req, res, me) => {
      const target = param(req, "userId");
      if (!isValidId(target) || target === me) return fail(res, 400, "invalid_target");
      const exists = await pool.query("SELECT 1 FROM clubsa_social_users WHERE id = $1", [target]);
      if (exists.rows.length === 0) return fail(res, 404, "not_found");
      const count = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM clubsa_blocks WHERE blocker_id = $1", [me]);
      if ((count.rows[0]?.n ?? 0) >= MAX_BLOCKS) return fail(res, 409, "too_many_blocks");
      await pool.query("INSERT INTO clubsa_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [me, target]);
      // الحظر يلغي الصداقة بينهما.
      await pool
        .query(
          "DELETE FROM clubsa_social_friends WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)",
          [me, target],
        )
        .catch(() => undefined);
      res.json({ ok: true });
    },
    { write: true },
  ),
);

router.delete(
  "/moderation/blocks/:userId",
  authed(
    async (req, res, me) => {
      const target = param(req, "userId");
      if (!isValidId(target)) return fail(res, 400, "invalid_target");
      await pool.query("DELETE FROM clubsa_blocks WHERE blocker_id = $1 AND blocked_id = $2", [me, target]);
      res.json({ ok: true });
    },
    { write: true },
  ),
);

/* ───────────── البلاغات ───────────── */

router.post(
  "/moderation/reports",
  authed(
    async (req, res, me) => {
      if (!reportLimit.allow(me)) return fail(res, 429, "rate_limited");
      const body = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
      const kind = body.kind;
      const reason = body.reason;
      const ref = String(body.targetRef ?? "");
      if (typeof kind !== "string" || !(REPORT_KINDS as readonly string[]).includes(kind)) return fail(res, 400, "invalid_kind");
      if (typeof reason !== "string" || !(REASONS as readonly string[]).includes(reason)) return fail(res, 400, "invalid_reason");
      const note = typeof body.note === "string" ? body.note.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 200) : "";

      // نعرف صاحب المحتوى من الخادم، ولا نثق بما يرسله المتصفح.
      let targetUser: string | null = null;
      let excerpt = "";
      if (kind === "chat_message") {
        if (!/^\d{1,12}$/.test(ref)) return fail(res, 400, "invalid_ref");
        const found = await pool.query<{ sender_id: string; text: string }>("SELECT sender_id, text FROM clubsa_public_chat WHERE id = $1", [Number(ref)]);
        targetUser = found.rows[0]?.sender_id ?? null;
        excerpt = found.rows[0]?.text ?? "";
      } else if (kind === "recruit_post") {
        if (!/^\d{1,12}$/.test(ref)) return fail(res, 400, "invalid_ref");
        const found = await pool
          .query<{ user_id: string; note: string }>("SELECT user_id, note FROM clubsa_recruit_posts WHERE id = $1", [Number(ref)])
          .catch(() => ({ rows: [] as { user_id: string; note: string }[] }));
        targetUser = found.rows[0]?.user_id ?? null;
        excerpt = found.rows[0]?.note ?? "";
      } else {
        if (!isValidId(ref)) return fail(res, 400, "invalid_ref");
        const found = await pool.query<{ id: string; name: string }>("SELECT id, name FROM clubsa_social_users WHERE id = $1", [ref]);
        targetUser = found.rows[0]?.id ?? null;
        excerpt = found.rows[0]?.name ?? "";
      }
      if (!targetUser) return fail(res, 404, "not_found");
      if (targetUser === me) return fail(res, 400, "cannot_report_self");

      const inserted = await pool.query(
        `INSERT INTO clubsa_reports (reporter_id, kind, target_user_id, target_ref, excerpt, reason, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (reporter_id, kind, target_ref) WHERE status = 'open' DO NOTHING
         RETURNING id`,
        [me, kind, targetUser, ref, excerpt.slice(0, 200), reason, note],
      );
      if (inserted.rows.length === 0) return fail(res, 409, "already_reported");

      // إشعار واحد مجمّع للمشرفين مهما تعددت البلاغات.
      for (const adminId of await adminUserIds()) {
        notify(adminId, { kind: "report", title: "بلاغ جديد يحتاج مراجعة", body: "افتح لوحة الإشراف.", target: "moderation", dedupeKey: "reports" });
      }
      res.status(201).json({ ok: true });
    },
    { write: true },
  ),
);

/* ───────────── لوحة المشرف ───────────── */

router.get(
  "/moderation/reports",
  authed(
    async (_req, res) => {
      const { rows } = await pool.query<{
        id: string; kind: string; reason: string; note: string; excerpt: string; target_ref: string; created_at: Date;
        reporter_id: string; reporter_name: string | null; target_id: string; target_name: string | null; target_open: number;
      }>(
        `SELECT r.id::text, r.kind, r.reason, r.note, r.excerpt, r.target_ref, r.created_at,
                r.reporter_id, ru.name AS reporter_name, r.target_user_id AS target_id, tu.name AS target_name,
                (SELECT count(*)::int FROM clubsa_reports x WHERE x.target_user_id = r.target_user_id AND x.status = 'open') AS target_open
         FROM clubsa_reports r
         LEFT JOIN clubsa_social_users ru ON ru.id = r.reporter_id
         LEFT JOIN clubsa_social_users tu ON tu.id = r.target_user_id
         WHERE r.status = 'open'
         ORDER BY r.id DESC LIMIT 50`,
      );
      res.json({
        reports: rows.map((r) => ({
          id: Number(r.id),
          kind: r.kind,
          reason: r.reason,
          note: r.note,
          excerpt: r.excerpt,
          createdAt: r.created_at,
          reporter: { id: r.reporter_id, name: r.reporter_name ?? "مستخدم" },
          target: { id: r.target_id, name: r.target_name ?? "مستخدم" },
          targetOpenReports: r.target_open,
        })),
      });
    },
    { admin: true },
  ),
);

const RESOLVE_ACTIONS = ["dismiss", "delete", "mute1h", "mute24h", "mute7d", "ban"] as const;

async function applySanction(targetId: string, adminId: string, kind: "mute" | "ban", duration: string): Promise<void> {
  const ms = DURATIONS[duration];
  const until = ms === null || ms === undefined ? null : new Date(Date.now() + ms);
  await pool.query(
    `INSERT INTO clubsa_sanctions (user_id, kind, until, by_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET kind = $2, until = $3, by_id = $4, created_at = now()`,
    [targetId, kind, until, adminId],
  );
  notify(targetId, {
    kind: "sanction",
    title: kind === "ban" ? "تم إيقاف حسابك عن الكتابة" : `تم كتمك ${DURATION_LABELS[duration] ?? ""}`,
    body: "لا تقدر تكتب في الدردشة أو الرسائل أو الإعلانات خلال هذه المدة، بسبب مخالفة قوانين الموقع.",
    target: "profile",
  });
}

router.post(
  "/moderation/reports/:id/resolve",
  authed(
    async (req, res, me) => {
      const reportId = Number(param(req, "id"));
      const action = (req.body as { action?: unknown } | undefined)?.action;
      if (!Number.isInteger(reportId) || reportId <= 0) return fail(res, 400, "invalid_id");
      if (typeof action !== "string" || !(RESOLVE_ACTIONS as readonly string[]).includes(action)) return fail(res, 400, "invalid_action");

      if (action.startsWith("mute") || action === "ban") {
        const pre = await pool.query<{ target_user_id: string }>("SELECT target_user_id FROM clubsa_reports WHERE id = $1 AND status = 'open'", [reportId]);
        if (pre.rows[0] && (await isAdmin(pre.rows[0].target_user_id))) return fail(res, 400, "cannot_sanction_admin");
      }

      // "نحجز" البلاغ بتحديث ذري حتى لا يعالجه مشرفان معًا.
      const claimed = await pool.query<{ kind: string; target_user_id: string; target_ref: string; reporter_id: string }>(
        `UPDATE clubsa_reports SET status = $2, handled_by = $3, handled_at = now()
         WHERE id = $1 AND status = 'open' RETURNING kind, target_user_id, target_ref, reporter_id`,
        [reportId, action === "dismiss" ? "dismissed" : "resolved", me],
      );
      const report = claimed.rows[0];
      if (!report) return fail(res, 404, "not_found");

      if (action !== "dismiss") {
        if (report.kind === "chat_message") {
          await pool.query("DELETE FROM clubsa_public_chat WHERE id = $1", [Number(report.target_ref)]);
        } else if (report.kind === "recruit_post") {
          await pool.query("DELETE FROM clubsa_recruit_posts WHERE id = $1", [Number(report.target_ref)]).catch(() => undefined);
        }
        if (action.startsWith("mute") || action === "ban") {
          if (await isAdmin(report.target_user_id)) return fail(res, 400, "cannot_sanction_admin");
          await applySanction(report.target_user_id, me, action === "ban" ? "ban" : "mute", action === "ban" ? "perm" : action.slice(4));
        }
        // بقية البلاغات المفتوحة على نفس المحتوى تُغلق معه.
        await pool.query(
          "UPDATE clubsa_reports SET status = 'resolved', handled_by = $1, handled_at = now() WHERE status = 'open' AND kind = $2 AND target_ref = $3",
          [me, report.kind, report.target_ref],
        );
      }

      notify(report.reporter_id, {
        kind: "report_handled",
        title: action === "dismiss" ? "راجعنا بلاغك ولم نجد مخالفة" : "شكرًا، تم اتخاذ إجراء بخصوص بلاغك",
      });
      res.json({ ok: true });
    },
    { admin: true, write: true },
  ),
);

/* ───────────── كتم/حظر مباشر وإلغاؤه (للمشرف) ───────────── */

router.get(
  "/moderation/sanctions",
  authed(
    async (_req, res) => {
      const { rows } = await pool.query<{ user_id: string; name: string | null; kind: string; until: Date | null }>(
        `SELECT s.user_id, u.name, s.kind, s.until FROM clubsa_sanctions s
         LEFT JOIN clubsa_social_users u ON u.id = s.user_id
         WHERE s.until IS NULL OR s.until > now() ORDER BY s.created_at DESC LIMIT 100`,
      );
      res.json({ sanctions: rows.map((r) => ({ userId: r.user_id, name: r.name ?? "مستخدم", kind: r.kind, until: r.until })) });
    },
    { admin: true },
  ),
);

router.post(
  "/moderation/sanctions",
  authed(
    async (req, res, me) => {
      const body = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
      const userId = body.userId;
      const kind = body.kind;
      const duration = body.duration;
      if (!isValidId(userId)) return fail(res, 400, "invalid_target");
      if (kind !== "mute" && kind !== "ban") return fail(res, 400, "invalid_kind");
      const normalized = kind === "ban" ? "perm" : duration;
      if (typeof normalized !== "string" || !(normalized in DURATIONS) || (kind === "mute" && normalized === "perm")) return fail(res, 400, "invalid_duration");
      if (userId === me || (await isAdmin(userId))) return fail(res, 400, "cannot_sanction_admin");
      const exists = await pool.query("SELECT 1 FROM clubsa_social_users WHERE id = $1", [userId]);
      if (exists.rows.length === 0) return fail(res, 404, "not_found");
      await applySanction(userId, me, kind, normalized);
      res.json({ ok: true });
    },
    { admin: true, write: true },
  ),
);

router.delete(
  "/moderation/sanctions/:userId",
  authed(
    async (req, res) => {
      const target = param(req, "userId");
      if (!isValidId(target)) return fail(res, 400, "invalid_target");
      await pool.query("DELETE FROM clubsa_sanctions WHERE user_id = $1", [target]);
      notify(target, { kind: "sanction_lifted", title: "تم رفع الكتم عن حسابك", body: "تقدر تكتب من جديد. التزم بقوانين الموقع." });
      res.json({ ok: true });
    },
    { admin: true, write: true },
  ),
);

export default router;
