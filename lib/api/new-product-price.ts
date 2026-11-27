import { apiClient } from "@/lib/config/api";
import type { MisaInventoryItem } from "@/lib/api/misa";
import type {
  NppApplyPreview,
  NppAttachment,
  NppConfig,
  NppConfigInput,
  NppDecision,
  NppEvent,
  NppImportResult,
  NppListParams,
  NppListResponse,
  NppReference,
  NppSummary,
  NppTicketDetail,
  NppUpdateInput,
} from "@/lib/types/new-product-price";

const BASE = "/new-product-prices";

/** Tham số danh sách → query (mảng gửi dạng chuỗi phân cách dấu phẩy). */
function toQuery(params: NppListParams) {
  return {
    search: params.search || undefined,
    page: params.page,
    limit: params.limit,
    stages: params.stages?.length ? params.stages.join(",") : undefined,
    statuses: params.statuses?.length ? params.statuses.join(",") : undefined,
    parentNames: params.parentNames?.length
      ? params.parentNames.join(",")
      : undefined,
    tradeMarkIds: params.tradeMarkIds?.length
      ? params.tradeMarkIds.join(",")
      : undefined,
    createdByIds: params.createdByIds?.length
      ? params.createdByIds.join(",")
      : undefined,
    from: params.from,
    to: params.to,
    mine: params.mine ? "true" : undefined,
  };
}

interface UploadItem {
  url: string;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

export const newProductPriceApi = {
  list: (params: NppListParams) =>
    apiClient.get<NppListResponse>(BASE, toQuery(params)),
  summary: (params: NppListParams) =>
    apiClient.get<NppSummary>(
      `${BASE}/summary`,
      toQuery({ ...params, stages: undefined, mine: undefined }),
    ),
  reference: () => apiClient.get<NppReference>(`${BASE}/reference`),
  customers: (search: string) =>
    apiClient.get<{ id: number; code: string | null; name: string }[]>(
      `${BASE}/reference/customers`,
      { search },
    ),
  /** Vật tư Misa cho ô "Mã Misa" (chỉ cần quyền xem trang). */
  misaItems: (search?: string) =>
    apiClient.get<MisaInventoryItem[]>(`${BASE}/reference/misa-items`, {
      search,
    }),
  get: (id: number) => apiClient.get<NppTicketDetail>(`${BASE}/${id}`),
  getByCode: (code: string) =>
    apiClient.get<NppTicketDetail>(
      `${BASE}/by-code/${encodeURIComponent(code)}`,
    ),
  create: (body: NppUpdateInput & { submit?: boolean }) =>
    apiClient.post<NppTicketDetail>(BASE, body),
  update: (id: number, body: NppUpdateInput) =>
    apiClient.patch<NppTicketDetail>(`${BASE}/${id}`, body),
  complete: (id: number) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/complete`),
  sendBack: (id: number, reason: string) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/send-back`, { reason }),
  sendKtt: (id: number) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/chief-accountant/send`),
  kttDecision: (id: number, decision: NppDecision, note?: string) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/chief-accountant/decision`, {
      decision,
      note,
    }),
  ceoDecision: (
    id: number,
    decision: NppDecision,
    note?: string,
    end?: boolean,
  ) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/ceo/decision`, {
      decision,
      note,
      end,
    }),
  applyPreview: (id: number) =>
    apiClient.get<NppApplyPreview>(`${BASE}/${id}/apply-preview`),
  apply: (id: number) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/apply`, undefined, 120_000),
  end: (id: number, reason: string) =>
    apiClient.post<NppTicketDetail>(`${BASE}/${id}/end`, { reason }),
  comment: (id: number, content: string) =>
    apiClient.post<NppEvent[]>(`${BASE}/${id}/comments`, { content }),
  getConfig: () => apiClient.get<NppConfig>(`${BASE}/config`),
  updateConfig: (body: NppConfigInput) =>
    apiClient.put<NppConfig>(`${BASE}/config`, body),
  importLark: (body: {
    dryRun: boolean;
    downloadMedia?: boolean;
    force?: boolean;
  }) => apiClient.post<NppImportResult>(`${BASE}/import/lark`, body, 600_000),
  runReminders: (stage?: string) =>
    apiClient.post<Record<string, { tickets: number; recipients: number }>>(
      `${BASE}/reminders/run${stage ? `?stage=${stage}` : ""}`,
    ),

  /** Ảnh sản phẩm → uploads/products (dùng lại được làm ảnh hàng hóa khi áp dụng). */
  uploadImages: async (files: File[]): Promise<NppAttachment[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await apiClient.postForm<{
      items: UploadItem[];
      errors: { originalname: string; reason: string }[];
    }>("/upload/images?subfolder=products", fd);
    if (res.errors?.length && !res.items?.length)
      throw new Error(res.errors[0].reason);
    // API ảnh không trả tên gốc → lấy theo thứ tự file gửi lên (bỏ file lỗi).
    const okFiles = files.filter(
      (f) => !res.errors?.some((e) => e.originalname === f.name),
    );
    return (res.items ?? []).map((i, idx) => ({
      url: i.url,
      originalName: okFiles[idx]?.name ?? null,
      mimetype: okFiles[idx]?.type ?? null,
      size: i.size ?? null,
    }));
  },

  uploadDocuments: async (files: File[]): Promise<NppAttachment[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await apiClient.postForm<{
      items: UploadItem[];
      errors: { originalname: string; reason: string }[];
    }>("/upload/files?subfolder=new-product-price", fd);
    if (res.errors?.length && !res.items?.length)
      throw new Error(res.errors[0].reason);
    return (res.items ?? []).map((i) => ({
      url: i.url,
      originalName: i.originalname ?? null,
      mimetype: i.mimetype ?? null,
      size: i.size ?? null,
    }));
  },
};
