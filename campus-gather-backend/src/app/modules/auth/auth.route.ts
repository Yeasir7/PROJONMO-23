import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { AuthController } from "./auth.controller.js";
import {
    registerStudentZodSchema,
    googleRegisterStudentZodSchema,
    googleLoginZodSchema,
    loginZodSchema,
    refreshTokenZodSchema,
    forgotPasswordZodSchema,
} from "./auth.validation.js";

const router = Router();

router.get("/verify-student/:studentId", AuthController.verifyStudent);

router.post(
    "/register",
    validateRequest(registerStudentZodSchema),
    AuthController.registerStudent
);

router.post(
    "/google-register",
    validateRequest(googleRegisterStudentZodSchema),
    AuthController.googleRegisterStudent
);

router.post(
    "/login",
    validateRequest(loginZodSchema),
    AuthController.login
);

router.post(
    "/google-login",
    validateRequest(googleLoginZodSchema),
    AuthController.googleLogin
);

router.post(
    "/forgot-password",
    validateRequest(forgotPasswordZodSchema),
    AuthController.forgotPassword
);

router.post(
    "/refresh-token",
    validateRequest(refreshTokenZodSchema),
    AuthController.refreshToken
);

router.post(
    "/logout",
    AuthController.logout
);

export const AuthRoutes = router;
export default router;
