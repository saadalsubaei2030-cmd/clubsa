import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type ProfileRole = "president" | "player";
export type JoinStatus = "approved" | "pending" | "rejected";

export const usersTable = pgTable(
  "clubsa_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    role: text("role").$type<ProfileRole>().notNull(),
    region: text("region").notNull(),
    eaId: text("ea_id").notNull(),
    isFreeAgent: boolean("is_free_agent").notNull().default(false),
    joinStatus: text("join_status").$type<JoinStatus>().notNull().default("approved"),
    clubId: text("club_id"),
    position: text("position"),
    overall: integer("overall").notNull().default(0),
    avatar: text("avatar"),
    playerBuild: jsonb("player_build").$type<Record<string, unknown> | null>(),
    walletBalance: integer("wallet_balance").notNull().default(100000),
    referralCode: text("referral_code").notNull(),
    referredByUserId: text("referred_by_user_id"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("clubsa_users_email_unique").on(table.email),
    uniqueIndex("clubsa_users_username_unique").on(table.username),
    uniqueIndex("clubsa_users_ea_id_unique").on(table.eaId),
    uniqueIndex("clubsa_users_referral_code_unique").on(table.referralCode),
    index("clubsa_users_club_idx").on(table.clubId, table.joinStatus),
    index("clubsa_users_referrer_idx").on(table.referredByUserId),
  ],
);

export type ClubsaUser = typeof usersTable.$inferSelect;
export type NewClubsaUser = typeof usersTable.$inferInsert;
export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;