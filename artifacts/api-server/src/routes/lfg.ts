import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import { authenticate, ensureTables } from "./social";
import { parsePostInput, type PostKind } from "../lib/lfg-rules";

const router: IRouter = Router();

const listLimit = createRateLimiter({ windowMs: 60_000, max: 90 });
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 20 });

const MAX_OPEN_POSTS = 3;

let ready: Promise<void> | null = null;

function ensureLfg(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_lfg_posts (
        id serial PRIMARY KEY,
        author_id text NOT NULL,
        kind text NOT NULL,
        position text NOT NULL DEFAULT 'ANY',
        platform text NOT NULL DEFAULT 'ANY',
        min_overall integer NOT NULL DEFAULT 0,
        body text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS clubsa_lfg_posts_open
        ON clubsa_lfg_posts (status, kind, id DESC);`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      await ensureLfg();
      res.setHeader("Cache-Control", "no-store");
      await handler(req, res);
    } catch (error) {
      req.log?.error({ err: error }, "lfg route failed");
      if (!res.headersSent) fail(res, 500, "server_error");
    }
  };
}

function queryString(req: Request, name: string): string {
  const value = req.query[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim().slice(0, 40) : "";
}

type PostRow = {
  id: number;
  kind: string;
  position: string;
  platform: string;
  min_overall: number;
  body: string;
  created_at: Date;
  author_id: string;
  name: string;
  username: string | null;
  role: string;
  region: string;
  overall: number;
  avatar: string | null;
  user_position: string | null;
  club_id: string | null;
  club_name: string | null;
};

const SELECT_POSTS = `
  SELECT p.id, p.kind, p.position, p.platform, p.min_overall, p.body, p.created_at,
         u.id AS author_id, u.name, u.username, u.role, u.region, u.overall,
         CASE WHEN length(u.avatar) <= 20000 THEN u.avatar END AS avatar,
         u.position AS user_position, u.club_id, u.club_name
  FROM clubsa_lfg_posts p
  JOIN clubsa_social_users u ON u.id = p.author_id`;

function toPost(r: PostRow) {
  return {
    id: r.id,
    kind: r.kind as PostKind,
    position: r.position,
    platform: r.platform,
    minOverall: r.min_overall,
    body: r.body,
    createdAt: r.created_at,
    author: {
      id: r.author_id,
      name: r.name,
      username: r.username,
      role: r.role,
      region: r.region,
      overall: r.overall,
      avatar: r.avatar,
      position: r.user_position,
      clubId: r.club_id,
      clubName: r.club_name,
    },
  };
}

router.get(
  "/lfg/posts",
  route(async (req, res) => {
    if (!listLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");

    const where = ["p.status = 'open'"];
    const params: unknown[] = [];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace("?", `$${params.length}`));
    };

    const kind = queryString(req, "kind");
    if (kind === "seeking_club" || kind === "seeking_player") add("p.kind = ?", kind);
    const position = queryString(req, "position");
    if (position && position !== "ANY") add("(p.position = ? OR p.position = 'ANY')", position);
    const platform = queryString(req, "platform");
    if (platform && platform !== "ANY") add("(p.platform = ? OR p.platform = 'ANY')", platform);
    const region = queryString(req, "region");
    if (region) add("u.region = ?", region);

    const { rows } = await pool.query<PostRow>(
      `${SELECT_POSTS} WHERE ${where.join(" AND ")} ORDER BY p.id DESC LIMIT 60`,
      params,
    );
    res.json({ posts: rows.map(toPost) });
  }),
);

router.get(
  "/lfg/mine",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    const { rows } = await pool.query<PostRow>(
      `${SELECT_POSTS} WHERE p.author_id = $1 AND p.status = 'open' ORDER BY p.id DESC`,
      [id],
    );
    res.json({ posts: rows.map(toPost) });
  }),
);

router.post(
  "/lfg/posts",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(id)) return fail(res, 429, "rate_limited");

    const input = parsePostInput(req.body);
    if (!input) return fail(res, 400, "invalid_post");

    const { rows: users } = await pool.query<{ role: string; club_id: string | null }>(
      "SELECT role, club_id FROM clubsa_social_users WHERE id = $1",
      [id],
    );
    const user = users[0];
    if (!user) return fail(res, 401, "unauthorized");

    if (input.kind === "seeking_club" && user.role !== "player") return fail(res, 403, "players_only");
    if (input.kind === "seeking_player" && (user.role !== "president" || !user.club_id)) {
      return fail(res, 403, "presidents_only");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // قفل المستخدم حتى لا يتجاوز الحد بطلبين متزامنين
      await client.query("SELECT id FROM clubsa_social_users WHERE id = $1 FOR UPDATE", [id]);
      const { rows: count } = await client.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM clubsa_lfg_posts WHERE author_id = $1 AND status = 'open'",
        [id],
      );
      if (Number(count[0]?.n ?? 0) >= MAX_OPEN_POSTS) {
        await client.query("ROLLBACK");
        return fail(res, 409, "too_many_posts");
      }
      await client.query(
        `INSERT INTO clubsa_lfg_posts (author_id, kind, position, platform, min_overall, body)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, input.kind, input.position, input.platform, input.minOverall, input.body],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  "/lfg/posts/:id",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId) || postId <= 0) return fail(res, 400, "invalid_post");
    const result = await pool.query(
      "UPDATE clubsa_lfg_posts SET status = 'closed' WHERE id = $1 AND author_id = $2 AND status = 'open'",
      [postId, id],
    );
    if (!result.rowCount) return fail(res, 404, "not_found");
    res.json({ ok: true });
  }),
);

export default router;
