import { Router, type IRouter, type Request, type Response } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import {
  escapeLike,
  isValidId,
  isValidKey,
  parseDirectMessage,
  parseProfileBody,
  relationshipOf,
  type Relationship,
} from "../lib/social-rules";

const router: IRouter = Router();

const syncLimit = createRateLimiter({ windowMs: 60_000, max: 30 });
const friendLimit = createRateLimiter({ windowMs: 60_000, max: 60 });
const dmLimit = createRateLimiter({ windowMs: 30_000, max: 20 });
const searchLimit = createRateLimiter({ windowMs: 60_000, max: 90 });

/* ───────────── الجداول (تُنشأ عند أول طلب) ───────────── */

let tablesReady: Promise<void> | null = null;

function ensureTables(): Promise<void> {
  tablesReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_social_users (
        id text PRIMARY KEY,
        key_hash text NOT NULL,
        name text NOT NULL,
        username text,
        role text NOT NULL,
        region text NOT NULL DEFAULT '',
        ea_id text,
        position text,
        overall integer NOT NULL DEFAULT 0,
        avatar text,
        club_id text,
        club_name text,
        is_free_agent boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS clubsa_social_clubs (
        id text PRIMARY KEY,
        name text NOT NULL,
        region text NOT NULL DEFAULT '',
        logo text,
        president_id text NOT NULL,
        primary_color text NOT NULL DEFAULT '#2563eb',
        secondary_color text NOT NULL DEFAULT '#ffffff',
        wins integer NOT NULL DEFAULT 0,
        draws integer NOT NULL DEFAULT 0,
        losses integer NOT NULL DEFAULT 0,
        trophies integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS clubsa_social_friends (
        id serial PRIMARY KEY,
        requester_id text NOT NULL,
        addressee_id text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS clubsa_social_friends_pair_unique
        ON clubsa_social_friends (requester_id, addressee_id);
      CREATE TABLE IF NOT EXISTS clubsa_social_messages (
        id serial PRIMARY KEY,
        sender_id text NOT NULL,
        receiver_id text NOT NULL,
        text text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS clubsa_social_messages_receiver_idx
        ON clubsa_social_messages (receiver_id, id);
      CREATE INDEX IF NOT EXISTS clubsa_social_messages_sender_idx
        ON clubsa_social_messages (sender_id, id);`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      tablesReady = null;
      throw error;
    });
  return tablesReady;
}

/* ───────────── أدوات مساعدة ───────────── */

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      await handler(req, res);
    } catch (error) {
      req.log?.error({ err: error }, "social route failed");
      if (!res.headersSent) res.status(500).json({ error: "server_error" });
    }
  };
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function clientKey(req: Request): string {
  const forwarded = header(req, "x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** يتحقق من هوية الطلب: معرّف المستخدم + مفتاحه السري المحفوظ في متصفحه. */
async function authenticate(req: Request): Promise<string | null> {
  const id = header(req, "x-clubsa-user");
  const key = header(req, "x-clubsa-key");
  if (!isValidId(id) || !isValidKey(key)) return null;
  const { rows } = await pool.query<{ key_hash: string }>(
    "SELECT key_hash FROM clubsa_social_users WHERE id = $1",
    [id],
  );
  if (!rows[0] || !sameHash(rows[0].key_hash, sha256(key))) return null;
  return id;
}

async function requireUser(req: Request, res: Response): Promise<string | null> {
  const id = await authenticate(req);
  if (!id) fail(res, 401, "unauthorized");
  return id;
}

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  role: string;
  region: string;
  ea_id: string | null;
  position: string | null;
  overall: number;
  club_id: string | null;
  club_name: string | null;
  is_free_agent: boolean;
  avatar?: string | null;
};

const USER_COLS = "id, name, username, role, region, ea_id, position, overall, club_id, club_name, is_free_agent";

function publicUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    region: row.region,
    eaId: row.ea_id,
    position: row.position,
    overall: row.overall,
    clubId: row.club_id,
    clubName: row.club_name,
    isFreeAgent: row.is_free_agent,
    ...(row.avatar !== undefined ? { avatar: row.avatar } : {}),
  };
}

async function findLink(a: string, b: string) {
  const { rows } = await pool.query<{ requester_id: string; addressee_id: string; status: string }>(
    `SELECT requester_id, addressee_id, status FROM clubsa_social_friends
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
     LIMIT 1`,
    [a, b],
  );
  const row = rows[0];
  return row ? { requesterId: row.requester_id, addresseeId: row.addressee_id, status: row.status } : null;
}

async function userExists(id: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT 1 FROM clubsa_social_users WHERE id = $1", [id]);
  return rows.length > 0;
}

async function usersByIds(ids: string[]): Promise<Map<string, ReturnType<typeof publicUser>>> {
  const map = new Map<string, ReturnType<typeof publicUser>>();
  if (ids.length === 0) return map;
  const { rows } = await pool.query<UserRow>(
    `SELECT ${USER_COLS} FROM clubsa_social_users WHERE id = ANY($1::text[])`,
    [ids],
  );
  for (const row of rows) map.set(row.id, publicUser(row));
  return map;
}

/* ───────────── مزامنة الملف الشخصي ───────────── */

router.put(
  "/social/me",
  route(async (req, res) => {
    const id = header(req, "x-clubsa-user");
    const key = header(req, "x-clubsa-key");
    if (!isValidId(id) || !isValidKey(key)) return fail(res, 401, "unauthorized");
    if (!syncLimit.allow(id)) return fail(res, 429, "rate_limited");

    const parsed = parseProfileBody(req.body);
    if (!parsed.ok) return fail(res, 400, parsed.error);
    const p = parsed.value;
    const hash = sha256(key);

    const existing = await pool.query<{ key_hash: string }>(
      "SELECT key_hash FROM clubsa_social_users WHERE id = $1",
      [id],
    );
    if (existing.rows[0] && !sameHash(existing.rows[0].key_hash, hash)) {
      return fail(res, 403, "key_mismatch");
    }

    await pool.query(
      `INSERT INTO clubsa_social_users
        (id, key_hash, name, username, role, region, ea_id, position, overall, avatar, club_id, club_name, is_free_agent, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, username = EXCLUDED.username, role = EXCLUDED.role,
         region = EXCLUDED.region, ea_id = EXCLUDED.ea_id, position = EXCLUDED.position,
         overall = EXCLUDED.overall, avatar = EXCLUDED.avatar, club_id = EXCLUDED.club_id,
         club_name = EXCLUDED.club_name, is_free_agent = EXCLUDED.is_free_agent, updated_at = now()`,
      [id, hash, p.name, p.username, p.role, p.region, p.eaId, p.position, p.overall, p.avatar, p.clubId, p.clubName, p.isFreeAgent],
    );

    if (p.club) {
      // لا يستطيع أحد تعديل نادٍ لا يملكه: التحديث يمر فقط إذا كان الرئيس المسجّل هو صاحب الطلب.
      await pool.query(
        `INSERT INTO clubsa_social_clubs
          (id, name, region, logo, president_id, primary_color, secondary_color, wins, draws, losses, trophies, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, region = EXCLUDED.region, logo = EXCLUDED.logo,
           primary_color = EXCLUDED.primary_color, secondary_color = EXCLUDED.secondary_color,
           wins = EXCLUDED.wins, draws = EXCLUDED.draws, losses = EXCLUDED.losses,
           trophies = EXCLUDED.trophies, updated_at = now()
         WHERE clubsa_social_clubs.president_id = EXCLUDED.president_id`,
        [p.club.id, p.club.name, p.club.region, p.club.logo, id, p.club.primaryColor, p.club.secondaryColor, p.club.wins, p.club.draws, p.club.losses, p.club.trophies],
      );
    }

    res.json({ ok: true });
  }),
);

/* ───────────── البحث وعرض الملفات (عام) ───────────── */

router.get(
  "/social/search",
  route(async (req, res) => {
    if (!searchLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const q = String(req.query.q ?? "").trim().slice(0, 40);
    res.setHeader("Cache-Control", "no-store");
    if (!q) {
      res.json({ users: [], clubs: [] });
      return;
    }
    const pattern = `%${escapeLike(q)}%`;

    const users = await pool.query<UserRow>(
      `SELECT ${USER_COLS} FROM clubsa_social_users
       WHERE name ILIKE $1 ESCAPE '\\' OR username ILIKE $1 ESCAPE '\\'
       ORDER BY name LIMIT 20`,
      [pattern],
    );
    const clubs = await pool.query<{
      id: string; name: string; region: string; president_id: string;
      primary_color: string; secondary_color: string;
      wins: number; draws: number; losses: number; trophies: number; member_count: number;
    }>(
      `SELECT c.id, c.name, c.region, c.president_id, c.primary_color, c.secondary_color,
              c.wins, c.draws, c.losses, c.trophies,
              (SELECT count(*)::int FROM clubsa_social_users u WHERE u.club_id = c.id) AS member_count
       FROM clubsa_social_clubs c
       WHERE c.name ILIKE $1 ESCAPE '\\'
       ORDER BY c.name LIMIT 20`,
      [pattern],
    );

    res.json({
      users: users.rows.map(publicUser),
      clubs: clubs.rows.map((c) => ({
        id: c.id,
        name: c.name,
        region: c.region,
        presidentId: c.president_id,
        primaryColor: c.primary_color,
        secondaryColor: c.secondary_color,
        wins: c.wins,
        draws: c.draws,
        losses: c.losses,
        trophies: c.trophies,
        memberCount: c.member_count,
      })),
    });
  }),
);

router.get(
  "/social/users/:id",
  route(async (req, res) => {
    const target = param(req, "id");
    if (!isValidId(target)) return fail(res, 400, "invalid_id");
    const { rows } = await pool.query<UserRow>(
      `SELECT ${USER_COLS}, avatar FROM clubsa_social_users WHERE id = $1`,
      [target],
    );
    if (!rows[0]) return fail(res, 404, "not_found");

    const me = await authenticate(req);
    const relationship: Relationship = me ? relationshipOf(me, target, await findLink(me, target)) : "none";
    res.setHeader("Cache-Control", "no-store");
    res.json({ user: publicUser(rows[0]), relationship });
  }),
);

router.get(
  "/social/clubs/:id",
  route(async (req, res) => {
    const clubId = param(req, "id");
    if (!isValidId(clubId)) return fail(res, 400, "invalid_id");
    const clubs = await pool.query<{
      id: string; name: string; region: string; logo: string | null; president_id: string;
      primary_color: string; secondary_color: string;
      wins: number; draws: number; losses: number; trophies: number;
    }>(
      `SELECT id, name, region, logo, president_id, primary_color, secondary_color, wins, draws, losses, trophies
       FROM clubsa_social_clubs WHERE id = $1`,
      [clubId],
    );
    const club = clubs.rows[0];
    if (!club) return fail(res, 404, "not_found");

    const roster = await pool.query<UserRow>(
      `SELECT ${USER_COLS} FROM clubsa_social_users WHERE club_id = $1 ORDER BY overall DESC, name LIMIT 50`,
      [clubId],
    );
    const president = (await usersByIds([club.president_id])).get(club.president_id) ?? null;

    res.setHeader("Cache-Control", "no-store");
    res.json({
      club: {
        id: club.id,
        name: club.name,
        region: club.region,
        logo: club.logo,
        presidentId: club.president_id,
        primaryColor: club.primary_color,
        secondaryColor: club.secondary_color,
        wins: club.wins,
        draws: club.draws,
        losses: club.losses,
        trophies: club.trophies,
        memberCount: roster.rows.length,
      },
      president,
      roster: roster.rows.map(publicUser),
    });
  }),
);

/* ───────────── الصداقات (تتطلب هوية) ───────────── */

router.get(
  "/social/friends",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const links = await pool.query<{ requester_id: string; addressee_id: string; status: string }>(
      `SELECT requester_id, addressee_id, status FROM clubsa_social_friends
       WHERE requester_id = $1 OR addressee_id = $1 ORDER BY id DESC LIMIT 500`,
      [me],
    );
    const others = [...new Set(links.rows.map((l) => (l.requester_id === me ? l.addressee_id : l.requester_id)))];
    const users = await usersByIds(others);

    const friends: unknown[] = [];
    const incoming: unknown[] = [];
    const outgoing: unknown[] = [];
    for (const link of links.rows) {
      const otherId = link.requester_id === me ? link.addressee_id : link.requester_id;
      const user = users.get(otherId);
      if (!user) continue;
      if (link.status === "accepted") friends.push(user);
      else if (link.requester_id === me) outgoing.push(user);
      else incoming.push(user);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ friends, incoming, outgoing });
  }),
);

router.post(
  "/social/friends/:id",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const target = param(req, "id");
    if (!isValidId(target)) return fail(res, 400, "invalid_id");
    if (target === me) return fail(res, 400, "cannot_target_self");
    if (!friendLimit.allow(me)) return fail(res, 429, "rate_limited");
    if (!(await userExists(target))) return fail(res, 404, "not_found");

    const link = await findLink(me, target);
    if (!link) {
      await pool.query(
        `INSERT INTO clubsa_social_friends (requester_id, addressee_id, status) VALUES ($1, $2, 'pending')
         ON CONFLICT DO NOTHING`,
        [me, target],
      );
    } else if (link.status === "pending" && link.requesterId === target) {
      // الطرف الآخر أرسل لي طلبًا من قبل، فإرسالي له يعني القبول.
      await pool.query(
        `UPDATE clubsa_social_friends SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2`,
        [target, me],
      );
    }
    res.json({ relationship: relationshipOf(me, target, await findLink(me, target)) });
  }),
);

router.post(
  "/social/friends/:id/accept",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const target = param(req, "id");
    if (!isValidId(target)) return fail(res, 400, "invalid_id");
    if (!friendLimit.allow(me)) return fail(res, 429, "rate_limited");
    const updated = await pool.query(
      `UPDATE clubsa_social_friends SET status = 'accepted'
       WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [target, me],
    );
    if (updated.rowCount === 0) return fail(res, 404, "no_pending_request");
    res.json({ relationship: "friends" satisfies Relationship });
  }),
);

router.delete(
  "/social/friends/:id",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const target = param(req, "id");
    if (!isValidId(target)) return fail(res, 400, "invalid_id");
    if (!friendLimit.allow(me)) return fail(res, 429, "rate_limited");
    await pool.query(
      `DELETE FROM clubsa_social_friends
       WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
      [me, target],
    );
    res.json({ relationship: "none" satisfies Relationship });
  }),
);

/* ───────────── الرسائل الخاصة (تتطلب هوية) ───────────── */

router.get(
  "/social/conversations",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const latest = await pool.query<{
      peer: string; id: number; sender_id: string; text: string; created_at: Date;
    }>(
      `SELECT DISTINCT ON (peer) peer, id, sender_id, text, created_at
       FROM (
         SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS peer,
                id, sender_id, text, created_at
         FROM clubsa_social_messages
         WHERE sender_id = $1 OR receiver_id = $1
       ) t
       ORDER BY peer, id DESC`,
      [me],
    );
    const rows = latest.rows.sort((a, b) => b.id - a.id).slice(0, 30);
    const users = await usersByIds(rows.map((r) => r.peer));
    res.setHeader("Cache-Control", "no-store");
    res.json({
      conversations: rows
        .filter((r) => users.has(r.peer))
        .map((r) => ({
          peer: users.get(r.peer),
          lastText: r.text.slice(0, 120),
          lastAt: r.created_at.toISOString(),
          lastFromMe: r.sender_id === me,
        })),
    });
  }),
);

router.get(
  "/social/messages/:peerId",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const peer = param(req, "peerId");
    if (!isValidId(peer)) return fail(res, 400, "invalid_id");
    const { rows } = await pool.query<{
      id: number; sender_id: string; receiver_id: string; text: string; created_at: Date;
    }>(
      `SELECT id, sender_id, receiver_id, text, created_at FROM clubsa_social_messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY id DESC LIMIT 100`,
      [me, peer],
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({
      messages: rows.reverse().map((r) => ({
        id: r.id,
        senderId: r.sender_id,
        receiverId: r.receiver_id,
        text: r.text,
        createdAt: r.created_at.toISOString(),
      })),
    });
  }),
);

router.post(
  "/social/messages/:peerId",
  route(async (req, res) => {
    const me = await requireUser(req, res);
    if (!me) return;
    const peer = param(req, "peerId");
    if (!isValidId(peer)) return fail(res, 400, "invalid_id");
    if (peer === me) return fail(res, 400, "cannot_target_self");
    const parsed = parseDirectMessage(req.body);
    if (!parsed.ok) return fail(res, 400, parsed.error);
    if (!dmLimit.allow(me)) return fail(res, 429, "rate_limited");
    if (!(await userExists(peer))) return fail(res, 404, "not_found");

    const { rows } = await pool.query<{ id: number; created_at: Date }>(
      `INSERT INTO clubsa_social_messages (sender_id, receiver_id, text) VALUES ($1, $2, $3)
       RETURNING id, created_at`,
      [me, peer, parsed.text],
    );
    res.status(201).json({
      message: {
        id: rows[0].id,
        senderId: me,
        receiverId: peer,
        text: parsed.text,
        createdAt: rows[0].created_at.toISOString(),
      },
    });
  }),
);

export default router;
