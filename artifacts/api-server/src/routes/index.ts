import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsaRouter from "./clubsa";
import publicChatRouter from "./public-chat";
import socialRouter from "./social";
import marketRouter from "./market";
import invitesRouter from "./invites";
import ranksRouter from "./ranks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicChatRouter);
router.use(socialRouter);
router.use(marketRouter);
router.use(invitesRouter);
router.use(ranksRouter);
router.use(clubsaRouter);

export default router;
