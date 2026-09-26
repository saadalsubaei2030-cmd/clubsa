import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubsTable } from "./clubs";
import { usersTable } from "./users";

export const clubInvitationsTable = pgTable(
  "clubsa_club_invitations",
  {
    id: text("id").primaryKey(),
    clubId: text("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
    toUsername: text("to_username"),
    tokenHash: text("token_hash").unique(),
    status: text("status").$type<"pending" | "accepted" | "declined">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("clubsa_invites_user_status_idx").on(table.toUserId, table.status),
    index("clubsa_invites_club_status_idx").on(table.clubId, table.status),
  ],
);

export const insertClubInvitationSchema = createInsertSchema(clubInvitationsTable).omit({ createdAt: true });
export type InsertClubInvitation = z.infer<typeof insertClubInvitationSchema>;