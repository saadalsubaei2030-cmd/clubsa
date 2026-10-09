import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsaRouter from "./clubsa";
import publicChatRouter from "./public-chat";
import socialRouter from "./social";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicChatRouter);
router.use(socialRouter);
router.use(clubsaRouter);

export default router;
