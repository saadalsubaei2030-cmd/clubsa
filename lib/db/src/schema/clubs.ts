import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const clubsTable = pgTable("clubsa_clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  managerId: text("manager_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  region: text("region").notNull(),
  logo: text("logo"),
  primaryColor: text("primary_color").notNull().default("#1e40af"),
  secondaryColor: text("secondary_color").notNull().default("#f5f5f5"),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  trophies: integer("trophies").notNull().default(0),
  budget: integer("budget").notNull().default(10000000),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clubMembersTable = pgTable(
  "clubsa_club_members",
  {
    clubId: text("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    role: text("role").$type<"player" | "manager" | "admin">().notNull().default("player"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.clubId, table.userId] })],
);

export const insertClubSchema = createInsertSchema(clubsTable).omit({ createdAt: true });
export type InsertClub = z.infer<typeof insertClubSchema>;
export const insertClubMemberSchema = createInsertSchema(clubMembersTable).omit({ createdAt: true });
export type InsertClubMember = z.infer<typeof insertClubMemberSchema>;