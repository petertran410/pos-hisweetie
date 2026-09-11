import { apiClient, API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import type {
  ProductQualityTicket,
  ProductQualityFilters,
  ProductQualitySummary,
  ProductQualityRoutingConfig,
  ProductQualityDepartmentMember,
  ProductQualityAttachment,
} from "../types/product-quality";

export interface CreateProductQualityPayload {
  branchId?: number;
  customerId?: number;
  customerName: string;
  customerCode?: string;
  productId?: number;
  productName: string;
  productCode?: string;
  unit?: string;
  sourceType?: string;
  quantity: number;
  expiryDate?: string;
  reason?: string;
  initialClassification: string;
  feedbackType: string;
  severity?: string;
  responsibilities?: string[];
  factoryName?: string;
  factoryId?: number;
  note?: string;
  invoiceId?: number;
  invoiceCode?: string;
  decisionMakerId?: number;
  decisionMakerName?: string;
  handlingDirection?: string;
  assignedDepartments?: string[];
  attachments?: Array<{
    filename: string;
    url: string;
    originalName?: string;
    mimetype?: string;
    size?: number;
    kind?: string;
    department?: string;
  }>;
}

export interface AssignProductQualityPayload {
  decisionMakerId?: number;
  handlingDirection?: string;
  assignedDepartments?: string[];
  severity?: string;
  responsibilities?: string[];
  factoryName?: string;
  factoryId?: number;
  outboundInvoiceId?: number;
  outboundInvoiceCode?: string;
}

export interface UpdateProductQualityTaskPayload {
  feedback?: string;
  isCompleted?: boolean;
  assignedUserId?: number;
  attachments?: Array<{
    filename: string;
    url: string;
    originalName?: string;
    mimetype?: string;
    size?: number;
    kind?: string;
  }>;
}

export interface QualityImportPreviewRow {
  row: number;
  legacyCode?: string;
  sourceRecordId?: string;
  customerName: string;
  customerCode?: string;
  customerId?: number;
  productName: string;
  productCode?: string;
  productId?: number;
  quantity: number;
  unit?: string;
  sourceType?: string;
  reason: string;
  initialClassification: string;
  feedbackType: string;
  severity?: string;
  decisionMakerName?: string;
  decisionMakerId?: number;
  branchName?: string;
  branchId?: number;
  invoiceCode?: string;
  invoiceId?: number;
  handlingDirection?: string;
  assignedDepartments: string[];
  status: string;
  action: "create" | "update" | "error";
  errors: string[];
}

export interface QualityImportPreviewResult {
  total: number;
  valid: number;
  invalid: number;
  create: number;
  update: number;
  matchedCustomers: number;
  matchedProducts: number;
  matchedInvoices: number;
  rows: QualityImportPreviewRow[];
}

export interface QualityImportCommitResult {
  total: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  matchedCustomers: number;
  matchedProducts: number;
  matchedInvoices: number;
}

export const productQualityApi = {
  getAll: (params?: ProductQualityFilters) =>
    apiClient.get<{
      data: ProductQualityTicket[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>("/product-quality-tickets", params),

  getSummary: (params?: ProductQualityFilters) =>
    apiClient.get<ProductQualitySummary>(
      "/product-quality-tickets/summary",
      params
    ),

  getById: (id: number) =>
    apiClient.get<ProductQualityTicket>(`/product-quality-tickets/${id}`),

  create: (data: CreateProductQualityPayload) =>
    apiClient.post<ProductQualityTicket>("/product-quality-tickets", data),

  update: (id: number, data: Partial<CreateProductQualityPayload> & { status?: string }) =>
    apiClient.put<ProductQualityTicket>(`/product-quality-tickets/${id}`, data),

  assign: (id: number, data: AssignProductQualityPayload) =>
    apiClient.post<ProductQualityTicket>(
      `/product-quality-tickets/${id}/assign`,
      data
    ),

  updateTask: (
    id: number,
    department: string,
    data: UpdateProductQualityTaskPayload
  ) =>
    apiClient.post<ProductQualityTicket>(
      `/product-quality-tickets/${id}/tasks/${encodeURIComponent(department)}`,
      data
    ),

  close: (id: number, reason: string) =>
    apiClient.post<ProductQualityTicket>(
      `/product-quality-tickets/${id}/close`,
      { reason }
    ),

  delete: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/product-quality-tickets/${id}`
    ),

  getRoutingConfigs: () =>
    apiClient.get<ProductQualityRoutingConfig[]>(
      "/product-quality-tickets/routing-configs"
    ),

  upsertRoutingConfig: (data: {
    initialClassification: string;
    branchId?: number;
    decisionMakerId: number;
    fallbackToCreator?: boolean;
  }) =>
    apiClient.post<ProductQualityRoutingConfig>(
      "/product-quality-tickets/routing-configs",
      data
    ),

  getDepartmentMembers: (branchId?: number) =>
    apiClient.get<ProductQualityDepartmentMember[]>(
      "/product-quality-tickets/department-members",
      branchId ? { branchId } : undefined
    ),

  upsertDepartmentMember: (data: {
    department: string;
    branchId?: number;
    userId: number;
    isPrimary?: boolean;
  }) =>
    apiClient.post<ProductQualityDepartmentMember>(
      "/product-quality-tickets/department-members",
      data
    ),

  deleteDepartmentMember: (id: number) =>
    apiClient.delete<{ success: boolean }>(
      `/product-quality-tickets/department-members/${id}`
    ),

  importTemplateUrl: "/product-quality-tickets/import/template",

  downloadTemplate: async () => {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_URL}/product-quality-tickets/import/template`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Không thể tải file mẫu");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ChatLuongHangHoa_MauImport.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  },

  importPreview: async (file: File): Promise<QualityImportPreviewResult> => {
    const token = useAuthStore.getState().token;
    const branchId = useBranchStore.getState().selectedBranch?.id;
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (branchId) headers["x-branch-id"] = String(branchId);

    const res = await fetch(`${API_URL}/product-quality-tickets/import/preview`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Kiểm tra file thất bại");
    }
    return res.json();
  },

  importCommit: async (file: File): Promise<QualityImportCommitResult> => {
    const token = useAuthStore.getState().token;
    const branchId = useBranchStore.getState().selectedBranch?.id;
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (branchId) headers["x-branch-id"] = String(branchId);

    const res = await fetch(`${API_URL}/product-quality-tickets/import`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Import dữ liệu thất bại");
    }
    return res.json();
  },

  importFromLark: (data: {
    baseToken?: string;
    tableId?: string;
    dryRun?: boolean;
    limit?: number;
  }) =>
    apiClient.post<{
      totalFetched: number;
      matchedCustomers: number;
      matchedProducts: number;
      matchedInvoices: number;
      importedCount: number;
      skippedCount: number;
      dryRun: boolean;
      sample: any[];
    }>("/product-quality-tickets/import/lark", data),

  /** Tải file ảnh hoặc video lên backend subfolder product-quality */
  uploadFiles: async (
    files: File[],
    kind: "PROOF_IMAGE" | "PROOF_VIDEO" | "COMPLETION_PROOF" = "PROOF_IMAGE",
    department?: string
  ): Promise<{
    items: Array<{
      filename: string;
      url: string;
      originalName?: string;
      mimetype?: string;
      size?: number;
      kind: string;
      department?: string;
    }>;
    errors: Array<{ originalname: string; reason: string }>;
  }> => {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch(
      `${API_URL}/upload/files?subfolder=product-quality`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!res.ok) throw new Error("Upload file thất bại");
    const result = await res.json();
    const items = (result.items || []).map((it: any) => ({
      ...it,
      kind,
      department,
    }));
    return { items, errors: result.errors || [] };
  },
};
