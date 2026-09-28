import { apiClient } from "@/lib/config/api";

export type ApprovalRequestKind =
  | "EXPENSE_HN"
  | "EXPENSE_SG"
  | "EXPENSE_VP"
  | "RECEIPT";

export interface ApprovalFormItem {
  id: string;
  type: string;
  value?: unknown;
}

export interface CreateApprovalRequestPayload {
  kind: ApprovalRequestKind;
  clientUuid?: string;
  branchId?: number;
  sourceType?: string;
  sourceId?: number;
  form: ApprovalFormItem[];
}

export interface ApprovalRequest {
  id: number;
  kind: ApprovalRequestKind;
  approvalCode: string;
  instanceCode: string | null;
  instanceLink: string | null;
  clientUuid: string;
  status: string;
  currentNode: string | null;
  sourceType: string | null;
  sourceId: number | null;
  branchId: number | null;
  cashFlowId: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  taskList?: Array<{
    id?: string;
    status?: string;
    user_id?: string;
    node_name?: string;
    start_time?: string;
    end_time?: string;
  }>;
  currentNodes?: Array<{
    node_id?: string;
    node_name?: string;
    approvers?: Array<{ taskId: string | null; userId: string | null }>;
  }>;
  currentApprovers?: Array<{
    taskId: string | null;
    userId: string | null;
  }>;
  timeline?: Array<{
    type?: string;
    create_time?: string;
    comment?: string;
    user_id?: string;
    node_id?: string;
  }>;
}

export interface ApprovalRequestQuery {
  kind?: ApprovalRequestKind;
  status?: string;
  branchId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApprovalRequestsResponse {
  data: ApprovalRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface TempAdvanceOption {
  value: string;
  label: string;
  content: string;
  remaining: number;
  approved: string;
  recordId: string | null;
}

export const approvalRequestsApi = {
  getTempAdvances: (
    search?: string
  ): Promise<{ data: TempAdvanceOption[] }> =>
    apiClient.get("/approval-requests/receipt-temp-advances", {
      search: search || undefined,
    }),

  uploadFile: (
    file: File,
    type: "image" | "attachment"
  ): Promise<{ code: string; url: string; name: string; type: string }> => {
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);
    return apiClient.postForm("/approval-requests/upload-file", form);
  },

  list: (
    params?: ApprovalRequestQuery
  ): Promise<ApprovalRequestsResponse> =>
    apiClient.get("/approval-requests", params),

  create: (
    payload: CreateApprovalRequestPayload
  ): Promise<ApprovalRequest> => apiClient.post("/approval-requests", payload),

  get: (id: number): Promise<ApprovalRequest> =>
    apiClient.get(`/approval-requests/${id}`),

  linkCashFlow: (
    id: number,
    cashFlowId: number
  ): Promise<ApprovalRequest> =>
    apiClient.post(`/approval-requests/${id}/link-cashflow`, { cashFlowId }),

  postCashFlow: (id: number): Promise<{ cashFlow: unknown; alreadyPosted: boolean }> =>
    apiClient.post(`/approval-requests/${id}/post-cashflow`),
};
