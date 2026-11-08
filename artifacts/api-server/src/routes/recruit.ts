import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter, maskForbidden } from "../lib/public-chat-rules";
import { activeSanction } from "../lib/moderation";
import { ensureTables as ensureSocialTables, authenticate } from "./social";

const router: IRouter = Router();

const listLimit = createRateLimiter({ windowMs: 60_000, max: 60 });
const postLimit = createRateLimiter({ windowMs: 60 * 60_000, max: 6 });

/** لوحة "أبحث عن نادي / مطلوب لاعب". التصفح عام، والنشر يتطلب حسابًا. */
const KINDS = ["need_club", "need_player"] as const;
type Kind = (typeof KINDS)[number];
const POSITIONS = ["GK", "CB", "FB", "CDM", "CM", "CAM", "WG", "ST"];
const REGIONS = ["المنطقة الوسطى", "المنطقة الغربية", "المنطقة الشرقية", "المنطقة الشمالية", "المنطقة الجنوبية"];

const MAX_ACTIVE_PER_USER = 2;
const POST_DAYS = 14;
const NOTE_MIN = 5;
const NOTE_MAX = 200;
const LIST_LIMIT = 50;

let tablesReady: Promise<void> | null = null;
let lastCleanup = 0;

function ensureTables(): Promise<void> {
  tablesReady ??= ensureSocialTables()
    .then(() =>
      pool.query(
        `CREATE TABLE IF NOT EXISTS clubsa_recruit_posts (
          id serial PRIMARY KEY,
          user_id text NOT NULL,
          kind text NOT NULL,
          position text NOT NULL DEFAULT '',
          region text NOT NULL DEFAULT '',
          min_overall integer NOT NULL DEFAULT 0,
          note text NOT NULL,
          club_id text,
          created_at timestamptz NOT NULL DEFAULT now(),
          expires_at timestamptz NOT NULL
        );
        CREATE INDEX IF NOT EXISTS clubsa_recruit_posts_list_idx ON clubsa_recruit_posts (kind, expires_at);
        CREATE INDEX IF NOT EXISTS clubsa_recruit_posts_user_idx ON clubsa_recruit_posts (user_id);`,
      ),
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      tablesReady = null;
      throw error;
    });
  return tablesReady;
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export type ParsedPost = { kind: Kind; position: string; region: string; minOverall: number; note: string };

/** دالة خالصة: تتحقق من جسم الطلب ولا تثق بالمتصفح. */
export function parsePostBody(body: unknown): { ok: true; value: ParsedPost } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;

  if (typeof b.kind !== "string" || !(KINDS as readonly string[]).includes(b.kind)) return { ok: false, error: "invalid_kind" };
  const kind = b.kind as Kind;

  const position = b.position === undefined || b.position === null || b.position === "" ? "" : b.position;
  if (typeof position !== "string" || (position !== "" && !POSITIONS.includes(position))) return { ok: false, error: "invalid_position" };

  const region = b.region === undefined || b.region === null || b.region === "" ? "" : b.region;
  if (typeof region !== "string" || (region !== "" && !REGIONS.includes(region))) return { ok: false, error: "invalid_region" };

  const rawOverall = b.minOverall === undefined || b.minOverall === null || b.minOverall === "" ? 0 : Number(b.minOverall);
  if (!Number.isInteger(rawOverall) || rawOverall < 0 || rawOverall > 99) return { ok: false, error: "invalid_overall" };

  if (typeof b.note !== "string") return { ok: false, error: "invalid_note" };
  const note = b.note.replace(CONTROL_CHARS, "").trim();
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) return { ok: false, error: "invalid_note" };

  return { ok: true, value: { kind, position, region, minOverall: rawOverall, note: maskForbidden(note) } };
}

type PostRow = {
  id: number;
  user_id: string;
  kind: string;
  position: string;
  region: string;
  min_overall: number;
  note: string;
  club_id: string | null;
  created_at: Date;
  expires_at: Date;
  u_name: string | null;
  u_username: string | null;
  u_position: string | null;
  u_overall: number | null;
  u_club_name: string | null;
  u_avatar: string | null;
};

router.get("/recruit", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!listLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    await ensureTables();

    const now = Date.now();
    if (now - lastCleanup > 60_000) {
      lastCleanup = now;
      await pool.query("DELETE FROM clubsa_recruit_posts WHERE expires_at < now()");
    }

    const params: unknown[] = [];
    const where: string[] = ["p.expires_at > now()"];
    const kind = typeof req.query.kind === "string" ? req.query.kind : "";
    if ((KINDS as readonly string[]).includes(kind)) {
      params.push(kind);
      where.push(`p.kind = $${params.length}`);
    }
    const position = typeof req.query.position === "string" ? req.query.position : "";
    if (POSITIONS.includes(position)) {
      // الإعلان المفتوح لأي مركز يظهر مع كل مركز.
      params.push(position);
      where.push(`(p.position = $${params.length} OR p.position = '')`);
    }
    const region = typeof req.query.region === "string" ? req.query.region : "";
    if (REGIONS.includes(region)) {
      params.push(region);
      where.push(`(p.region = $${params.length} OR p.region = '')`);
    }

    const { rows } = await pool.query<PostRow>(
      `SELECT p.id, p.user_id, p.kind, p.position, p.region, p.min_overall, p.note, p.club_id,
              p.created_at, p.expires_at,
              u.name AS u_name, u.username AS u_username, u.position AS u_position,
              u.overall AS u_overall, u.club_name AS u_club_name,
              CASE WHEN length(u.avatar) <= 20000 THEN u.avatar END AS u_avatar
       FROM clubsa_recruit_posts p
       LEFT JOIN clubsa_social_users u ON u.id = p.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.created_at DESC
       LIMIT ${LIST_LIMIT}`,
      params,
    );

    res.setHeader("Cache-Control", "public, max-age=15");
    res.json({
      posts: rows
        .filter((r) => r.u_name)
        .map((r) => ({
          id: r.id,
          kind: r.kind,
          position: r.position,
          region: r.region,
          minOverall: r.min_overall,
          note: r.note,
          createdAt: r.created_at,
          expiresAt: r.expires_at,
          poster: {
            id: r.user_id,
            name: r.u_name,
            username: r.u_username,
            position: r.u_position,
            overall: r.u_overall ?? 0,
            clubId: r.club_id,
            clubName: r.u_club_name,
            avatar: r.u_avatar,
          },
        })),
    });
  } catch (error) {
    req.log?.error({ err: error }, "recruit list failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

router.post("/recruit", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!postLimit.allow(me)) return fail(res, 429, "rate_limited");
    const sanction = await activeSanction(me);
    if (sanction) return fail(res, 403, sanction.kind === "ban" ? "sanctioned_ban" : "sanctioned_mute");

    const parsed = parsePostBody(req.body);
    if (!parsed.ok) return fail(res, 400, parsed.error);
    const p = parsed.value;

    const userRows = await pool.query<{ club_id: string | null; club_rank: string }>(
      "SELECT club_id, club_rank FROM clubsa_social_users WHERE id = $1",
      [me],
    );
    const user = userRows.rows[0];
    if (!user) return fail(res, 401, "unauthorized");

    let clubId: string | null = null;
    if (p.kind === "need_player") {
      // "مطلوب لاعب" للنادي فقط: الرئيس أو النائب أو الكشاف.
      if (!user.club_id) return fail(res, 403, "no_club");
      const club = await pool.query<{ president_id: string }>(
        "SELECT president_id FROM clubsa_social_clubs WHERE id = $1",
        [user.club_id],
      );
      const isPresident = club.rows[0]?.president_id === me;
      const isStaff = user.club_rank === "vice" || user.club_rank === "scout";
      if (!isPresident && !isStaff) return fail(res, 403, "not_allowed");
      clubId = user.club_id;
    }

    const active = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM clubsa_recruit_posts WHERE user_id = $1 AND expires_at > now()",
      [me],
    );
    if ((active.rows[0]?.n ?? 0) >= MAX_ACTIVE_PER_USER) return fail(res, 409, "too_many_posts");

    const inserted = await pool.query<{ id: number }>(
      `INSERT INTO clubsa_recruit_posts (user_id, kind, position, region, min_overall, note, club_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now() + ($8 || ' days')::interval)
       RETURNING id`,
      [me, p.kind, p.position, p.region, p.minOverall, p.note, clubId, String(POST_DAYS)],
    );
    res.status(201).json({ id: inserted.rows[0].id });
  } catch (error) {
    req.log?.error({ err: error }, "recruit create failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

router.delete("/recruit/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    const id = Number(String(req.params.id));
    if (!Number.isInteger(id) || id <= 0) return fail(res, 400, "invalid_id");
    const result = await pool.query("DELETE FROM clubsa_recruit_posts WHERE id = $1 AND user_id = $2", [id, me]);
    if (!result.rowCount) return fail(res, 404, "not_found");
    res.json({ ok: true });
  } catch (error) {
    req.log?.error({ err: error }, "recruit delete failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

export default router;
