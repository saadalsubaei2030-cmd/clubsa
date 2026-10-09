import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// دليل اللاعبين والأندية المشترك (يُزامَن من ملفات المتصفح) + الصداقات + الرسائل الخاصة.
// تُنشأ هذه الجداول أيضًا تلقائيًا عند أول طلب (CREATE TABLE IF NOT EXISTS) في مسار الخادم،
// والتعريفات هنا مطابقة لها حتى لا يحذفها drizzle-kit push.

export const socialUsersTable = pgTable("clubsa_social_users", {
  id: text("id").primaryKey(),
  keyHash: text("key_hash").notNull(),
  name: text("name").notNull(),
  username: text("username"),
  role: text("role").notNull(),
  region: text("region").notNull().default(""),
  eaId: text("ea_id"),
  position: text("position"),
  overall: integer("overall").notNull().default(0),
  avatar: text("avatar"),
  clubId: text("club_id"),
  clubName: text("club_name"),
  isFreeAgent: boolean("is_free_agent").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialClubsTable = pgTable("clubsa_social_clubs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull().default(""),
  logo: text("logo"),
  presidentId: text("president_id").notNull(),
  primaryColor: text("primary_color").notNull().default("#2563eb"),
  secondaryColor: text("secondary_color").notNull().default("#ffffff"),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  trophies: integer("trophies").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const socialFriendsTable = pgTable(
  "clubsa_social_friends",
  {
    id: serial("id").primaryKey(),
    requesterId: text("requester_id").notNull(),
    addresseeId: text("addressee_id").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("clubsa_social_friends_pair_unique").on(table.requesterId, table.addresseeId)],
);

export const socialMessagesTable = pgTable(
  "clubsa_social_messages",
  {
    id: serial("id").primaryKey(),
    senderId: text("sender_id").notNull(),
    receiverId: text("receiver_id").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("clubsa_social_messages_receiver_idx").on(table.receiverId, table.id),
    index("clubsa_social_messages_sender_idx").on(table.senderId, table.id),
  ],
);
