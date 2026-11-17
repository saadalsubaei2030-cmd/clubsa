import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsaRouter from "./clubsa";
import publicChatRouter from "./public-chat";
import socialRouter from "./social";
import marketRouter from "./market";
import invitesRouter from "./invites";
import ranksRouter from "./ranks";
import leaderboardsRouter from "./leaderboards";
import accountsRouter from "./accounts";
import recruitRouter from "./recruit";
import notificationsRouter from "./notifications";
import moderationRouter from "./moderation";
import discordRouter from "./discord";
import tournamentsRouter from "./tournaments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicChatRouter);
router.use(socialRouter);
router.use(marketRouter);
router.use(invitesRouter);
router.use(ranksRouter);
router.use(leaderboardsRouter);
router.use(accountsRouter);
router.use(recruitRouter);
router.use(notificationsRouter);
router.use(moderationRouter);
router.use(discordRouter);
router.use(tournamentsRouter);
router.use(clubsaRouter);

export default router;
