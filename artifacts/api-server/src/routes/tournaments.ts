import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter, maskForbidden } from "../lib/public-chat-rules";
import { isAdmin } from "../lib/admin";
import { getDiscordLink } from "../lib/discord";
import { activeSanction, ensureModeration } from "../lib/moderation";
import { notify } from "../lib/notify";
import { MAX_TEAMS_OPTIONS, MIN_TEAMS_TO_START, bracketSize, buildBracket, nextPosition, totalRounds } from "../lib/bracket";
import { authenticate, ensureTables as ensureSocialTables } from "./social";

const router: IRouter = Router();

const readLimit = createRateLimiter({ windowMs: 60_000, max: 90 });
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

const PRIZE_KINDS = ["free", "cash", "other"] as const;
type PrizeKind = (typeof PRIZE_KINDS)[number];
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

let ready: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  ready ??= ensureSocialTables()
    .then(() => ensureModeration())
    .then(() =>
      pool.query(
        `CREATE TABLE IF NOT EXISTS clubsa_tournaments (
          id serial PRIMARY KEY,
          title text NOT NULL,
          rules text NOT NULL DEFAULT '',
          prize_kind text NOT NULL DEFAULT 'free',
          prize_text text NOT NULL DEFAULT '',
          max_teams integer NOT NULL,
          status text NOT NULL DEFAULT 'open',
          starts_at timestamptz,
          winner_club_id text,
          created_by text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS clubsa_tournament_entries (
          tournament_id integer NOT NULL,
          club_id text NOT NULL,
          club_name text NOT NULL,
          president_id text NOT NULL,
          discord_name text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (tournament_id, club_id)
        );
        CREATE TABLE IF NOT EXISTS clubsa_tournament_matches (
          id serial PRIMARY KEY,
          tournament_id integer NOT NULL,
          round integer NOT NULL,
          slot integer NOT NULL,
          club_a text,
          club_b text,
          score_a integer,
          score_b integer,
          winner text,
          UNIQUE (tournament_id, round, slot)
        );`,
      ),
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

function param(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function idParam(req: Request, name = "id"): number | null {
  const n = Number(param(req, name));
  return Number.isInteger(n) && n > 0 && n < 2_000_000_000 ? n : null;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim().slice(0, max) : "";
}

/** هل الطلب يحمل هوية صالحة؟ (اختياري: الزائر يقدر يتصفح). */
async function optionalUser(req: Request): Promise<string | null> {
  if (!req.headers["x-clubsa-user"]) return null;
  return authenticate(req);
}

type Handler = (req: Request, res: Response, me: string) => Promise<void>;

function guarded(handler: Handler, options: { admin?: boolean } = {}) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      res.setHeader("Cache-Control", "no-store");
      const me = await authenticate(req);
      if (!me) return fail(res, 401, "unauthorized");
      if (!writeLimit.allow(me)) return fail(res, 429, "rate_limited");
      if (options.admin && !(await isAdmin(me))) return fail(res, 403, "admin_only");
      await handler(req, res, me);
    } catch (error) {
      req.log?.error({ err: error }, "tournaments route failed");
      if (!res.headersSent) fail(res, 500, "server_error");
    }
  };
}

/* ───────────── القائمة والتفاصيل (عامّة) ───────────── */

router.get("/tournaments", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!readLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");
    const { rows } = await pool.query(
      `SELECT t.id, t.title, t.prize_kind, t.prize_text, t.max_teams, t.status, t.starts_at, t.created_at,
              (SELECT count(*)::int FROM clubsa_tournament_entries e WHERE e.tournament_id = t.id) AS entries
       FROM clubsa_tournaments t
       ORDER BY (t.status = 'open') DESC, (t.status = 'running') DESC, t.id DESC
       LIMIT 30`,
    );
    res.json({
      tournaments: rows.map((r) => ({
        id: r.id, title: r.title, prizeKind: r.prize_kind, prizeText: r.prize_text, maxTeams: r.max_teams,
        status: r.status, startsAt: r.starts_at, entries: r.entries,
      })),
    });
  } catch (error) {
    req.log?.error({ err: error }, "tournaments list failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

/** هل أقدر أسجّل؟ يبيّن للمستخدم ما ينقصه (دخول، نادي، رئاسة، ديسكورد). */
router.get("/tournaments/eligibility", async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!readLimit.allow(me)) return fail(res, 429, "rate_limited");
    res.json(await eligibility(me));
  } catch (error) {
    req.log?.error({ err: error }, "tournaments eligibility failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

async function eligibility(me: string) {
  const user = await pool.query<{ club_id: string | null }>("SELECT club_id FROM clubsa_social_users WHERE id = $1", [me]);
  const clubId = user.rows[0]?.club_id ?? null;
  let club: { id: string; name: string; president_id: string } | null = null;
  if (clubId) {
    const found = await pool.query<{ id: string; name: string; president_id: string }>(
      "SELECT id, name, president_id FROM clubsa_social_clubs WHERE id = $1",
      [clubId],
    );
    club = found.rows[0] ?? null;
  }
  const discord = await getDiscordLink(me);
  const sanction = await activeSanction(me);
  return {
    hasClub: !!club,
    isPresident: !!club && club.president_id === me,
    clubName: club?.name ?? null,
    discordLinked: !!discord,
    discordName: discord?.name ?? null,
    sanctioned: !!sanction,
    admin: await isAdmin(me),
  };
}

router.get("/tournaments/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    if (!readLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    await ensureTables();
    res.setHeader("Cache-Control", "no-store");
    const id = idParam(req);
    if (!id) return fail(res, 400, "invalid_id");
    const t = await pool.query("SELECT * FROM clubsa_tournaments WHERE id = $1", [id]);
    const tournament = t.rows[0];
    if (!tournament) return fail(res, 404, "not_found");
    const me = await optionalUser(req);
    const admin = me ? await isAdmin(me) : false;
    const entries = await pool.query<{ club_id: string; club_name: string; president_id: string; discord_name: string }>(
      "SELECT club_id, club_name, president_id, discord_name FROM clubsa_tournament_entries WHERE tournament_id = $1 ORDER BY created_at",
      [id],
    );
    const names = new Map(entries.rows.map((e) => [e.club_id, e.club_name]));
    const participant = !!me && entries.rows.some((e) => e.president_id === me);
    const matches = await pool.query(
      "SELECT id, round, slot, club_a, club_b, score_a, score_b, winner FROM clubsa_tournament_matches WHERE tournament_id = $1 ORDER BY round, slot",
      [id],
    );
    const side = (clubId: string | null) => (clubId ? { id: clubId, name: names.get(clubId) ?? "نادي" } : null);
    res.json({
      tournament: {
        id: tournament.id, title: tournament.title, rules: tournament.rules, prizeKind: tournament.prize_kind,
        prizeText: tournament.prize_text, maxTeams: tournament.max_teams, status: tournament.status,
        startsAt: tournament.starts_at, winner: side(tournament.winner_club_id),
      },
      // أسماء ديسكورد لا تظهر إلا للمشاركين والمشرف، لتسهيل التنسيق بين الأندية.
      entries: entries.rows.map((e) => ({
        clubId: e.club_id,
        clubName: e.club_name,
        discordName: admin || participant ? e.discord_name : null,
        mine: !!me && e.president_id === me,
      })),
      matches: matches.rows.map((m) => ({
        id: m.id, round: m.round, slot: m.slot, a: side(m.club_a), b: side(m.club_b),
        scoreA: m.score_a, scoreB: m.score_b, winner: m.winner,
        bye: m.round === 1 && tournament.status !== "open" && ((m.club_a && !m.club_b) || (!m.club_a && m.club_b)) ? true : false,
      })),
      rounds: matches.rows.length ? Math.max(...matches.rows.map((m) => m.round as number)) : 0,
    });
  } catch (error) {
    req.log?.error({ err: error }, "tournament detail failed");
    if (!res.headersSent) fail(res, 500, "server_error");
  }
});

/* ───────────── إنشاء وإدارة (مشرف) ───────────── */

router.post(
  "/tournaments",
  guarded(
    async (req, res, me) => {
      const body = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
      const title = maskForbidden(clean(body.title, 80));
      const rules = maskForbidden(clean(body.rules, 2000));
      const prizeKind = body.prizeKind;
      const prizeText = maskForbidden(clean(body.prizeText, 200));
      const maxTeams = Number(body.maxTeams);
      if (title.length < 3) return fail(res, 400, "invalid_title");
      if (typeof prizeKind !== "string" || !(PRIZE_KINDS as readonly string[]).includes(prizeKind)) return fail(res, 400, "invalid_prize_kind");
      if (prizeKind !== "free" && prizeText.length < 2) return fail(res, 400, "prize_text_required");
      if (!(MAX_TEAMS_OPTIONS as readonly number[]).includes(maxTeams)) return fail(res, 400, "invalid_max_teams");
      let startsAt: Date | null = null;
      if (typeof body.startsAt === "string" && body.startsAt) {
        startsAt = new Date(body.startsAt);
        if (Number.isNaN(startsAt.getTime())) return fail(res, 400, "invalid_date");
      }
      const inserted = await pool.query<{ id: number }>(
        `INSERT INTO clubsa_tournaments (title, rules, prize_kind, prize_text, max_teams, starts_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [title, rules, prizeKind as PrizeKind, prizeKind === "free" ? prizeText : prizeText, maxTeams, startsAt, me],
      );
      res.status(201).json({ id: inserted.rows[0].id });
    },
    { admin: true },
  ),
);

async function entrantsOf(tournamentId: number) {
  const { rows } = await pool.query<{ club_id: string; president_id: string; club_name: string }>(
    "SELECT club_id, president_id, club_name FROM clubsa_tournament_entries WHERE tournament_id = $1",
    [tournamentId],
  );
  return rows;
}

router.post(
  "/tournaments/:id/start",
  guarded(
    async (req, res) => {
      const id = idParam(req);
      if (!id) return fail(res, 400, "invalid_id");
      const count = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM clubsa_tournament_entries WHERE tournament_id = $1", [id]);
      const exists = await pool.query("SELECT status FROM clubsa_tournaments WHERE id = $1", [id]);
      if (!exists.rows[0]) return fail(res, 404, "not_found");
      if (exists.rows[0].status !== "open") return fail(res, 409, "not_open");
      if ((count.rows[0]?.n ?? 0) < MIN_TEAMS_TO_START) return fail(res, 409, "not_enough_teams");
      // "حجز" ذري حتى لا تبدأ البطولة مرتين.
      const claimed = await pool.query("UPDATE clubsa_tournaments SET status = 'running' WHERE id = $1 AND status = 'open' RETURNING id", [id]);
      if (claimed.rows.length === 0) return fail(res, 409, "not_open");
      const entrants = await entrantsOf(id);
      const matches = buildBracket(entrants.map((e) => e.club_id));
      for (const m of matches) {
        await pool.query(
          "INSERT INTO clubsa_tournament_matches (tournament_id, round, slot, club_a, club_b) VALUES ($1, $2, $3, $4, $5)",
          [id, m.round, m.slot, m.clubA, m.clubB],
        );
      }
      // مباريات الباي: الفريق يتأهل مباشرة.
      for (const m of matches.filter((x) => x.round === 1 && x.clubA && !x.clubB)) {
        await advance(id, 1, m.slot, m.clubA as string, size(entrants.length));
        await pool.query("UPDATE clubsa_tournament_matches SET winner = $1 WHERE tournament_id = $2 AND round = 1 AND slot = $3", [m.clubA, id, m.slot]);
      }
      for (const e of entrants) {
        notify(e.president_id, { kind: "tournament_started", title: "بدأت البطولة وتم سحب القرعة", body: "افتح صفحة البطولات وشوف خصمك، وتواصل معه في الديسكورد.", target: "tournaments" });
      }
      res.json({ ok: true });
    },
    { admin: true },
  ),
);

function size(teams: number): number {
  return bracketSize(teams);
}

/** يضع الفائز في المباراة التالية، ويُعلم الرئيسين إذا اكتمل طرفا المباراة. */
async function advance(tournamentId: number, round: number, slot: number, winnerClub: string, bracket: number): Promise<void> {
  if (round >= totalRounds(bracket)) {
    await pool.query("UPDATE clubsa_tournaments SET status = 'finished', winner_club_id = $2 WHERE id = $1", [tournamentId, winnerClub]);
    const winner = await pool.query<{ president_id: string }>(
      "SELECT president_id FROM clubsa_tournament_entries WHERE tournament_id = $1 AND club_id = $2",
      [tournamentId, winnerClub],
    );
    if (winner.rows[0]) notify(winner.rows[0].president_id, { kind: "tournament_won", title: "مبروك! فزت بالبطولة 🏆", target: "tournaments" });
    return;
  }
  const next = nextPosition(slot);
  const column = next.side === "a" ? "club_a" : "club_b";
  const updated = await pool.query<{ club_a: string | null; club_b: string | null }>(
    `UPDATE clubsa_tournament_matches SET ${column} = $1 WHERE tournament_id = $2 AND round = $3 AND slot = $4 RETURNING club_a, club_b`,
    [winnerClub, tournamentId, round + 1, next.slot],
  );
  const row = updated.rows[0];
  if (row?.club_a && row?.club_b) {
    const presidents = await pool.query<{ president_id: string }>(
      "SELECT president_id FROM clubsa_tournament_entries WHERE tournament_id = $1 AND club_id = ANY($2)",
      [tournamentId, [row.club_a, row.club_b]],
    );
    for (const p of presidents.rows) {
      notify(p.president_id, { kind: "tournament_match", title: "مباراتك القادمة في البطولة جاهزة", body: "افتح صفحة البطولات وشوف خصمك.", target: "tournaments", dedupeKey: `tm:${tournamentId}` });
    }
  }
}

router.post(
  "/tournaments/:id/matches/:matchId/result",
  guarded(
    async (req, res) => {
      const id = idParam(req);
      const matchId = idParam(req, "matchId");
      if (!id || !matchId) return fail(res, 400, "invalid_id");
      const body = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
      const a = Number(body.scoreA);
      const b = Number(body.scoreB);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 99 || b > 99) return fail(res, 400, "invalid_score");
      if (a === b) return fail(res, 400, "draw_not_allowed");
      const t = await pool.query<{ status: string; max_teams: number }>("SELECT status, max_teams FROM clubsa_tournaments WHERE id = $1", [id]);
      if (!t.rows[0]) return fail(res, 404, "not_found");
      if (t.rows[0].status !== "running") return fail(res, 409, "not_running");
      // حجز ذري: النتيجة تُسجَّل مرة واحدة فقط ولمباراة مكتملة الطرفين.
      const claimed = await pool.query<{ round: number; slot: number; club_a: string; club_b: string }>(
        `UPDATE clubsa_tournament_matches
         SET score_a = $3, score_b = $4, winner = CASE WHEN $3 > $4 THEN club_a ELSE club_b END
         WHERE id = $1 AND tournament_id = $2 AND winner IS NULL AND club_a IS NOT NULL AND club_b IS NOT NULL
         RETURNING round, slot, club_a, club_b`,
        [matchId, id, a, b],
      );
      const m = claimed.rows[0];
      if (!m) return fail(res, 409, "match_not_ready");
      const winnerClub = a > b ? m.club_a : m.club_b;
      const total = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM clubsa_tournament_entries WHERE tournament_id = $1", [id]);
      await advance(id, m.round, m.slot, winnerClub, size(total.rows[0]?.n ?? t.rows[0].max_teams));
      const presidents = await pool.query<{ president_id: string; club_id: string }>(
        "SELECT president_id, club_id FROM clubsa_tournament_entries WHERE tournament_id = $1 AND club_id = ANY($2)",
        [id, [m.club_a, m.club_b]],
      );
      for (const p of presidents.rows) {
        notify(p.president_id, {
          kind: "tournament_result",
          title: p.club_id === winnerClub ? "فزت في مباراتك وتأهلت للجولة التالية" : "انتهت مباراتك في البطولة",
          body: `النتيجة ${a} - ${b}`,
          target: "tournaments",
        });
      }
      res.json({ ok: true });
    },
    { admin: true },
  ),
);

router.post(
  "/tournaments/:id/cancel",
  guarded(
    async (req, res) => {
      const id = idParam(req);
      if (!id) return fail(res, 400, "invalid_id");
      const updated = await pool.query(
        "UPDATE clubsa_tournaments SET status = 'cancelled' WHERE id = $1 AND status IN ('open', 'running') RETURNING id",
        [id],
      );
      if (updated.rows.length === 0) return fail(res, 409, "cannot_cancel");
      for (const e of await entrantsOf(id)) {
        notify(e.president_id, { kind: "tournament_cancelled", title: "تم إلغاء البطولة", target: "tournaments" });
      }
      res.json({ ok: true });
    },
    { admin: true },
  ),
);

/* ───────────── التسجيل (رئيس نادي + ديسكورد) ───────────── */

router.post(
  "/tournaments/:id/register",
  guarded(async (req, res, me) => {
    const id = idParam(req);
    if (!id) return fail(res, 400, "invalid_id");
    if (await activeSanction(me)) return fail(res, 403, "sanctioned");
    const status = await eligibility(me);
    if (!status.hasClub) return fail(res, 403, "no_club");
    if (!status.isPresident) return fail(res, 403, "not_president");
    if (!status.discordLinked) return fail(res, 403, "discord_required");
    const user = await pool.query<{ club_id: string }>("SELECT club_id FROM clubsa_social_users WHERE id = $1", [me]);
    const clubId = user.rows[0]?.club_id;
    if (!clubId) return fail(res, 403, "no_club");
    const t = await pool.query<{ status: string; max_teams: number }>("SELECT status, max_teams FROM clubsa_tournaments WHERE id = $1", [id]);
    if (!t.rows[0]) return fail(res, 404, "not_found");
    if (t.rows[0].status !== "open") return fail(res, 409, "registration_closed");
    const inserted = await pool.query(
      `INSERT INTO clubsa_tournament_entries (tournament_id, club_id, club_name, president_id, discord_name)
       SELECT $1, $2, $3, $4, $5
       WHERE (SELECT count(*) FROM clubsa_tournament_entries WHERE tournament_id = $1) < $6
         AND EXISTS (SELECT 1 FROM clubsa_tournaments WHERE id = $1 AND status = 'open')
       ON CONFLICT DO NOTHING RETURNING club_id`,
      [id, clubId, status.clubName ?? "نادي", me, status.discordName ?? "", t.rows[0].max_teams],
    );
    if (inserted.rows.length === 0) {
      const already = await pool.query("SELECT 1 FROM clubsa_tournament_entries WHERE tournament_id = $1 AND club_id = $2", [id, clubId]);
      return fail(res, 409, already.rows.length ? "already_registered" : "tournament_full");
    }
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  "/tournaments/:id/register",
  guarded(async (req, res, me) => {
    const id = idParam(req);
    if (!id) return fail(res, 400, "invalid_id");
    const result = await pool.query(
      `DELETE FROM clubsa_tournament_entries
       WHERE tournament_id = $1 AND president_id = $2
         AND EXISTS (SELECT 1 FROM clubsa_tournaments WHERE id = $1 AND status = 'open')`,
      [id, me],
    );
    if (!result.rowCount) return fail(res, 404, "not_found");
    res.json({ ok: true });
  }),
);

export default router;
