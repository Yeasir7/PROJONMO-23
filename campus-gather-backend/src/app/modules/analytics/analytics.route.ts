import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { AnalyticsController } from "./analytics.controller.js";

const router = Router();

router.get(
    "/summary",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    AnalyticsController.getSummary
);

export const AnalyticsRoutes = router;
export default router;
