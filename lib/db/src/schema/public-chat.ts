import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// رسائل الدردشة العامة المشتركة بين كل الزوار.
// يُنشأ الجدول أيضًا تلقائيًا عند أول طلب (CREATE TABLE IF NOT EXISTS) في مسار الخادم،
// والتعريف هنا مطابق له حتى لا يتعارض مع drizzle-kit push لاحقًا.
export const publicChatTable = pgTable("clubsa_public_chat", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  senderName: text("sender_name").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PublicChatRow = typeof publicChatTable.$inferSelect;
