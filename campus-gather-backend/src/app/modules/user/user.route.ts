import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { UserController } from "./user.controller.js";
import { UserValidation } from "./user.validation.js";

const router = Router();

router.get("/me", auth(), UserController.getMe);
router.patch(
    "/me",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR, Role.STUDENT),
    validateRequest(UserValidation.updateMyProfileZodSchema),
    UserController.updateMyProfile,
);

router.post(
    "/whitelist",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(UserValidation.whitelistStudentZodSchema),
    UserController.whitelistStudent,
);

router.get(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR, Role.STUDENT),
    UserController.getAllUsers,
);

router.get(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR),
    UserController.getUserById,
);

router.patch(
    "/:id/role",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(UserValidation.updateUserRoleZodSchema),
    UserController.updateUserRole,
);

router.patch(
    "/:id/fee-status",
    auth(Role.SUPER_ADMIN, Role.CONVENOR, Role.CR),
    validateRequest(UserValidation.updateFeeStatusZodSchema),
    UserController.updateFeeStatus,
);

export const UserRoutes = router;
export default router;
