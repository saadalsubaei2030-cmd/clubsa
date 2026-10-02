import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsaRouter from "./clubsa";
import friendsRouter from "./friends";
import privateMessagesRouter from "./private-messages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clubsaRouter);
router.use(friendsRouter);
router.use(privateMessagesRouter);

export default router;
