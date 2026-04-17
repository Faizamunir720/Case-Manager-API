import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import casesRouter from "./cases";
import hearingsRouter from "./hearings";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(casesRouter);
router.use(hearingsRouter);
router.use(usersRouter);

export default router;
