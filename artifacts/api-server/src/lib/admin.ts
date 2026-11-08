import { pool } from "@workspace/db";

// مشرفو الموقع: إيميلات حساباتهم في متغير البيئة ADMIN_EMAILS (مفصولة بفاصلة) على Render.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export async function isAdmin(userId: string): Promise<boolean> {
  if (ADMIN_EMAILS.size === 0) return false;
  const { rows } = await pool.query<{ email: string }>("SELECT email FROM clubsa_accounts WHERE user_id = $1", [userId]);
  return rows.some((row) => ADMIN_EMAILS.has(row.email.toLowerCase()));
}

export async function adminUserIds(): Promise<string[]> {
  if (ADMIN_EMAILS.size === 0) return [];
  const { rows } = await pool.query<{ user_id: string }>("SELECT user_id FROM clubsa_accounts WHERE lower(email) = ANY($1)", [[...ADMIN_EMAILS]]);
  return rows.map((row) => row.user_id);
}
