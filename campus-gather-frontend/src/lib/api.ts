import axios, { AxiosError } from "axios";
import type {
  AllowedStudent,
  AnalyticsSummary,
  ApiResponse,
  CashHandover,
  CommitteeBudgetItem,
  CommitteeMember,
  Expense,
  FestFeeStatus,
  FundInflow,
  InflowCategory,
  ParticipationType,
  Role,
  Section,
  Segment,
  SegmentPaymentStatus,
  SegmentRegistration,
  User,
} from "@/types/fest";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        if (
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/register") &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export function hasAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("accessToken");
}

export function getApiErrorMessage(error: unknown, fallbackMessage = "An unexpected error occurred"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errorSources?: Array<{ message: string }> } | undefined;
    if (data?.message) return data.message;
    if (data?.errorSources && data.errorSources.length > 0) {
      return data.errorSources.map((s) => s.message).join(", ");
    }
    if (error.message) return error.message;
  } else if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

// Helper unwrappers
async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

async function unwrapWithMeta<T>(
  promise: Promise<{ data: ApiResponse<T> }>
): Promise<{ data: T; meta?: ApiResponse<T>["meta"] }> {
  const response = await promise;
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

// ─── AUTH APIS ─────────────────────────────────────────────────────────────
export const authApi = {
  verifyStudentId: (studentId: string) =>
    unwrap<{ studentId: string; fullName: string; isClaimed: boolean }>(
      api.get(`/auth/verify-student/${studentId}`)
    ),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    studentId: string;
    phone: string;
    sectionId: number;
    tshirtSize: string;
  }) =>
    unwrap<{ accessToken: string; refreshToken: string; user: User }>(
      api.post("/auth/register", payload)
    ),

  login: (payload: { email: string; password: string }) =>
    unwrap<{ accessToken: string; refreshToken: string; user: User }>(
      api.post("/auth/login", payload)
    ),

  logout: () => unwrap<void>(api.post("/auth/logout")),

  refreshToken: (token?: string) =>
    unwrap<{ accessToken: string }>(api.post("/auth/refresh-token", { refreshToken: token })),

  forgotPassword: (identifier: string) =>
    unwrap<{ maskedEmail: string }>(api.post("/auth/forgot-password", { identifier })),
};

// ─── USERS APIS ────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => unwrap<User>(api.get("/users/me")),

  getAll: (params?: { sectionId?: number; role?: Role; festFeeStatus?: FestFeeStatus; page?: number; limit?: number }) =>
    unwrapWithMeta<User[]>(api.get("/users", { params: { limit: 2000, ...params } })),

  getById: (id: number) => unwrap<User>(api.get(`/users/${id}`)),

  whitelistStudent: (payload: { studentId: string; fullName: string }) =>
    unwrap<AllowedStudent>(api.post("/users/whitelist", payload)),

  updateRole: (id: number, role: Role) =>
    unwrap<User>(api.patch(`/users/${id}/role`, { role })),

  updateFeeStatus: (id: number, data: { festFeeStatus: FestFeeStatus; paidAmount?: number }) =>
    unwrap<User>(api.patch(`/users/${id}/fee-status`, data)),

  updateKitStatus: (id: number, kitDelivered: boolean) =>
    unwrap<User>(api.patch(`/users/${id}/kit-status`, { kitDelivered })),

  updateMyProfile: (payload: {
    email?: string;
    phone?: string;
    tshirtSize?: "S" | "M" | "L" | "XL" | "XXL";
    sectionId?: number;
    newPassword?: string;
  }) => unwrap<User>(api.patch("/users/me", payload)),
};

// ─── SECTIONS APIS ─────────────────────────────────────────────────────────
export const sectionsApi = {
  getAll: () => unwrap<Section[]>(api.get("/sections")),
  getById: (id: number) => unwrap<Section>(api.get(`/sections/${id}`)),
  create: (data: { semester: number; sectionName: string; code: string; festFee?: number }) =>
    unwrap<Section>(api.post("/sections", data)),
  update: (id: number, data: Partial<{ semester: number; sectionName: string; code: string; festFee: number }>) =>
    unwrap<Section>(api.patch(`/sections/${id}`, data)),
  updateSemesterFee: (payload: { semester: number; festFee: number }) =>
    unwrap<{ semester: number; festFee: number; count: number }>(
      api.patch("/sections/semester-fee", payload)
    ),
  delete: (id: number) => unwrap<Section>(api.delete(`/sections/${id}`)),
};

// ─── CASH HANDOVERS APIS ───────────────────────────────────────────────────
export const cashHandoversApi = {
  create: (data: { sectionId?: number; receivedById: number; amount: number; notes?: string }) =>
    unwrap<CashHandover>(api.post("/cash-handovers", data)),

  getAll: (params?: { sectionId?: number; status?: string; page?: number; limit?: number }) =>
    unwrapWithMeta<CashHandover[]>(api.get("/cash-handovers", { params })),

  getById: (id: number) => unwrap<CashHandover>(api.get(`/cash-handovers/${id}`)),

  verify: (id: number) =>
    unwrap<CashHandover>(api.patch(`/cash-handovers/${id}/verify`, { status: "VERIFIED" })),
};

// ─── COMMITTEES APIS ───────────────────────────────────────────────────────
export const committeesApi = {
  getAll: () => unwrap<CommitteeBudgetItem[]>(api.get("/committees")),

  getById: (id: number) => unwrap<CommitteeBudgetItem>(api.get(`/committees/${id}`)),

  create: (data: { name: string; description?: string; allocatedBudget?: number }) =>
    unwrap<CommitteeBudgetItem>(api.post("/committees", data)),

  update: (id: number, data: { name?: string; description?: string; allocatedBudget?: number }) =>
    unwrap<CommitteeBudgetItem>(api.patch(`/committees/${id}`, data)),

  delete: (id: number) => unwrap<CommitteeBudgetItem>(api.delete(`/committees/${id}`)),

  addMember: (committeeId: number, data: { userId: number; designation?: "LEAD" | "MEMBER" }) =>
    unwrap<CommitteeMember>(api.post(`/committees/${committeeId}/members`, data)),

  updateMember: (committeeId: number, userId: number, data: { designation: "LEAD" | "MEMBER" }) =>
    unwrap<CommitteeMember>(api.patch(`/committees/${committeeId}/members/${userId}`, data)),

  removeMember: (committeeId: number, userId: number) =>
    unwrap<CommitteeMember>(api.delete(`/committees/${committeeId}/members/${userId}`)),

  deleteMember: (committeeId: number, userId: number) =>
    unwrap<CommitteeMember>(api.delete(`/committees/${committeeId}/members/${userId}`)),
};

// ─── EXPENSES APIS ─────────────────────────────────────────────────────────
export const expensesApi = {
  getAll: (params?: { committeeId?: number; page?: number; limit?: number }) =>
    unwrapWithMeta<Expense[]>(api.get("/expenses", { params })),

  getById: (id: number) => unwrap<Expense>(api.get(`/expenses/${id}`)),

  create: (data: { committeeId: number; itemTitle: string; amount: number; voucherNote?: string }) =>
    unwrap<Expense>(api.post("/expenses", data)),

  delete: (id: number) => unwrap<Expense>(api.delete(`/expenses/${id}`)),
};

// ─── FUND INFLOWS APIS ─────────────────────────────────────────────────────
export const fundInflowsApi = {
  getAll: () => unwrap<FundInflow[]>(api.get("/fund-inflows")),

  getById: (id: number) => unwrap<FundInflow>(api.get(`/fund-inflows/${id}`)),

  create: (data: { sourceTitle: string; category?: InflowCategory; amount: number; notes?: string }) =>
    unwrap<FundInflow>(api.post("/fund-inflows", data)),

  delete: (id: number) => unwrap<FundInflow>(api.delete(`/fund-inflows/${id}`)),
};

// ─── SEGMENTS APIS ─────────────────────────────────────────────────────────
export const segmentsApi = {
  getAll: () => unwrap<Segment[]>(api.get("/segments")),

  getById: (id: number) => unwrap<Segment>(api.get(`/segments/${id}`)),
  getSegmentById: (id: number) => unwrap<Segment>(api.get(`/segments/${id}`)),

  create: (data: {
    title: string;
    category: string;
    registrationFee?: number;
    maxCapacity?: number;
    participationType?: ParticipationType;
    description?: string;
  }) => unwrap<Segment>(api.post("/segments", data)),

  update: (
    id: number,
    data: Partial<{
      title: string;
      category: string;
      registrationFee: number;
      maxCapacity: number;
      participationType: ParticipationType;
      description: string;
    }>
  ) => unwrap<Segment>(api.patch(`/segments/${id}`, data)),

  updateSegment: (
    id: number,
    data: Partial<{
      title: string;
      category: string;
      registrationFee: number;
      maxCapacity: number;
      participationType: ParticipationType;
      description: string;
    }>
  ) => unwrap<Segment>(api.patch(`/segments/${id}`, data)),

  delete: (id: number) => unwrap<Segment>(api.delete(`/segments/${id}`)),

  cancelMyRegistration: (segmentId: number) =>
    unwrap<{ success: boolean; message: string }>(
      api.delete(`/segments/${segmentId}/registrations/me`)
    ),

  removeRegistration: (segmentId: number, registrationId: number) =>
    unwrap<{ success: boolean; message: string }>(
      api.delete(`/segments/${segmentId}/registrations/${registrationId}`)
    ),
};

// ─── SEGMENT REGISTRATIONS APIS ────────────────────────────────────────────
export const segmentRegistrationsApi = {
  register: (data: { segmentId: number; teamOrDetails?: string }) =>
    unwrap<SegmentRegistration>(api.post("/segment-registrations", data)),

  getMy: () => unwrap<SegmentRegistration[]>(api.get("/segment-registrations/my")),

  getAll: (params?: { segmentId?: number; page?: number; limit?: number }) =>
    unwrapWithMeta<SegmentRegistration[]>(api.get("/segment-registrations", { params })),

  updatePayment: (id: number, paymentStatus: SegmentPaymentStatus) =>
    unwrap<SegmentRegistration>(api.patch(`/segment-registrations/${id}/payment`, { paymentStatus })),

  cancel: (id: number) => unwrap<SegmentRegistration>(api.delete(`/segment-registrations/${id}`)),
};

// ─── ANALYTICS APIS ────────────────────────────────────────────────────────
export const analyticsApi = {
  getSummary: () => unwrap<AnalyticsSummary>(api.get("/analytics/summary")),
};
