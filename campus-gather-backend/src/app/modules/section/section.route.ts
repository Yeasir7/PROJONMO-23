import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { SectionController } from "./section.controller.js";
import { SectionValidation } from "./section.validation.js";

const router = Router();

router.post(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(SectionValidation.createSectionZodSchema),
    SectionController.createSection
);

router.get(
    "/",
    SectionController.getAllSections
);

router.patch(
    "/semester-fee",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(SectionValidation.updateSemesterFeeZodSchema),
    SectionController.updateSemesterFee
);

router.get(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR, Role.STUDENT),
    SectionController.getSectionById
);

router.patch(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(SectionValidation.updateSectionZodSchema),
    SectionController.updateSection
);

router.delete(
    "/:id",
    auth(Role.SUPER_ADMIN),
    SectionController.deleteSection
);

export const SectionRoutes = router;
export default router;
