// قواعد الدليل الاجتماعي (دوال خالصة بلا اعتماديات حتى يسهل اختبارها).
import { maskForbidden } from "./public-chat-rules";

export const ROLES = ["president", "player", "scout"] as const;
export type Role = (typeof ROLES)[number];

export const MAX_IMAGE_LENGTH = 200_000;
export const MAX_DM_TEXT = 1000;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const KEY_PATTERN = /^[a-f0-9]{32,64}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function isValidKey(value: unknown): value is string {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

/** نص اختياري: يُقصّ بدل أن يُرفض حتى لا تنكسر المزامنة بسبب حقل طويل. */
function optText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(CONTROL_CHARS, "").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function reqText(value: unknown, max: number): string | null {
  const text = optText(value, max);
  return text && text.length > 0 ? text : null;
}

function image(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("data:image/") && value.length <= MAX_IMAGE_LENGTH) return value;
  if (/^https:\/\/[^\s]{1,500}$/.test(value)) return value;
  return null;
}

function int(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? Math.trunc(value) : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && COLOR_PATTERN.test(value) ? value : fallback;
}

export type ParsedClub = {
  id: string;
  name: string;
  region: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  wins: number;
  draws: number;
  losses: number;
  trophies: number;
};

export type ParsedProfile = {
  name: string;
  username: string | null;
  role: Role;
  region: string;
  eaId: string | null;
  position: string | null;
  overall: number;
  avatar: string | null;
  clubId: string | null;
  clubName: string | null;
  isFreeAgent: boolean;
  club: ParsedClub | null;
};

export type ProfileParse =
  | { ok: true; value: ParsedProfile }
  | { ok: false; error: "invalid_name" | "invalid_role" };

export function parseProfileBody(body: unknown): ProfileParse {
  const src = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const rawName = reqText(src.name, 60);
  if (!rawName) return { ok: false, error: "invalid_name" };
  if (typeof src.role !== "string" || !(ROLES as readonly string[]).includes(src.role)) {
    return { ok: false, error: "invalid_role" };
  }
  const role = src.role as Role;

  let club: ParsedClub | null = null;
  const rawClub = src.club;
  // لا يُقبل نادٍ إلا من رئيس نادٍ، ويصبح هو رئيسه (يُحدد في المسار من هوية الطلب).
  if (role === "president" && typeof rawClub === "object" && rawClub !== null) {
    const c = rawClub as Record<string, unknown>;
    const id = isValidId(c.id) ? c.id : null;
    const name = reqText(c.name, 60);
    if (id && name) {
      club = {
        id,
        name: maskForbidden(name),
        region: optText(c.region, 80) ?? "",
        logo: image(c.logo),
        primaryColor: color(c.primaryColor, "#2563eb"),
        secondaryColor: color(c.secondaryColor, "#ffffff"),
        wins: int(c.wins, 0, 100000),
        draws: int(c.draws, 0, 100000),
        losses: int(c.losses, 0, 100000),
        trophies: int(c.trophies, 0, 100000),
      };
    }
  }

  const clubId = isValidId(src.clubId) ? src.clubId : null;
  return {
    ok: true,
    value: {
      name: maskForbidden(rawName),
      username: optText(src.username, 24),
      role,
      region: optText(src.region, 80) ?? "",
      eaId: optText(src.eaId, 32),
      position: optText(src.position, 30),
      overall: int(src.overall, 0, 99),
      avatar: image(src.avatar),
      clubId,
      clubName: clubId ? maskForbidden(optText(src.clubName, 60) ?? "") || null : null,
      isFreeAgent: src.isFreeAgent === true,
      club,
    },
  };
}

export type DmParse = { ok: true; text: string } | { ok: false; error: "invalid_text" };

export function parseDirectMessage(body: unknown): DmParse {
  const src = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof src.text !== "string") return { ok: false, error: "invalid_text" };
  const cleaned = src.text.replace(CONTROL_CHARS, "").trim();
  if (cleaned.length === 0 || cleaned.length > MAX_DM_TEXT) return { ok: false, error: "invalid_text" };
  return { ok: true, text: maskForbidden(cleaned) };
}

/** يهرّب محارف LIKE حتى لا يتحول البحث إلى نمط عشوائي. */
export function escapeLike(query: string): string {
  return query.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export type Relationship = "self" | "none" | "outgoing" | "incoming" | "friends";

export function relationshipOf(
  me: string,
  other: string,
  link: { requesterId: string; addresseeId: string; status: string } | null,
): Relationship {
  if (me === other) return "self";
  if (!link) return "none";
  if (link.status === "accepted") return "friends";
  return link.requesterId === me ? "outgoing" : "incoming";
}
