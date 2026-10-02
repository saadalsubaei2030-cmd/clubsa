import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import {
  db,
  friendsTable,
  usersTable,
  type FriendshipStatus,
} from "@workspace/db";
import {
  AcceptFriendRequestParams,
  AcceptFriendRequestResponse,
  CreateFriendRequestParams,
  CreateFriendRequestResponse,
  DeleteFriendParams,
  DeleteFriendResponse,
  GetFriendsResponse,
  SearchUsersQueryParams,
  SearchUsersResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function error(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function canonicalPair(first: string, second: string): [string, string] {
  return first < second ? [first, second] : [second, first];
}

function escapeLike(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

async function hasProfile(userId: string): Promise<boolean> {
  const [profile] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return Boolean(profile);
}

async function currentProfileId(req: Request, res: Response): Promise<string | null> {
  const userId = getAuth(req).userId;
  if (!userId) {
    error(res, 401, "Sign in required");
    return null;
  }
  if (!(await hasProfile(userId))) {
    error(res, 409, "Complete your CLUBSA profile before using friends");
    return null;
  }
  return userId;
}

async function getRelationship(
  firstUserId: string,
  secondUserId: string,
) {
  const [userAId, userBId] = canonicalPair(firstUserId, secondUserId);
  const [relationship] = await db
    .select()
    .from(friendsTable)
    .where(
      and(
        eq(friendsTable.userAId, userAId),
        eq(friendsTable.userBId, userBId),
      ),
    )
    .limit(1);
  return relationship;
}

router.get("/users/search", async (req, res): Promise<void> => {
  const viewerId = await currentProfileId(req, res);
  if (!viewerId) return;

  const parsed = SearchUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    error(res, 400, parsed.error.message);
    return;
  }

  const query = parsed.data.q.trim();
  if (!/^[a-zA-Z0-9_]{2,24}$/.test(query)) {
    error(res, 400, "Search usernames with 2–24 letters, numbers, or underscores");
    return;
  }

  const matches = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      avatar: usersTable.avatar,
    })
    .from(usersTable)
    .where(
      and(
        ilike(usersTable.username, escapeLike(query)),
        eq(usersTable.joinStatus, "approved"),
      ),
    )
    .limit(20);
  const users = matches.filter((user) => user.id !== viewerId);
  const matchingIds = users.map((user) => user.id);
  const relationships = matchingIds.length
    ? await db
        .select()
        .from(friendsTable)
        .where(
          or(
            and(
              eq(friendsTable.userAId, viewerId),
              inArray(friendsTable.userBId, matchingIds),
            ),
            and(
              eq(friendsTable.userBId, viewerId),
              inArray(friendsTable.userAId, matchingIds),
            ),
          ),
        )
    : [];
  const relationshipByUser = new Map<
    string,
    { status: FriendshipStatus; requestedByUserId: string }
  >();
  for (const relationship of relationships) {
    const otherUserId =
      relationship.userAId === viewerId
        ? relationship.userBId
        : relationship.userAId;
    relationshipByUser.set(otherUserId, {
      status: relationship.status,
      requestedByUserId: relationship.requestedByUserId,
    });
  }

  res.json(
    SearchUsersResponse.parse({
      users: users.map((user) => {
        const relationship = relationshipByUser.get(user.id);
        const relationshipStatus = !relationship
          ? "none"
          : relationship.status === "accepted"
            ? "accepted"
            : relationship.requestedByUserId === viewerId
              ? "outgoing"
              : "incoming";
        return { ...user, relationshipStatus };
      }),
    }),
  );
});

router.get("/friends", async (req, res): Promise<void> => {
  const viewerId = await currentProfileId(req, res);
  if (!viewerId) return;

  const relationships = await db
    .select()
    .from(friendsTable)
    .where(
      or(
        eq(friendsTable.userAId, viewerId),
        eq(friendsTable.userBId, viewerId),
      ),
    );
  const otherUserIds = [
    ...new Set(
      relationships.map((relationship) =>
        relationship.userAId === viewerId
          ? relationship.userBId
          : relationship.userAId,
      ),
    ),
  ];
  const profiles = otherUserIds.length
    ? await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          name: usersTable.name,
          avatar: usersTable.avatar,
        })
        .from(usersTable)
        .where(inArray(usersTable.id, otherUserIds))
    : [];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const friends: typeof profiles = [];
  const incomingRequests: typeof profiles = [];
  const outgoingRequests: typeof profiles = [];

  for (const relationship of relationships) {
    const otherUserId =
      relationship.userAId === viewerId
        ? relationship.userBId
        : relationship.userAId;
    const profile = profileById.get(otherUserId);
    if (!profile) continue;
    if (relationship.status === "accepted") friends.push(profile);
    else if (relationship.requestedByUserId === viewerId)
      outgoingRequests.push(profile);
    else incomingRequests.push(profile);
  }

  res.json(
    GetFriendsResponse.parse({ friends, incomingRequests, outgoingRequests }),
  );
});

router.post("/friends/:userId", async (req, res): Promise<void> => {
  const viewerId = await currentProfileId(req, res);
  if (!viewerId) return;
  const parsed = CreateFriendRequestParams.safeParse({
    userId: param(req.params.userId),
  });
  if (!parsed.success) {
    error(res, 400, parsed.error.message);
    return;
  }
  const targetId = parsed.data.userId;
  if (viewerId === targetId) {
    error(res, 400, "You cannot add yourself as a friend");
    return;
  }
  if (!(await hasProfile(targetId))) {
    error(res, 404, "User not found");
    return;
  }

  const existing = await getRelationship(viewerId, targetId);
  if (existing) {
    error(
      res,
      409,
      existing.status === "accepted"
        ? "You are already friends"
        : existing.requestedByUserId === viewerId
          ? "Friend request already sent"
          : "Accept the incoming request instead",
    );
    return;
  }

  const [userAId, userBId] = canonicalPair(viewerId, targetId);
  try {
    await db.insert(friendsTable).values({
      userAId,
      userBId,
      requestedByUserId: viewerId,
    });
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "23505"
    ) {
      error(res, 409, "Friend request already exists");
      return;
    }
    throw cause;
  }
  res
    .status(201)
    .json(CreateFriendRequestResponse.parse({ status: "pending" }));
});

router.post("/friends/:userId/accept", async (req, res): Promise<void> => {
  const viewerId = await currentProfileId(req, res);
  if (!viewerId) return;
  const parsed = AcceptFriendRequestParams.safeParse({
    userId: param(req.params.userId),
  });
  if (!parsed.success) {
    error(res, 400, parsed.error.message);
    return;
  }
  const senderId = parsed.data.userId;
  const [userAId, userBId] = canonicalPair(viewerId, senderId);
  const [updated] = await db
    .update(friendsTable)
    .set({ status: "accepted" })
    .where(
      and(
        eq(friendsTable.userAId, userAId),
        eq(friendsTable.userBId, userBId),
        eq(friendsTable.requestedByUserId, senderId),
        eq(friendsTable.status, "pending"),
      ),
    )
    .returning();
  if (!updated) {
    error(res, 404, "Incoming friend request not found");
    return;
  }
  res.json(AcceptFriendRequestResponse.parse({ status: updated.status }));
});

router.delete("/friends/:userId", async (req, res): Promise<void> => {
  const viewerId = await currentProfileId(req, res);
  if (!viewerId) return;
  const parsed = DeleteFriendParams.safeParse({
    userId: param(req.params.userId),
  });
  if (!parsed.success) {
    error(res, 400, parsed.error.message);
    return;
  }
  const [userAId, userBId] = canonicalPair(viewerId, parsed.data.userId);
  const [deleted] = await db
    .delete(friendsTable)
    .where(
      and(
        eq(friendsTable.userAId, userAId),
        eq(friendsTable.userBId, userBId),
      ),
    )
    .returning();
  if (!deleted) {
    error(res, 404, "Friend relationship not found");
    return;
  }
  res.status(204).json(DeleteFriendResponse.parse(undefined));
});

export default router;