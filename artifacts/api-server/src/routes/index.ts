import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clubsaRouter from "./clubsa";

const router: IRouter = Router();

router.use(healthRouter);
router.use(clubsaRouter);

export default router;
