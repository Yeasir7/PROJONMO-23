import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { ExpenseService } from "./expense.service.js";

const createExpense = catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.createExpense(req.user.userId, req.body);

    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Expense created successfully",
        data: result,
    });
});

const getAllExpenses = catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.getAllExpenses(
        req.query as { committeeId?: string; page?: string; limit?: string }
    );

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expenses fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getExpenseById = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Expense ID must be a valid number",
        });
        return;
    }
    const result = await ExpenseService.getExpenseById(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expense fetched successfully",
        data: result,
    });
});

const deleteExpense = catchAsync(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
        res.status(status.BAD_REQUEST).json({
            success: false,
            message: "Expense ID must be a valid number",
        });
        return;
    }
    const result = await ExpenseService.deleteExpense(id);

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Expense deleted successfully",
        data: result,
    });
});

export const ExpenseController = {
    createExpense,
    getAllExpenses,
    getExpenseById,
    deleteExpense,
};
