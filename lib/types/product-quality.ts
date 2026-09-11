export interface ProductQualityTask {
  id: number;
  ticketId: number;
  department: string;
  assignedUserId?: number | null;
  assignedUserName?: string | null;
  feedback?: string | null;
  isCompleted: boolean;
  completedById?: number | null;
  completedByName?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUser?: { id: number; name: string; email?: string } | null;
  completedByUser?: { id: number; name: string; email?: string } | null;
}

export interface ProductQualityAttachment {
  id: number;
  ticketId: number;
  department?: string | null;
  kind: "PROOF_IMAGE" | "PROOF_VIDEO" | "COMPLETION_PROOF";
  filename: string;
  originalName?: string | null;
  url: string;
  mimetype?: string | null;
  size?: number | null;
  larkFileToken?: string | null;
  createdById?: number | null;
  createdAt: string;
  creator?: { id: number; name: string } | null;
}

export interface ProductQualityTicket {
  id: number;
  code: string;
  legacyCode?: string | null;
  sourceRecordId?: string | null;
  branchId?: number | null;
  branchName?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  customerName: string;
  productId?: number | null;
  productCode?: string | null;
  productName: string;
  unit?: string | null;
  sourceType?: string | null;
  quantity: number;
  expiryDate?: string | null;
  reason?: string | null;
  initialClassification: string;
  feedbackType: string;
  severity?: string | null;
  responsibilities: string[];
  factoryName?: string | null;
  factoryId?: number | null;
  note?: string | null;
  invoiceId?: number | null;
  invoiceCode?: string | null;
  outboundInvoiceId?: number | null;
  outboundInvoiceCode?: string | null;
  decisionMakerId?: number | null;
  decisionMakerName?: string | null;
  handlingDirection?: string | null;
  assignedDepartments: string[];
  status: "NEW" | "IN_PROGRESS" | "REMEDIATING" | "COMPLETED" | "ENDED" | string;
  isCompleted: boolean;
  handledAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  closedAt?: string | null;
  closeReason?: string | null;
  closedById?: number | null;
  createdById?: number | null;
  createdByName?: string | null;
  updatedById?: number | null;
  createdAt: string;
  updatedAt: string;
  branch?: { id: number; name: string; code?: string } | null;
  customer?: { id: number; code?: string; name: string; phone?: string } | null;
  product?: { id: number; code?: string; name: string; unit?: string } | null;
  invoice?: { id: number; code: string; purchaseDate?: string; grandTotal?: number } | null;
  outboundInvoice?: { id: number; code: string; purchaseDate?: string; grandTotal?: number } | null;
  decisionMaker?: { id: number; name: string; email?: string } | null;
  creator?: { id: number; name: string; email?: string } | null;
  closer?: { id: number; name: string; email?: string } | null;
  tasks: ProductQualityTask[];
  attachments: ProductQualityAttachment[];
}

export interface ProductQualitySummary {
  total: number;
  newCount: number;
  inProgressCount: number;
  remediatingCount: number;
  completedCount: number;
  endedCount: number;
  overdueCount: number;
  departmentPending: {
    "Kinh Doanh": number;
    "Kho + Logistics": number;
    "Kế Toán Kho": number;
    "Thu Mua": number;
  };
}

export interface ProductQualityFilters {
  page?: number;
  limit?: number;
  search?: string;
  branchId?: number;
  branchIds?: number[];
  status?: string;
  statuses?: string[];
  initialClassification?: string;
  feedbackType?: string;
  severity?: string;
  department?: string;
  assignedUserId?: number;
  decisionMakerId?: number;
  createdById?: number;
  customerId?: number;
  productId?: number;
  isOverdue?: boolean;
  fromDate?: string;
  toDate?: string;
  tab?: "all" | "new" | "processing" | "overdue" | "completed" | "my" | string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

export interface ProductQualityRoutingConfig {
  id: number;
  initialClassification: string;
  branchId?: number | null;
  decisionMakerId: number;
  fallbackToCreator: boolean;
  createdAt: string;
  updatedAt: string;
  decisionMaker?: { id: number; name: string; email?: string };
  branch?: { id: number; name: string } | null;
}

export interface ProductQualityDepartmentMember {
  id: number;
  department: string;
  branchId?: number | null;
  userId: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; name: string; email?: string; phone?: string };
  branch?: { id: number; name: string } | null;
}

export const CLASSIFICATION_OPTIONS = [
  "Chất Lượng Sản Phẩm",
  "Số lượng / Chủng loại",
  "Vận chuyển / Đóng gói",
] as const;

export const FEEDBACK_TYPE_OPTIONS = [
  "Hàng Lỗi / Hỏng",
  "Hàng Sai Hạn Sử Dụng",
  "Hàng Kém Chất Lượng",
  "Hàng Giả/Nhái Nghi Ngờ",
  "Hàng Thiếu Phụ Kiện",
  "Thiếu Hàng",
  "Giao Nhầm Hàng",
  "Thừa Hàng",
  "Giao Trễ",
  "Hàng Bị Đổ / Hư Do Vận Chuyển",
  "Đóng Gói Không Kỹ",
  "Bục Rách Hàng Tàu",
] as const;

export const SEVERITY_OPTIONS = ["Cao", "Trung", "Thấp"] as const;

export const RESPONSIBILITY_OPTIONS = [
  "Nhà Cung Cấp",
  "Kho Bảo Quản",
  "Giao Vận",
  "Khách Bảo Quản",
] as const;

export const DEPARTMENT_OPTIONS = [
  "Kinh Doanh",
  "Kho + Logistics",
  "Kế Toán Kho",
  "Thu Mua",
] as const;

export const QUALITY_STATUS_CONFIG: Record<
  string,
  { label: string; badgeCls: string; borderCls: string; dotCls: string }
> = {
  NEW: {
    label: "Mới",
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
    borderCls: "border-blue-500",
    dotCls: "bg-blue-500",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    badgeCls: "bg-yellow-50 text-yellow-700 border-yellow-200",
    borderCls: "border-yellow-500",
    dotCls: "bg-yellow-500",
  },
  REMEDIATING: {
    label: "Đang khắc phục",
    badgeCls: "bg-orange-50 text-orange-700 border-orange-200",
    borderCls: "border-orange-500",
    dotCls: "bg-orange-500",
  },
  COMPLETED: {
    label: "Hoàn thành",
    badgeCls: "bg-green-50 text-green-700 border-green-200",
    borderCls: "border-green-500",
    dotCls: "bg-green-500",
  },
  ENDED: {
    label: "Đã kết thúc",
    badgeCls: "bg-gray-100 text-gray-700 border-gray-200",
    borderCls: "border-gray-400",
    dotCls: "bg-gray-400",
  },
};
