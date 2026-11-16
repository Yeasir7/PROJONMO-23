import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import { envVars } from "./app/config/env.js";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler.js";
import { notFound } from "./app/middleware/notFound.js";
import { AuthRoutes } from "./app/modules/auth/auth.route.js";
import { UserRoutes } from "./app/modules/user/user.route.js";
import { SectionRoutes } from "./app/modules/section/section.route.js";
import { CommitteeRoutes } from "./app/modules/committee/committee.route.js";
import { CashHandoverRoutes } from "./app/modules/cash-handover/cash-handover.route.js";
import { ExpenseRoutes } from "./app/modules/expense/expense.route.js";
import { FundInflowRoutes } from "./app/modules/fund-inflow/fund-inflow.route.js";
import { SegmentRoutes } from "./app/modules/segment/segment.route.js";
import { SegmentRegistrationRoutes } from "./app/modules/segment-registration/segment-registration.route.js";
import { AnalyticsRoutes } from "./app/modules/analytics/analytics.route.js";

const app: Application = express();

// Application middlewares
app.use(cors({
    origin: envVars.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/sections", SectionRoutes);
app.use("/api/v1/committees", CommitteeRoutes);
app.use("/api/v1/cash-handovers", CashHandoverRoutes);
app.use("/api/v1/expenses", ExpenseRoutes);
app.use("/api/v1/fund-inflows", FundInflowRoutes);
app.use("/api/v1/segments", SegmentRoutes);
app.use("/api/v1/segment-registrations", SegmentRegistrationRoutes);
app.use("/api/v1/analytics", AnalyticsRoutes);

// Root health check route
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "API is working",
    });
});

// 404 Not Found handler
app.use(notFound);

// Global error handler
app.use(globalErrorHandler);

export default app;
