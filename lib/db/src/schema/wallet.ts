import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const walletTransactionsTable = pgTable(
  "clubsa_wallet_transactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").$type<"referral_bonus">().notNull(),
    amount: integer("amount").notNull(),
    referenceUserId: text("reference_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("clubsa_wallet_referral_once_idx").on(table.userId, table.type, table.referenceUserId),
    index("clubsa_wallet_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({ id: true, createdAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;