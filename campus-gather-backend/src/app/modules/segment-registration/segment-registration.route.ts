import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SegmentRegistrationController } from "./segment-registration.controller.js";
import { SegmentRegistrationValidation } from "./segment-registration.validation.js";

const router = Router();

router.post(
    "/",
    auth(),
    validateRequest(SegmentRegistrationValidation.createRegistrationZodSchema),
    SegmentRegistrationController.registerForSegment
);

router.get("/my", auth(), SegmentRegistrationController.getMyRegistrations);

router.get(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    SegmentRegistrationController.getAllRegistrations
);

router.patch(
    "/:id/payment",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(SegmentRegistrationValidation.updatePaymentStatusZodSchema),
    SegmentRegistrationController.updatePaymentStatus
);

router.delete(
    "/:id",
    auth(),
    SegmentRegistrationController.cancelRegistration
);

export const SegmentRegistrationRoutes = router;
export default router;
