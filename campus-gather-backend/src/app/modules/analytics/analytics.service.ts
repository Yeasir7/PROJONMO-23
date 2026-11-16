import { FestFeeStatus, HandoverStatus, SegmentPaymentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const getSummary = async () => {
    const [
        totalStudents,
        totalPaidStudents,
        totalKitsDelivered,
        userPaidAgg,
        verifiedHandoverAgg,
        pendingHandoverAgg,
        inflowAgg,
        paidContestRegistrations,
        committeeBudgetAgg,
        expenseAgg,
        tshirtBreakdown,
        paidTshirtBreakdown,
        deliveredTshirtBreakdown,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { festFeeStatus: FestFeeStatus.PAID_TO_CR } }),
        prisma.user.count({ where: { kitDelivered: true } }),
        prisma.user.aggregate({ _sum: { paidAmount: true } }),
        prisma.cashHandover.aggregate({
            where: { status: HandoverStatus.VERIFIED },
            _sum: { amount: true },
        }),
        prisma.cashHandover.aggregate({
            where: { status: HandoverStatus.PENDING },
            _sum: { amount: true },
        }),
        prisma.fundInflow.aggregate({ _sum: { amount: true } }),
        prisma.segmentRegistration.findMany({
            where: { paymentStatus: SegmentPaymentStatus.PAID },
            select: { segment: { select: { registrationFee: true } } },
        }),
        prisma.committee.aggregate({ _sum: { allocatedBudget: true } }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
        prisma.user.groupBy({
            by: ["tshirtSize"],
            _count: { _all: true },
        }),
        prisma.user.groupBy({
            by: ["tshirtSize"],
            where: { festFeeStatus: FestFeeStatus.PAID_TO_CR },
            _count: { _all: true },
        }),
        prisma.user.groupBy({
            by: ["tshirtSize"],
            where: { kitDelivered: true },
            _count: { _all: true },
        }),
    ]);

    const totalCollectedByCRs = userPaidAgg._sum.paidAmount ?? 0;
    const totalVerifiedByConvenor = verifiedHandoverAgg._sum.amount ?? 0;
    const totalPendingHandover = pendingHandoverAgg._sum.amount ?? 0;
    const totalInflows = inflowAgg._sum.amount ?? 0;
    const totalContestRevenue = paidContestRegistrations.reduce(
        (sum, reg) => sum + (reg.segment?.registrationFee ?? 0),
        0
    );
    const totalAllocatedBudget = committeeBudgetAgg._sum.allocatedBudget ?? 0;
    const totalExpenses = expenseAgg._sum.amount ?? 0;
    const availableBalance = totalVerifiedByConvenor + totalInflows + totalContestRevenue - totalExpenses;

    return {
        totalStudents,
        totalPaidStudents,
        totalKitsDelivered,
        totalCollectedByCRs,
        totalVerifiedByConvenor,
        totalPendingHandover,
        totalInflows,
        totalContestRevenue,
        totalAllocatedBudget,
        totalExpenses,
        availableBalance,
        tshirtBreakdown,
        paidTshirtBreakdown,
        deliveredTshirtBreakdown,
    };
};

export const AnalyticsService = {
    getSummary,
};
