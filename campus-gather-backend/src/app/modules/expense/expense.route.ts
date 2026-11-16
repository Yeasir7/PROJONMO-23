import { Role } from "@prisma/client";
import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { ExpenseController } from "./expense.controller.js";
import { ExpenseValidation } from "./expense.validation.js";

const router = Router();

router.post(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    validateRequest(ExpenseValidation.createExpenseZodSchema),
    ExpenseController.createExpense
);

router.get(
    "/",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    ExpenseController.getAllExpenses
);

router.get(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    ExpenseController.getExpenseById
);

router.delete(
    "/:id",
    auth(Role.SUPER_ADMIN, Role.CONVENOR),
    ExpenseController.deleteExpense
);

export const ExpenseRoutes = router;
export default router;
