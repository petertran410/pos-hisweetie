import { apiClient } from "@/lib/config/api";
import type { NppAttachment } from "@/lib/types/new-product-price";
import type {
  PcApplyPreview,
  PcConfig,
  PcConfigInput,
  PcCurrentValues,
  PcDecision,
  PcEvent,
  PcListParams,
  PcListResponse,
  PcReference,
  PcSummary,
  PcTicketDetail,
  PcUpsertInput,
} from "@/lib/types/price-change";

const BASE = "/price-changes";

const csv = (v?: (string | number)[]) => (v?.length ? v.join(",") : undefined);

/** Tham số danh sách → query (mảng gửi dạng chuỗi phân cách dấu phẩy). */
function toQuery(params: PcListParams) {
  return {
    search: params.search || undefined,
    page: params.page,
    limit: params.limit,
    stages: csv(params.stages),
    statuses: csv(params.statuses),
    types: csv(params.types),
    createdByIds: csv(params.createdByIds),
    from: params.from,
    to: params.to,
    mine: params.mine ? "true" : undefined,
  };
}

export const priceChangeApi = {
  list: (params: PcListParams) =>
    apiClient.get<PcListResponse>(BASE, toQuery(params)),
  summary: (params: PcListParams) =>
    apiClient.get<PcSummary>(
      `${BASE}/summary`,
      toQuery({ ...params, stages: undefined, mine: undefined }),
    ),
  reference: () => apiClient.get<PcReference>(`${BASE}/reference`),
  currentValues: (
    productIds: number[],
    branchIds: number[],
    priceBookIds: number[],
  ) =>
    apiClient.get<PcCurrentValues[]>(`${BASE}/reference/current-values`, {
      productIds: productIds.join(","),
      branchIds: csv(branchIds),
      priceBookIds: csv(priceBookIds),
    }),
  get: (id: number) => apiClient.get<PcTicketDetail>(`${BASE}/${id}`),
  create: (body: PcUpsertInput) => apiClient.post<PcTicketDetail>(BASE, body),
  update: (id: number, body: PcUpsertInput) =>
    apiClient.patch<PcTicketDetail>(`${BASE}/${id}`, body),
  submit: (id: number) =>
    apiClient.post<PcTicketDetail>(`${BASE}/${id}/submit`),
  kttDecision: (
    id: number,
    decision: PcDecision,
    note?: string,
    end?: boolean,
  ) =>
    apiClient.post<PcTicketDetail>(`${BASE}/${id}/ktt/decision`, {
      decision,
      note,
      end,
    }),
  ceoDecision: (
    id: number,
    decision: PcDecision,
    note?: string,
    end?: boolean,
  ) =>
    apiClient.post<PcTicketDetail>(`${BASE}/${id}/ceo/decision`, {
      decision,
      note,
      end,
    }),
  sendBack: (id: number, reason: string) =>
    apiClient.post<PcTicketDetail>(`${BASE}/${id}/send-back`, { reason }),
  applyPreview: (id: number) =>
    apiClient.get<PcApplyPreview>(`${BASE}/${id}/apply-preview`),
  apply: (id: number) =>
    apiClient.post<PcTicketDetail>(`${BASE}/${id}/apply`, undefined, 180_000),
  end: (id: number, reason: string) =>
    apiClient.post<PcTicketDetail>(`${BASE}/${id}/end`, { reason }),
  comment: (id: number, content: string) =>
    apiClient.post<PcEvent[]>(`${BASE}/${id}/comments`, { content }),
  getConfig: () => apiClient.get<PcConfig>(`${BASE}/config`),
  updateConfig: (body: PcConfigInput) =>
    apiClient.put<PcConfig>(`${BASE}/config`, body),
  /** Gửi nhắc việc ngay (kể cả khi đang tắt nhắc việc hằng ngày). */
  runReminders: (stage?: string) =>
    apiClient.post<Record<string, { tickets: number; recipients: number }>>(
      `${BASE}/reminders/run${stage ? `?stage=${stage}` : ""}`,
    ),

  uploadDocuments: async (files: File[]): Promise<NppAttachment[]> => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    const res = await apiClient.postForm<{
      items: {
        url: string;
        originalname?: string;
        mimetype?: string;
        size?: number;
      }[];
      errors: { originalname: string; reason: string }[];
    }>("/upload/files?subfolder=price-change", fd);
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
