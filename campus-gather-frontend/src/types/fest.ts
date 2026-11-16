export type Role =
  | "SUPER_ADMIN"
  | "CONVENOR"
  | "CR"
  | "STUDENT";

export type TshirtSize = "S" | "M" | "L" | "XL" | "XXL";

export type FestFeeStatus = "UNPAID" | "PAID_TO_CR";

export type HandoverStatus = "PENDING" | "VERIFIED";

export type ParticipationType = "SOLO" | "TEAM";

export type SegmentPaymentStatus = "FREE" | "PENDING" | "PAID";

export type InflowCategory = "SPONSOR" | "DEPT_FUND" | "OTHER";

export interface Section {
  id: number;
  semester: number;
  sectionName: string;
  code: string;
  festFee: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  studentId: string | null;
  phone: string | null;
  tshirtSize: TshirtSize;
  role: Role;
  sectionId: number | null;
  festFeeStatus: FestFeeStatus;
  paidAmount: number;
  kitDelivered: boolean;
  section?: Section | null;
  committeeMemberships?: Array<{
    id: number;
    committeeId: number;
    designation: "LEAD" | "MEMBER" | string;
    committee?: {
      id: number;
      name: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashHandover {
  id: number;
  sectionId: number;
  crId: number;
  receivedById: number;
  amount: number;
  status: HandoverStatus;
  notes: string | null;
  createdAt: string;
  section?: Section;
  cr?: {
    id: number;
    name: string;
    studentId: string | null;
  };
  receivedBy?: {
    id: number;
    name: string;
  };
}

export interface CommitteeMember {
  id: number;
  committeeId: number;
  userId: number;
  designation: "LEAD" | "MEMBER" | string;
  user?: {
    id: number;
    name: string;
    email: string;
    studentId: string | null;
    phone?: string | null;
  };
}

export interface Expense {
  id: number;
  committeeId: number;
  spentById: number;
  itemTitle: string;
  amount: number;
  voucherNote: string | null;
  createdAt: string;
  committee?: {
    id: number;
    name: string;
  };
  spentBy?: {
    id: number;
    name: string;
  };
}

export interface FundInflow {
  id: number;
  sourceTitle: string;
  category: InflowCategory;
  amount: number;
  receivedById: number;
  notes: string | null;
  createdAt: string;
  receivedBy?: {
    id: number;
    name: string;
  };
}

export interface Segment {
  id: number;
  title: string;
  category: string;
  registrationFee: number;
  maxCapacity: number;
  seatsLeft: number;
  participationType?: ParticipationType;
  description?: string;
  registrations?: SegmentRegistration[];
  createdAt?: string;
}

export interface AllowedStudent {
  id: number;
  studentId: string;
  fullName: string;
  isClaimed: boolean;
}

export interface SegmentRegistration {
  id: number;
  segmentId: number;
  userId: number;
  teamOrDetails: string | null;
  paymentStatus: SegmentPaymentStatus;
  registeredAt: string;
  segment?: Segment;
  user?: {
    id: number;
    name: string;
    studentId: string | null;
    email: string;
    phone?: string | null;
  };
}

export interface TshirtBreakdownItem {
  tshirtSize: TshirtSize;
  _count: {
    _all: number;
  };
}

export interface CommitteeBudgetItem {
  id: number;
  name: string;
  description: string | null;
  allocatedBudget: number;
  totalSpent: number;
  remainingBudget: number;
  _count?: {
    members: number;
    expenses: number;
  };
  members?: CommitteeMember[];
  expenses?: Expense[];
}

export interface AnalyticsSummary {
  totalStudents: number;
  totalPaidStudents: number;
  totalKitsDelivered: number;
  totalCollectedByCRs: number;
  totalVerifiedByConvenor: number;
  totalPendingHandover: number;
  totalInflows: number;
  totalContestRevenue?: number;
  totalAllocatedBudget: number;
  totalExpenses: number;
  availableBalance: number;
  tshirtBreakdown: TshirtBreakdownItem[];
  paidTshirtBreakdown?: TshirtBreakdownItem[];
  deliveredTshirtBreakdown?: TshirtBreakdownItem[];
}

export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
}
