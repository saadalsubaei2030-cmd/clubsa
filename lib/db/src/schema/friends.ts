import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export type FriendshipStatus = "pending" | "accepted";

export const friendsTable = pgTable(
  "clubsa_friends",
  {
    userAId: text("user_a_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userBId: text("user_b_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    status: text("status").$type<FriendshipStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userAId, table.userBId] }),
    index("clubsa_friends_user_a_status_idx").on(table.userAId, table.status),
    index("clubsa_friends_user_b_status_idx").on(table.userBId, table.status),
  ],
);

export const insertFriendshipSchema = createInsertSchema(friendsTable);
export type Friendship = typeof friendsTable.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;