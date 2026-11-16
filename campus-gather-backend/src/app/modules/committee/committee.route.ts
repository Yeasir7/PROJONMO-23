import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { CommitteeController } from "./committee.controller.js";
import { CommitteeValidation } from "./committee.validation.js";

const router = Router();

router.post(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(CommitteeValidation.createCommitteeZodSchema),
    CommitteeController.createCommittee
);

router.get(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    CommitteeController.getAllCommittees
);

router.get(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    CommitteeController.getCommitteeById
);

router.patch(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(CommitteeValidation.updateCommitteeZodSchema),
    CommitteeController.updateCommittee
);

router.delete(
    "/:id",
    auth(Role.SUPER_ADMIN),
    CommitteeController.deleteCommittee
);

router.post(
    "/:id/members",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(CommitteeValidation.addMemberZodSchema),
    CommitteeController.addMember
);

router.patch(
    "/:id/members/:userId",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(CommitteeValidation.updateMemberDesignationZodSchema),
    CommitteeController.updateMemberDesignation
);

router.delete(
    "/:id/members/:userId",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    CommitteeController.removeMember
);

export const CommitteeRoutes = router;
export default router;
