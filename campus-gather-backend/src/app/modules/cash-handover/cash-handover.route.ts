import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CashHandoverController } from "./cash-handover.controller.js";
import { CashHandoverValidation } from "./cash-handover.validation.js";

const router = Router();

router.post(
    "/",
    auth(Role.CR),
    validateRequest(CashHandoverValidation.createHandoverZodSchema),
    CashHandoverController.createHandover
);

router.get(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR, Role.STUDENT),
    CashHandoverController.getAllHandovers
);

router.get(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR, Role.STUDENT),
    CashHandoverController.getHandoverById
);

router.patch(
    "/:id/verify",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(CashHandoverValidation.verifyHandoverZodSchema),
    CashHandoverController.verifyHandover
);

router.delete(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR),
    CashHandoverController.deleteHandover
);

export const CashHandoverRoutes = router;
export default router;
