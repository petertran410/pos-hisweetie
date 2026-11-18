import { apiClient } from "@/lib/config/api";

/** Dòng cài đặt hệ thống (GET /settings trả nguyên dòng cho mọi người dùng). */
export interface SystemSettings {
  id: number;
  managerCustomerByBranch: boolean;
  allowOrderWhenOutStock: boolean;
  allowSellWhenOrderOutStock: boolean;
  allowSellWhenOutStock: boolean;
  syncKiotEnabled: boolean;
  sepayFilterByAccount: boolean;
  larkProductRetryCronEnabled: boolean;
  misaDictionaryCronEnabled: boolean;
  contractDocumensoSyncCronEnabled: boolean;
  // Thông báo Lark (/cai-dat/thong-bao-lark) — danh sách rỗng = tắt
  larkTaxCodeNotifyUserIds: number[];
  larkNewCustomerTaskUserIds: number[];
  larkNewCustomerTaskDueDays: number;
}

export type UpdateSettingsInput = Partial<Omit<SystemSettings, "id">>;

/** taxCode = tin riêng khi KH đổi mã số thuế; newCustomerTask = task Lark khi có KH mới. */
export type LarkNotifyKind = "taxCode" | "newCustomerTask";

/** Người dùng đang hoạt động đã gắn Lark ID — chọn làm người nhận. */
export interface LarkRecipient {
  id: number;
  name: string;
  email: string;
}

export interface LarkNotifyTestResult {
  sent: string[];
  failed: { name: string; error: string }[];
}

export const settingsApi = {
  get: (): Promise<SystemSettings> => apiClient.get("/settings"),
  update: (data: UpdateSettingsInput): Promise<SystemSettings> =>
    apiClient.put("/settings", data),
  getLarkRecipients: (): Promise<LarkRecipient[]> =>
    apiClient.get("/settings/lark-recipients"),
  testLarkNotify: (kind: LarkNotifyKind): Promise<LarkNotifyTestResult> =>
    apiClient.post("/settings/lark-notify/test", { kind }),
};
