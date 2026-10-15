export type PostKind = "seeking_club" | "seeking_player";

export const POSITION_IDS = ["GK", "CB", "FB", "CDM", "CM", "CAM", "WG", "ST"] as const;
export const PLATFORM_IDS = ["PS", "XBOX", "PC"] as const;

export const MAX_BODY_LENGTH = 400;

export type PostInput = {
  kind: PostKind;
  position: string;
  platform: string;
  minOverall: number;
  body: string;
};

/** يتحقق من مدخلات المنشور ويرجع null إذا كانت غير صالحة. */
export function parsePostInput(raw: unknown): PostInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  const kind = data.kind;
  if (kind !== "seeking_club" && kind !== "seeking_player") return null;

  const position = data.position;
  if (typeof position !== "string") return null;
  if (position !== "ANY" && !(POSITION_IDS as readonly string[]).includes(position)) return null;

  const platform = data.platform;
  if (typeof platform !== "string") return null;
  if (platform !== "ANY" && !(PLATFORM_IDS as readonly string[]).includes(platform)) return null;

  const minOverallRaw = data.minOverall ?? 0;
  if (typeof minOverallRaw !== "number" || !Number.isInteger(minOverallRaw)) return null;
  if (minOverallRaw < 0 || minOverallRaw > 99) return null;

  const body = typeof data.body === "string" ? data.body.trim() : "";
  if (body.length > MAX_BODY_LENGTH) return null;

  return { kind, position, platform, minOverall: minOverallRaw, body };
}
