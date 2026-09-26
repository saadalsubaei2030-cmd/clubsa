import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubsTable } from "./clubs";
import { usersTable } from "./users";

export type SquadAssignmentRecord = { slotId: string; playerId: string | null };

export const clubSquadsTable = pgTable("clubsa_club_squads", {
  clubId: text("club_id").primaryKey().references(() => clubsTable.id, { onDelete: "cascade" }),
  formation: text("formation").$type<"4-3-3" | "4-2-3-1">().notNull().default("4-3-3"),
  assignments: jsonb("assignments").$type<SquadAssignmentRecord[]>().notNull().default([]),
  updatedBy: text("updated_by").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClubSquadSchema = createInsertSchema(clubSquadsTable).omit({ updatedAt: true });
export type InsertClubSquad = z.infer<typeof insertClubSquadSchema>;