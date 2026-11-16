import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { FundInflowController } from "./fund-inflow.controller.js";
import { FundInflowValidation } from "./fund-inflow.validation.js";

const router = Router();

router.post(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(FundInflowValidation.createInflowZodSchema),
    FundInflowController.createInflow
);

router.get(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    FundInflowController.getAllInflows
);

router.get(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    FundInflowController.getInflowById
);

router.delete(
    "/:id",
    auth(Role.SUPER_ADMIN),
    FundInflowController.deleteInflow
);

export const FundInflowRoutes = router;
export default router;
