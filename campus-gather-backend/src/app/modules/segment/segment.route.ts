import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SegmentController } from "./segment.controller.js";
import { SegmentValidation } from "./segment.validation.js";

const router = Router();

router.post(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(SegmentValidation.createSegmentZodSchema),
    SegmentController.createSegment
);

router.get("/", SegmentController.getAllSegments);

router.get("/:id", SegmentController.getSegmentById);

router.patch(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(SegmentValidation.updateSegmentZodSchema),
    SegmentController.updateSegment
);

router.delete(
    "/:id/registrations/me",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR, Role.STUDENT),
    SegmentController.cancelMyRegistration
);

router.delete(
    "/:id/registrations/:registrationId",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    SegmentController.removeParticipant
);

router.delete(
    "/:id",
    auth(Role.SUPER_ADMIN),
    SegmentController.deleteSegment
);

export const SegmentRoutes = router;
export default router;
