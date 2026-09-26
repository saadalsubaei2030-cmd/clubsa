import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, usersTable, clubsTable, clubMembersTable, clubInvitationsTable, clubSquadsTable, walletTransactionsTable, marketListingsTable } from "@workspace/db";
import {
  GetMyProfileResponse, CreateMyProfileBody, CreateMyProfileResponse, UpdateMyProfileBody, UpdateMyProfileResponse,
  GetPublicPlayerProfileParams, GetPublicPlayerProfileResponse, SearchPlayersQueryParams, SearchPlayersResponse,
  GetMyInvitationsResponse, CreateClubInvitationParams, CreateClubInvitationBody, CreateClubInvitationResponse,
  RespondToInvitationParams, RespondToInvitationBody, RespondToInvitationResponse,
  AcceptClubInvitationLinkBody, AcceptClubInvitationLinkResponse, GetClubRosterParams, GetClubRosterResponse,
  GetClubSquadParams, GetClubSquadResponse, SaveClubSquadParams, SaveClubSquadBody, SaveClubSquadResponse,
  GetReferralDashboardResponse, ClaimReferralRewardResponse, GetMarketListingsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const REWARD = 10_000;
const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
type AuthRequest = Request & { userId?: string };
type ClerkUser = { primaryEmailAddress?: { emailAddress: string } | null; emailAddresses?: Array<{ emailAddress: string }> };

function uid(): string { return randomUUID(); }
function hash(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function normalizeUsername(value: string): string { return value.trim().toLowerCase(); }
function emailInfo(user: ClerkUser): { email: string; verified: boolean } {
  const primary = user.primaryEmailAddress ?? user.emailAddresses?.[0];
  return { email: primary?.emailAddress ?? "", verified: true };
}
async function clerkUser(id: string): Promise<ClerkUser> {
  return (await clerkClient.users.getUser(id)) as unknown as ClerkUser;
}
async function identity(req: Request): Promise<{ id: string; email: string; verified: boolean } | null> {
  const id = getAuth(req).userId;
  if (!id) return null;
  const info = emailInfo(await clerkUser(id));
  return { id, ...info };
}
function requireAuth(verified = false) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const current = await identity(req);
    if (!current) { res.status(401).json({ error: "Sign in required" }); return; }
    req.userId = current.id;
    next();
  };
}
function param(value: string | string[]): string { return Array.isArray(value) ? value[0] : value; }
function error(res: Response, status: number, message: string): void { res.status(status).json({ error: message }); }

async function profileRow(id: string) {
  const [row] = await db.select({
    user: usersTable,
    clubName: clubsTable.name,
    clubLogo: clubsTable.logo,
  }).from(usersTable).leftJoin(clubsTable, eq(usersTable.clubId, clubsTable.id)).where(eq(usersTable.id, id)).limit(1);
  return row;
}
async function profileOutput(id: string, verified: boolean) {
  const row = await profileRow(id);
  if (!row) return null;
  const u = row.user;
  return {
    id: u.id, username: u.username, name: u.name, email: u.email, emailVerified: verified,
    role: u.role, region: u.region, eaId: u.eaId, isFreeAgent: u.isFreeAgent,
    joinStatus: u.joinStatus, clubId: u.clubId, clubName: row.clubName ?? null, clubLogo: row.clubLogo ?? null,
    position: u.position, overall: u.overall, avatar: u.avatar, walletBalance: u.walletBalance,
    referralCode: u.referralCode, playerBuild: u.playerBuild,
  };
}
async function managerFor(clubId: string, userId: string): Promise<boolean> {
  const [membership] = await db.select({ role: clubMembersTable.role }).from(clubMembersTable)
    .where(and(eq(clubMembersTable.clubId, clubId), eq(clubMembersTable.userId, userId))).limit(1);
  return membership?.role === "manager" || membership?.role === "admin";
}
async function approvedMember(clubId: string, userId: string): Promise<boolean> {
  const [row] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(and(eq(usersTable.id, userId), eq(usersTable.clubId, clubId), eq(usersTable.joinStatus, "approved"))).limit(1);
  return Boolean(row);
}
function rosterOutput(row: { user: typeof usersTable.$inferSelect; clubName: string | null }) {
  return {
    id: row.user.id, username: row.user.username, name: row.user.name, eaId: row.user.eaId,
    region: row.user.region, clubId: row.user.clubId, clubName: row.clubName, position: row.user.position,
    overall: row.user.overall, avatar: row.user.avatar,
  };
}

router.get("/me", requireAuth(), async (req, res): Promise<void> => {
  const current = await identity(req);
  if (!current) { error(res, 401, "Sign in required"); return; }
  const profile = await profileOutput(current.id, current.verified);
  res.json(GetMyProfileResponse.parse({ email: current.email, emailVerified: current.verified, profile }));
});

router.post("/me", requireAuth(), async (req, res): Promise<void> => {
  const current = await identity(req);
  if (!current) { error(res, 401, "Sign in required"); return; }
  const parsed = CreateMyProfileBody.safeParse(req.body);
  if (!parsed.success) { error(res, 400, parsed.error.message); return; }
  const data = parsed.data;
  const username = normalizeUsername(data.username);
  const referralCode = randomBytes(9).toString("base64url");
  try {
    const profile = await db.transaction(async (tx) => {
      const existing = await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, current.id)).limit(1);
      if (existing.length) throw new Error("PROFILE_EXISTS");
      const [referrer] = data.referralCode ? await tx.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, data.referralCode)).limit(1) : [];
      let clubId: string | null = null;
      let joinStatus: "approved" | "pending" = data.role === "president" || data.isFreeAgent ? "approved" : "pending";
      if (data.role === "player" && data.clubName && !data.isFreeAgent) {
        const [club] = await tx.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.name, data.clubName.trim())).limit(1);
        if (!club) throw new Error("CLUB_NOT_FOUND");
        clubId = club.id;
      }
      const [created] = await tx.insert(usersTable).values({
        id: current.id, email: current.email, username, name: data.name.trim(), role: data.role,
        region: data.region.trim(), eaId: data.eaId.trim(), isFreeAgent: data.isFreeAgent,
        joinStatus, clubId, referralCode, referredByUserId: referrer?.id ?? null, emailVerifiedAt: new Date(),
      }).returning();
      if (data.role === "president") {
        if (!data.clubName?.trim()) throw new Error("CLUB_NAME_REQUIRED");
        const [club] = await tx.insert(clubsTable).values({ id: uid(), name: data.clubName.trim(), managerId: current.id, region: data.region.trim() }).returning();
        clubId = club.id;
        await tx.update(usersTable).set({ clubId, joinStatus: "approved", isFreeAgent: false }).where(eq(usersTable.id, current.id));
        await tx.insert(clubMembersTable).values({ clubId, userId: current.id, role: "manager" });
      } else if (clubId) {
        await tx.insert(clubMembersTable).values({ clubId, userId: current.id, role: "player" });
      }
      if (referrer && referrer.id !== current.id) {
        await tx.insert(walletTransactionsTable).values({
          userId: referrer.id,
          type: "referral_bonus",
          amount: REWARD,
          referenceUserId: current.id,
        }).onConflictDoNothing();
        await tx.update(usersTable)
          .set({ walletBalance: sql`${usersTable.walletBalance} + ${REWARD}` })
          .where(eq(usersTable.id, referrer.id));
      }
      return created;
    });
    const output = await profileOutput(profile.id, current.verified);
    res.status(201).json(CreateMyProfileResponse.parse(output));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "PROFILE_EXISTS") { error(res, 409, "Profile already exists"); return; }
    if (message === "CLUB_NOT_FOUND") { error(res, 400, "Club not found"); return; }
    if (message === "CLUB_NAME_REQUIRED") { error(res, 400, "Club name is required"); return; }
    if (message.includes("unique")) { error(res, 409, "Username or EA ID already taken"); return; }
    throw cause;
  }
});

router.patch("/me/profile", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!current) { error(res, 401, "Sign in required"); return; }
  if (!parsed.success) { error(res, 400, parsed.error.message); return; }
  try {
    const [updated] = await db.update(usersTable).set({
      eaId: parsed.data.eaId.trim(), ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.region ? { region: parsed.data.region.trim() } : {}),
    }).where(eq(usersTable.id, current.id)).returning();
    if (!updated) { error(res, 404, "Profile not found"); return; }
    res.json(UpdateMyProfileResponse.parse(await profileOutput(current.id, current.verified)));
  } catch (cause) {
    if (cause instanceof Error && cause.message.includes("unique")) { error(res, 409, "EA ID already taken"); return; }
    throw cause;
  }
});

router.get("/profiles/:username", async (req, res): Promise<void> => {
  const parsed = GetPublicPlayerProfileParams.safeParse(req.params);
  if (!parsed.success) { error(res, 400, parsed.error.message); return; }
  const [row] = await db.select({ user: usersTable, clubName: clubsTable.name }).from(usersTable)
    .leftJoin(clubsTable, eq(usersTable.clubId, clubsTable.id)).where(eq(usersTable.username, normalizeUsername(parsed.data.username))).limit(1);
  if (!row) { error(res, 404, "Player not found"); return; }
  res.json(GetPublicPlayerProfileResponse.parse({
    id: row.user.id, username: row.user.username, name: row.user.name, region: row.user.region, eaId: row.user.eaId,
    role: row.user.role, clubId: row.user.clubId, clubName: row.clubName ?? null, position: row.user.position,
    overall: row.user.overall, avatar: row.user.avatar,
  }));
});

router.get("/players/search", requireAuth(true), async (req, res): Promise<void> => {
  const parsed = SearchPlayersQueryParams.safeParse(req.query);
  if (!parsed.success) { error(res, 400, parsed.error.message); return; }
  const rows = await db.select({ user: usersTable, clubName: clubsTable.name }).from(usersTable)
    .leftJoin(clubsTable, eq(usersTable.clubId, clubsTable.id))
    .where(ilike(usersTable.username, `%${parsed.data.q.trim()}%`)).limit(25);
  res.json(SearchPlayersResponse.parse(rows.map(rosterOutput)));
});

router.get("/me/invitations", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  if (!current) { error(res, 401, "Sign in required"); return; }
  const rows = await db.select({ invite: clubInvitationsTable, clubName: clubsTable.name, clubLogo: clubsTable.logo, fromName: usersTable.name })
    .from(clubInvitationsTable).innerJoin(clubsTable, eq(clubInvitationsTable.clubId, clubsTable.id))
    .innerJoin(usersTable, eq(clubInvitationsTable.fromUserId, usersTable.id))
    .where(and(eq(clubInvitationsTable.toUserId, current.id), eq(clubInvitationsTable.status, "pending")));
  res.json(GetMyInvitationsResponse.parse(rows.map((r) => ({
    id: r.invite.id, clubId: r.invite.clubId, clubName: r.clubName, clubLogo: r.clubLogo,
    fromUserId: r.invite.fromUserId, fromUserName: r.fromName, status: r.invite.status, createdAt: r.invite.createdAt,
  }))));
});

router.post("/clubs/:clubId/invitations", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  const params = CreateClubInvitationParams.safeParse(req.params);
  const body = CreateClubInvitationBody.safeParse(req.body);
  if (!current) { error(res, 401, "Sign in required"); return; }
  if (!params.success || !body.success) { error(res, 400, "Invalid invitation"); return; }
  if (!(await managerFor(params.data.clubId, current.id))) { error(res, 403, "Club manager access required"); return; }
  const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, params.data.clubId)).limit(1);
  if (!club) { error(res, 404, "Club not found"); return; }
  let targetId: string | null = null;
  if (body.data.mode === "username") {
    if (!body.data.username) { error(res, 400, "Username is required"); return; }
    const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, normalizeUsername(body.data.username))).limit(1);
    if (!target) { error(res, 404, "Player not found"); return; }
    targetId = target.id;
  }
  const existing = await db.select().from(clubInvitationsTable).where(and(eq(clubInvitationsTable.clubId, club.id), targetId ? eq(clubInvitationsTable.toUserId, targetId) : sql`${clubInvitationsTable.tokenHash} IS NOT NULL`, eq(clubInvitationsTable.status, "pending"))).limit(1);
  if (existing.length && targetId) {
    const r = existing[0];
    const [from] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, r.fromUserId));
    const response = { invitation: { id: r.id, clubId: r.clubId, clubName: club.name, clubLogo: club.logo, fromUserId: r.fromUserId, fromUserName: from?.name ?? "", status: r.status, createdAt: r.createdAt }, inviteUrl: null };
    res.status(201).json(CreateClubInvitationResponse.parse(response)); return;
  }
  const rawToken = body.data.mode === "link" ? randomBytes(32).toString("base64url") : null;
  const [created] = await db.insert(clubInvitationsTable).values({
    id: uid(), clubId: club.id, fromUserId: current.id, toUserId: targetId, toUsername: body.data.username ? normalizeUsername(body.data.username) : null,
    tokenHash: rawToken ? hash(rawToken) : null, expiresAt: new Date(Date.now() + LINK_TTL_MS),
  }).returning();
  const response = { invitation: { id: created.id, clubId: club.id, clubName: club.name, clubLogo: club.logo, fromUserId: current.id, fromUserName: (await clerkUser(current.id)).primaryEmailAddress?.emailAddress ?? "", status: created.status, createdAt: created.createdAt }, inviteUrl: rawToken ? `${req.protocol}://${req.get("host")}/invite/${rawToken}` : null };
  res.status(201).json(CreateClubInvitationResponse.parse(response));
});

async function respondInvite(inviteId: string, userId: string, decision: "accepted" | "declined", tokenHash?: string) {
  return db.transaction(async (tx) => {
    const [invite] = await tx.select().from(clubInvitationsTable).where(and(eq(clubInvitationsTable.id, inviteId), eq(clubInvitationsTable.status, "pending"))).limit(1);
    if (!invite || invite.expiresAt < new Date()) throw new Error("NOT_FOUND");
    if (tokenHash ? invite.tokenHash !== tokenHash : invite.toUserId !== userId) throw new Error("FORBIDDEN");
    await tx.update(clubInvitationsTable).set({ status: decision, toUserId: userId }).where(eq(clubInvitationsTable.id, invite.id));
    if (decision === "accepted") {
      await tx.update(usersTable).set({ clubId: invite.clubId, joinStatus: "approved", isFreeAgent: false }).where(eq(usersTable.id, userId));
      await tx.insert(clubMembersTable).values({ clubId: invite.clubId, userId, role: "player" }).onConflictDoUpdate({ target: [clubMembersTable.clubId, clubMembersTable.userId], set: { role: "player" } });
    }
    return invite.clubId;
  });
}

router.post("/me/invitations/:invitationId/respond", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  const params = RespondToInvitationParams.safeParse(req.params);
  const body = RespondToInvitationBody.safeParse(req.body);
  if (!current) { error(res, 401, "Sign in required"); return; }
  if (!params.success || !body.success) { error(res, 400, "Invalid response"); return; }
  try { const clubId = await respondInvite(params.data.invitationId, current.id, body.data.decision); res.json(RespondToInvitationResponse.parse({ success: true, clubId })); }
  catch (cause) { error(res, cause instanceof Error && cause.message === "FORBIDDEN" ? 403 : 404, "Invitation not found"); }
});

router.post("/me/invitations/accept-link", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  const body = AcceptClubInvitationLinkBody.safeParse(req.body);
  if (!current) { error(res, 401, "Sign in required"); return; }
  if (!body.success) { error(res, 400, body.error.message); return; }
  const [invite] = await db.select({ id: clubInvitationsTable.id }).from(clubInvitationsTable).where(eq(clubInvitationsTable.tokenHash, hash(body.data.token))).limit(1);
  if (!invite) { error(res, 404, "Invitation link invalid or expired"); return; }
  try { const clubId = await respondInvite(invite.id, current.id, "accepted", hash(body.data.token)); res.json(AcceptClubInvitationLinkResponse.parse({ success: true, clubId })); }
  catch { error(res, 404, "Invitation link invalid or expired"); }
});

router.get("/clubs/:clubId/roster", requireAuth(true), async (req, res): Promise<void> => {
  const params = GetClubRosterParams.safeParse(req.params);
  if (!params.success) { error(res, 400, params.error.message); return; }
  const [club] = await db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, params.data.clubId)).limit(1);
  if (!club) { error(res, 404, "Club not found"); return; }
  const rows = await db.select({ user: usersTable, clubName: clubsTable.name }).from(usersTable).innerJoin(clubsTable, eq(usersTable.clubId, clubsTable.id))
    .where(and(eq(usersTable.clubId, params.data.clubId), eq(usersTable.joinStatus, "approved")));
  res.json(GetClubRosterResponse.parse(rows.map(rosterOutput)));
});

async function squadOutput(clubId: string, formation: "4-3-3" | "4-2-3-1", assignments: Array<{ slotId: string; playerId: string | null }>, updatedAt: Date) {
  const ids = assignments.flatMap((a) => a.playerId ? [a.playerId] : []);
  const players = ids.length ? await db.select({ id: usersTable.id, name: usersTable.name, position: usersTable.position }).from(usersTable).where(inArray(usersTable.id, ids)) : [];
  return { clubId, formation, assignments: assignments.map((a) => { const p = players.find((x) => x.id === a.playerId); return { slotId: a.slotId, playerId: a.playerId, playerName: p?.name ?? null, position: p?.position ?? a.slotId }; }), updatedAt };
}
router.get("/clubs/:clubId/squad", requireAuth(true), async (req, res): Promise<void> => {
  const params = GetClubSquadParams.safeParse(req.params);
  if (!params.success) { error(res, 400, params.error.message); return; }
  const [club] = await db.select({ id: clubsTable.id }).from(clubsTable).where(eq(clubsTable.id, params.data.clubId)).limit(1);
  if (!club) { error(res, 404, "Club not found"); return; }
  const [squad] = await db.select().from(clubSquadsTable).where(eq(clubSquadsTable.clubId, params.data.clubId)).limit(1);
  const formation = squad?.formation ?? "4-3-3";
  const assignments = squad?.assignments ?? Array.from({ length: 11 }, (_, i) => ({ slotId: `slot-${i + 1}`, playerId: null }));
  res.json(GetClubSquadResponse.parse(await squadOutput(params.data.clubId, formation, assignments, squad?.updatedAt ?? new Date())));
});
router.put("/clubs/:clubId/squad", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  const params = SaveClubSquadParams.safeParse(req.params);
  const body = SaveClubSquadBody.safeParse(req.body);
  if (!current) { error(res, 401, "Sign in required"); return; }
  if (!params.success || !body.success) { error(res, 400, "Invalid squad"); return; }
  if (!(await managerFor(params.data.clubId, current.id))) { error(res, 403, "Club manager access required"); return; }
  const slots = body.data.assignments.map((a) => a.slotId);
  const players = body.data.assignments.flatMap((a) => a.playerId ? [a.playerId] : []);
  if (new Set(slots).size !== 11 || new Set(players).size !== players.length) { error(res, 400, "Formation requires 11 unique slots and players"); return; }
  for (const playerId of players) if (!(await approvedMember(params.data.clubId, playerId))) { error(res, 400, "Only approved club members may be assigned"); return; }
  const [saved] = await db.insert(clubSquadsTable).values({ clubId: params.data.clubId, formation: body.data.formation, assignments: body.data.assignments, updatedBy: current.id })
    .onConflictDoUpdate({ target: clubSquadsTable.clubId, set: { formation: body.data.formation, assignments: body.data.assignments, updatedBy: current.id, updatedAt: new Date() } }).returning();
  res.json(SaveClubSquadResponse.parse(await squadOutput(params.data.clubId, saved.formation, saved.assignments, saved.updatedAt)));
});

router.get("/me/referrals", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  if (!current) { error(res, 401, "Sign in required"); return; }
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, current.id)).limit(1);
  if (!u) { error(res, 404, "Profile not found"); return; }
  const referrals = await db.select({ verified: usersTable.emailVerifiedAt }).from(usersTable).where(eq(usersTable.referredByUserId, current.id));
  const verified = referrals.filter((r) => r.verified).length;
  res.json(GetReferralDashboardResponse.parse({ code: u.referralCode, link: `${req.protocol}://${req.get("host")}/register?ref=${u.referralCode}`, walletBalance: u.walletBalance, totalReferrals: referrals.length, verifiedReferrals: verified, pendingReferrals: referrals.length - verified, rewardPerReferral: REWARD }));
});
router.post("/me/referrals/claim", requireAuth(true), async (req, res): Promise<void> => {
  const current = await identity(req);
  if (!current) { error(res, 401, "Sign in required"); return; }
  const result = await db.transaction(async (tx) => {
    const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, current.id)).limit(1);
    if (!u?.referredByUserId) return { rewarded: false, creditsAwarded: 0, walletBalance: u?.walletBalance ?? 0 };
    const [inserted] = await tx.insert(walletTransactionsTable).values({ userId: u.referredByUserId, type: "referral_bonus", amount: REWARD, referenceUserId: current.id }).onConflictDoNothing().returning();
    if (!inserted) {
      const [referrer] = await tx.select({ walletBalance: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.id, u.referredByUserId)).limit(1);
      return { rewarded: false, creditsAwarded: 0, walletBalance: referrer?.walletBalance ?? 0 };
    }
    const [referrer] = await tx.update(usersTable).set({ walletBalance: sql`${usersTable.walletBalance} + ${REWARD}` }).where(eq(usersTable.id, u.referredByUserId)).returning({ walletBalance: usersTable.walletBalance });
    return { rewarded: true, creditsAwarded: REWARD, walletBalance: referrer.walletBalance };
  });
  res.json(ClaimReferralRewardResponse.parse(result));
});

router.get("/market/listings", async (_req, res): Promise<void> => {
  const rows = await db.select({ listing: marketListingsTable, player: usersTable, clubName: clubsTable.name })
    .from(marketListingsTable).innerJoin(usersTable, eq(marketListingsTable.playerId, usersTable.id)).innerJoin(clubsTable, eq(marketListingsTable.clubId, clubsTable.id))
    .where(eq(marketListingsTable.status, "active")).orderBy(desc(marketListingsTable.createdAt));
  res.json(GetMarketListingsResponse.parse(rows.map((r) => ({
    id: r.listing.id, playerId: r.player.id, playerUsername: r.player.username, playerName: r.player.name, eaId: r.player.eaId,
    clubId: r.listing.clubId, clubName: r.clubName, position: r.listing.position, overall: r.listing.overall, price: r.listing.price, createdAt: r.listing.createdAt,
  }))));
});

export default router;