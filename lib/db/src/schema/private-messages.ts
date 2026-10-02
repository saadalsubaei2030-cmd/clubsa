import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const privateMessagesTable = pgTable(
  "clubsa_private_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: text("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("clubsa_private_messages_sender_receiver_created_idx").on(
      table.senderId,
      table.receiverId,
      table.createdAt,
    ),
    index("clubsa_private_messages_receiver_sender_created_idx").on(
      table.receiverId,
      table.senderId,
      table.createdAt,
    ),
  ],
);

export const insertPrivateMessageSchema = createInsertSchema(
  privateMessagesTable,
).omit({ id: true, createdAt: true });
export type PrivateMessage = typeof privateMessagesTable.$inferSelect;
export type InsertPrivateMessage = z.infer<typeof insertPrivateMessageSchema>;