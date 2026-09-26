import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubsTable } from "./clubs";
import { usersTable } from "./users";

export const marketListingsTable = pgTable(
  "clubsa_market_listings",
  {
    id: serial("id").primaryKey(),
    playerId: text("player_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    clubId: text("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
    position: text("position").notNull().default(""),
    overall: integer("overall").notNull().default(0),
    price: integer("price").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("clubsa_market_status_created_idx").on(table.status, table.createdAt),
    index("clubsa_market_player_idx").on(table.playerId),
  ],
);

export const insertMarketListingSchema = createInsertSchema(marketListingsTable).omit({ id: true, createdAt: true });
export type InsertMarketListing = z.infer<typeof insertMarketListingSchema>;