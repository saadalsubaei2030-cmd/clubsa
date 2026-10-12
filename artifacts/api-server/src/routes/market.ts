import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { createRateLimiter } from "../lib/public-chat-rules";
import {
  CLUB_START_BUDGET,
  PLAYER_START_BALANCE,
  parsePrice,
  splitSale,
} from "../lib/market-rules";
import { authenticate, ensureTables } from "./social";

const router: IRouter = Router();

const listLimit = createRateLimiter({ windowMs: 60_000, max: 90 });
const writeLimit = createRateLimiter({ windowMs: 60_000, max: 30 });

let listingsReady: Promise<void> | null = null;

function ensureListings(): Promise<void> {
  listingsReady ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_market_listings (
        id serial PRIMARY KEY,
        player_id text NOT NULL,
        price bigint NOT NULL,
        status text NOT NULL DEFAULT 'open',
        buyer_club_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        sold_at timestamptz
      );
      CREATE UNIQUE INDEX IF NOT EXISTS clubsa_market_listings_one_open
        ON clubsa_market_listings (player_id) WHERE status = 'open';
      CREATE TABLE IF NOT EXISTS clubsa_market_transfers (
        id serial PRIMARY KEY,
        listing_id integer NOT NULL,
        player_id text NOT NULL,
        from_club_id text,
        to_club_id text NOT NULL,
        price bigint NOT NULL,
        player_share bigint NOT NULL,
        club_share bigint NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      listingsReady = null;
      throw error;
    });
  return listingsReady;
}

function route(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await ensureTables();
      await ensureListings();
      res.setHeader("Cache-Control", "no-store");
      await handler(req, res);
    } catch (error) {
      req.log?.error({ err: error }, "market route failed");
      if (!res.headersSent) res.status(500).json({ error: "server_error" });
    }
  };
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function idParam(req: Request): number | null {
  const raw = req.params.id;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(n) && n > 0 && n < 2_000_000_000 ? n : null;
}

type Me = { id: string; role: string; club_id: string | null; club_name: string | null };

async function loadMe(id: string): Promise<Me | null> {
  const { rows } = await pool.query<Me>(
    "SELECT id, role, club_id, club_name FROM clubsa_social_users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/** ينشئ المحفظة (برصيد البداية) إن لم تكن موجودة. */
async function ensureWallet(kind: "user" | "club", ownerId: string, start: number): Promise<void> {
  await pool.query(
    `INSERT INTO clubsa_market_wallets (kind, owner_id, balance) VALUES ($1, $2, $3)
     ON CONFLICT (kind, owner_id) DO NOTHING`,
    [kind, ownerId, start],
  );
}

/* ───────────── محفظتي ───────────── */

router.get(
  "/market/me",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    const me = await loadMe(id);
    if (!me) return fail(res, 401, "unauthorized");

    let balance: number | null = null;
    let assignment: { clubId: string; clubName: string; logo: string | null; primaryColor: string; secondaryColor: string; presidentId: string } | null = null;

    if (me.role === "player") {
      await ensureWallet("user", id, PLAYER_START_BALANCE);
      const { rows } = await pool.query<{ balance: string; assignment_pending: boolean; assigned_club_id: string | null }>(
        "SELECT balance::text, assignment_pending, assigned_club_id FROM clubsa_market_wallets WHERE kind = 'user' AND owner_id = $1",
        [id],
      );
      balance = Number(rows[0]?.balance ?? 0);
      if (rows[0]?.assignment_pending && rows[0].assigned_club_id) {
        const club = await pool.query<{ id: string; name: string; logo: string | null; primary_color: string; secondary_color: string; president_id: string }>(
          "SELECT id, name, logo, primary_color, secondary_color, president_id FROM clubsa_social_clubs WHERE id = $1",
          [rows[0].assigned_club_id],
        );
        const c = club.rows[0];
        if (c) {
          assignment = { clubId: c.id, clubName: c.name, logo: c.logo, primaryColor: c.primary_color, secondaryColor: c.secondary_color, presidentId: c.president_id };
        }
      }
    }

    let club: { id: string; budget: number } | null = null;
    if (me.role === "president") {
      const owned = await pool.query<{ id: string }>(
        "SELECT id FROM clubsa_social_clubs WHERE president_id = $1 LIMIT 1",
        [id],
      );
      if (owned.rows[0]) {
        await ensureWallet("club", owned.rows[0].id, CLUB_START_BUDGET);
        const w = await pool.query<{ balance: string }>(
          "SELECT balance::text FROM clubsa_market_wallets WHERE kind = 'club' AND owner_id = $1",
          [owned.rows[0].id],
        );
        club = { id: owned.rows[0].id, budget: Number(w.rows[0]?.balance ?? 0) };
      }
    }

    res.json({ balance, club, assignment });
  }),
);

router.post(
  "/market/ack",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    await pool.query(
      "UPDATE clubsa_market_wallets SET assignment_pending = false WHERE kind = 'user' AND owner_id = $1",
      [id],
    );
    res.json({ ok: true });
  }),
);

/* ───────────── الإعلانات ───────────── */

router.get(
  "/market/listings",
  route(async (req, res) => {
    if (!listLimit.allow(clientKey(req))) return fail(res, 429, "rate_limited");
    const { rows } = await pool.query(
      `SELECT l.id, l.price::text AS price, l.created_at, u.id AS player_id, u.name, u.position, u.overall,
              u.avatar, u.club_id, u.club_name
       FROM clubsa_market_listings l
       JOIN clubsa_social_users u ON u.id = l.player_id
       WHERE l.status = 'open'
       ORDER BY l.id DESC LIMIT 100`,
    );
    res.json({
      listings: rows.map((r) => ({
        id: r.id,
        price: Number(r.price),
        createdAt: r.created_at,
        player: {
          id: r.player_id,
          name: r.name,
          position: r.position,
          overall: r.overall,
          avatar: r.avatar,
          clubId: r.club_id,
          clubName: r.club_name,
        },
      })),
    });
  }),
);

router.post(
  "/market/listings",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(id)) return fail(res, 429, "rate_limited");
    const me = await loadMe(id);
    if (!me || me.role !== "player") return fail(res, 403, "players_only");
    const price = parsePrice((req.body as { price?: unknown } | undefined)?.price);
    if (price === null) return fail(res, 400, "invalid_price");
    try {
      const { rows } = await pool.query<{ id: number }>(
        "INSERT INTO clubsa_market_listings (player_id, price) VALUES ($1, $2) RETURNING id",
        [id, price],
      );
      res.status(201).json({ id: rows[0].id });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return fail(res, 409, "already_listed");
      throw error;
    }
  }),
);

router.delete(
  "/market/listings/mine",
  route(async (req, res) => {
    const id = await authenticate(req);
    if (!id) return fail(res, 401, "unauthorized");
    await pool.query(
      "UPDATE clubsa_market_listings SET status = 'cancelled' WHERE player_id = $1 AND status = 'open'",
      [id],
    );
    res.json({ ok: true });
  }),
);

/* ───────────── الشراء (ضمّ اللاعب بالسعر المعروض) ───────────── */

router.post(
  "/market/listings/:id/buy",
  route(async (req, res) => {
    const me = await authenticate(req);
    if (!me) return fail(res, 401, "unauthorized");
    if (!writeLimit.allow(me)) return fail(res, 429, "rate_limited");
    const listingId = idParam(req);
    if (listingId === null) return fail(res, 400, "invalid_id");

    const buyer = await loadMe(me);
    if (!buyer || buyer.role !== "president") return fail(res, 403, "presidents_only");
    const clubRes = await pool.query<{ id: string; name: string }>(
      "SELECT id, name FROM clubsa_social_clubs WHERE president_id = $1 LIMIT 1",
      [me],
    );
    const club = clubRes.rows[0];
    if (!club) return fail(res, 400, "no_club");
    await ensureWallet("club", club.id, CLUB_START_BUDGET);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const listing = await client.query<{ player_id: string; price: string }>(
        "SELECT player_id, price::text FROM clubsa_market_listings WHERE id = $1 AND status = 'open' FOR UPDATE",
        [listingId],
      );
      if (!listing.rows[0]) {
        await client.query("ROLLBACK");
        return fail(res, 409, "unavailable");
      }
      const playerId = listing.rows[0].player_id;
      const price = Number(listing.rows[0].price);

      const player = await client.query<{ club_id: string | null }>(
        "SELECT club_id FROM clubsa_social_users WHERE id = $1 FOR UPDATE",
        [playerId],
      );
      if (!player.rows[0]) {
        await client.query("ROLLBACK");
        return fail(res, 409, "unavailable");
      }
      const previousClub = player.rows[0].club_id;
      if (previousClub === club.id) {
        await client.query("ROLLBACK");
        return fail(res, 400, "same_club");
      }

      // محفظة اللاعب والنادي السابق: تُنشأ إن لم توجد، ثم تُقفل كلها بترتيب ثابت لمنع التشابك.
      await client.query(
        `INSERT INTO clubsa_market_wallets (kind, owner_id, balance) VALUES ('user', $1, $2)
         ON CONFLICT (kind, owner_id) DO NOTHING`,
        [playerId, PLAYER_START_BALANCE],
      );
      let hasPreviousClub = false;
      if (previousClub) {
        const exists = await client.query("SELECT 1 FROM clubsa_social_clubs WHERE id = $1", [previousClub]);
        hasPreviousClub = exists.rows.length > 0;
        if (hasPreviousClub) {
          await client.query(
            `INSERT INTO clubsa_market_wallets (kind, owner_id, balance) VALUES ('club', $1, $2)
             ON CONFLICT (kind, owner_id) DO NOTHING`,
            [previousClub, CLUB_START_BUDGET],
          );
        }
      }
      const lockIds = [club.id, ...(hasPreviousClub && previousClub ? [previousClub] : [])];
      const locked = await client.query<{ kind: string; owner_id: string; balance: string }>(
        `SELECT kind, owner_id, balance::text FROM clubsa_market_wallets
         WHERE (kind = 'user' AND owner_id = $1) OR (kind = 'club' AND owner_id = ANY($2::text[]))
         ORDER BY kind, owner_id FOR UPDATE`,
        [playerId, lockIds],
      );
      const buyerWallet = locked.rows.find((w) => w.kind === "club" && w.owner_id === club.id);
      if (!buyerWallet || Number(buyerWallet.balance) < price) {
        await client.query("ROLLBACK");
        return fail(res, 402, "insufficient_funds");
      }

      const split = splitSale(price, hasPreviousClub);

      await client.query(
        "UPDATE clubsa_market_wallets SET balance = balance - $1, updated_at = now() WHERE kind = 'club' AND owner_id = $2",
        [price, club.id],
      );
      await client.query(
        `UPDATE clubsa_market_wallets
         SET balance = balance + $1, assignment_pending = true, assigned_club_id = $3, updated_at = now()
         WHERE kind = 'user' AND owner_id = $2`,
        [split.playerShare, playerId, club.id],
      );
      if (hasPreviousClub && previousClub && split.clubShare > 0) {
        await client.query(
          "UPDATE clubsa_market_wallets SET balance = balance + $1, updated_at = now() WHERE kind = 'club' AND owner_id = $2",
          [split.clubShare, previousClub],
        );
      }
      await client.query(
        "UPDATE clubsa_social_users SET club_id = $1, club_name = $2, is_free_agent = false, updated_at = now() WHERE id = $3",
        [club.id, club.name, playerId],
      );
      await client.query(
        "UPDATE clubsa_market_listings SET status = 'sold', buyer_club_id = $1, sold_at = now() WHERE id = $2",
        [club.id, listingId],
      );
      await client.query(
        `INSERT INTO clubsa_market_transfers (listing_id, player_id, from_club_id, to_club_id, price, player_share, club_share)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [listingId, playerId, hasPreviousClub ? previousClub : null, club.id, price, split.playerShare, split.clubShare],
      );

      await client.query("COMMIT");
      res.json({ ok: true, price, playerShare: split.playerShare, clubShare: split.clubShare, newBudget: Number(buyerWallet.balance) - price });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

export default router;
