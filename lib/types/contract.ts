export const CONTRACT_STATUSES = [
  "DRAFT",
  "SENT",
  "SIGNED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi",
  SIGNED: "Đã ký",
  REJECTED: "Từ chối",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};

// Màu badge theo trạng thái (tailwind classes).
export const CONTRACT_STATUS_BADGE: Record<ContractStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  SIGNED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
  CANCELLED: "bg-gray-200 text-gray-500",
};

export interface ContractCustomerRef {
  id: number;
  code: string | null;
  name: string;
  email: string | null;
}

export interface Contract {
  id: number;
  customerId: number;
  title: string;
  source: "template" | "upload";
  documensoId: string | null;
  externalId: string | null;
  templateId: number | null;
  templateTitle: string | null;
  recipientEmail: string | null;
  status: ContractStatus;
  signingUrl: string | null;
  signedFileUrl: string | null;
  rejectReason: string | null;
  sentAt: string | null;
  signedAt: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  customer?: ContractCustomerRef;
}

export interface ContractFilters {
  customerId?: number;
  status?: ContractStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ContractPrefill {
  name?: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
}

/** Field công ty cần điền của template (BE trả từ recipient ASSISTANT). */
export interface ContractTemplateField {
  fieldId: number;
  type: string;
  label: string;
}

/** Một field điền sẵn dạng id-based gửi lên BE. */
export interface PrefillFieldItem {
  fieldId: number;
  value: string;
}

export interface CreateFromTemplatePayload {
  customerId: number;
  templateId?: number;
  title?: string;
  recipientEmail?: string;
  /** Prefill động id-based (ưu tiên). */
  prefillFields?: PrefillFieldItem[];
  /** (Cũ) prefill label-based — giữ tương thích. */
  prefill?: ContractPrefill;
}

export interface ContractTemplate {
  id: number;
  title: string;
  fieldLabels: string[];
}
