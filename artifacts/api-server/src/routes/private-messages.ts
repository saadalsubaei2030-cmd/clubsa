import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { and, asc, eq, or } from "drizzle-orm";
import {
  db,
  friendsTable,
  privateMessagesTable,
  usersTable,
} from "@workspace/db";
import {
  GetPrivateMessagesParams,
  GetPrivateMessagesResponse,
  SendPrivateMessageBody,
  SendPrivateMessageResponse,
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

async function currentProfileId(req: Request, res: Response): Promise<string | null> {
  const userId = getAuth(req).userId;
  if (!userId) {
    error(res, 401, "Sign in required");
    return null;
  }
  const [profile] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!profile) {
    error(res, 409, "Complete your CLUBSA profile before using messages");
    return null;
  }
  return userId;
}

async function isAcceptedFriend(first: string, second: string): Promise<boolean> {
  const [userAId, userBId] = canonicalPair(first, second);
  const [friendship] = await db
    .select({ status: friendsTable.status })
    .from(friendsTable)
    .where(
      and(
        eq(friendsTable.userAId, userAId),
        eq(friendsTable.userBId, userBId),
        eq(friendsTable.status, "accepted"),
      ),
    )
    .limit(1);
  return Boolean(friendship);
}

router.post("/messages/private", async (req, res): Promise<void> => {
  const senderId = await currentProfileId(req, res);
  if (!senderId) return;
  const parsed = SendPrivateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    error(res, 400, parsed.error.message);
    return;
  }
  const receiverId = parsed.data.receiverId;
  const content = parsed.data.content.trim();
  if (!content) {
    error(res, 400, "Message cannot be empty");
    return;
  }
  if (senderId === receiverId) {
    error(res, 400, "You cannot message yourself");
    return;
  }
  if (!(await isAcceptedFriend(senderId, receiverId))) {
    error(res, 403, "Private messages are available only between accepted friends");
    return;
  }

  const [message] = await db
    .insert(privateMessagesTable)
    .values({ senderId, receiverId, content })
    .returning();
  res
    .status(201)
    .json(SendPrivateMessageResponse.parse({ message }));
});

router.get("/messages/private/:userId", async (req, res): Promise<void> => {
  const viewerId = await currentProfileId(req, res);
  if (!viewerId) return;
  const parsed = GetPrivateMessagesParams.safeParse({
    userId: param(req.params.userId),
  });
  if (!parsed.success) {
    error(res, 400, parsed.error.message);
    return;
  }
  const friendId = parsed.data.userId;
  if (
    viewerId === friendId ||
    !(await isAcceptedFriend(viewerId, friendId))
  ) {
    error(res, 403, "Conversation is available only with accepted friends");
    return;
  }

  const messages = await db
    .select()
    .from(privateMessagesTable)
    .where(
      or(
        and(
          eq(privateMessagesTable.senderId, viewerId),
          eq(privateMessagesTable.receiverId, friendId),
        ),
        and(
          eq(privateMessagesTable.senderId, friendId),
          eq(privateMessagesTable.receiverId, viewerId),
        ),
      ),
    )
    .orderBy(asc(privateMessagesTable.createdAt))
    .limit(200);

  res.json(GetPrivateMessagesResponse.parse({ messages }));
});

export default router;