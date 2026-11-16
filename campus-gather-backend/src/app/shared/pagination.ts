export interface IPaginationOptions {
    page?: string | number;
    limit?: string | number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export interface IPaginationResult {
    page: number;
    limit: number;
    skip: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
}

export const calculatePagination = (
    options?: IPaginationOptions,
    defaultSortBy = "createdAt",
    defaultLimit = 20,
    maxLimit = 2000
): IPaginationResult => {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.max(1, Math.min(maxLimit, Number(options?.limit) || defaultLimit));
    const skip = (page - 1) * limit;
    const sortBy = options?.sortBy || defaultSortBy;
    const sortOrder = options?.sortOrder === "asc" ? "asc" : "desc";

    return {
        page,
        limit,
        skip,
        sortBy,
        sortOrder,
    };
};
