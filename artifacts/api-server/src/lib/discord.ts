import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@workspace/db";

/** ربط حساب الموقع بحساب ديسكورد عبر OAuth الرسمي (نطلب scope=identify فقط). */

const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? "";
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || "https://clubsa-api.onrender.com").replace(/\/+$/, "");
export const SITE_URL = (process.env.SITE_URL || "https://clubsa-fc.com").replace(/\/+$/, "");
export const REDIRECT_URI = `${API_PUBLIC_URL}/api/discord/callback`;
const STATE_MINUTES = 10;

export function discordConfigured(): boolean {
  return CLIENT_ID !== "" && CLIENT_SECRET !== "";
}

let ready: Promise<void> | null = null;

export function ensureDiscord(): Promise<void> {
  ready ??= pool
    .query(
      `CREATE TABLE IF NOT EXISTS clubsa_discord_links (
        user_id text PRIMARY KEY,
        discord_id text NOT NULL UNIQUE,
        discord_name text NOT NULL,
        linked_at timestamptz NOT NULL DEFAULT now()
      );`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = null;
      throw error;
    });
  return ready;
}

function sign(payload: string): string {
  return createHmac("sha256", CLIENT_SECRET).update(payload).digest("hex");
}

/** state موقّع يربط الطلب بالمستخدم ويصلح 10 دقائق فقط. */
export function makeState(userId: string, now = Date.now()): string {
  const payload = `${userId}.${now + STATE_MINUTES * 60_000}`;
  return `${payload}.${sign(payload)}`;
}

export function readState(state: unknown, now = Date.now()): string | null {
  if (typeof state !== "string") return null;
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, mac] = parts;
  const expected = sign(`${userId}.${exp}`);
  const a = Buffer.from(mac, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(exp) || Number(exp) < now) return null;
  return userId;
}

export function authorizeUrl(userId: string): string {
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify",
    state: makeState(userId),
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${query.toString()}`;
}

export type DiscordIdentity = { id: string; name: string };

/** يستبدل الكود بهوية المستخدم. يرمي خطأ إذا فشل أي طلب. */
export async function exchangeCode(code: string): Promise<DiscordIdentity> {
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new Error(`discord_token_${tokenResponse.status}`);
  const token = (await tokenResponse.json()) as { access_token?: unknown };
  if (typeof token.access_token !== "string") throw new Error("discord_token_missing");
  const meResponse = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!meResponse.ok) throw new Error(`discord_me_${meResponse.status}`);
  const me = (await meResponse.json()) as { id?: unknown; username?: unknown; global_name?: unknown };
  if (typeof me.id !== "string" || !/^\d{5,25}$/.test(me.id)) throw new Error("discord_me_invalid");
  const name = String(typeof me.global_name === "string" && me.global_name ? me.global_name : me.username ?? "").slice(0, 60);
  return { id: me.id, name: name || "مستخدم ديسكورد" };
}

export async function getDiscordLink(userId: string): Promise<{ discordId: string; name: string } | null> {
  await ensureDiscord();
  const { rows } = await pool.query<{ discord_id: string; discord_name: string }>(
    "SELECT discord_id, discord_name FROM clubsa_discord_links WHERE user_id = $1",
    [userId],
  );
  return rows[0] ? { discordId: rows[0].discord_id, name: rows[0].discord_name } : null;
}
