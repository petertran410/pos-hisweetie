import { apiClient } from "@/lib/config/api";
import type {
  ChatChannel,
  ChatContext,
  ChatMessagesPage,
  OutgoingAttachment,
  RecentChat,
  SendBody,
  ZaloProfile,
  SharedGroupsResult,
  ZaloContact,
  ZaloContactKind,
} from "@/lib/types/smaxChat";

const base = (customerId: number) => `/smax/chat/customers/${customerId}`;

export const smaxChatApi = {
  getThreadMessages: (pagePid: string, tid: string, before?: string): Promise<ChatMessagesPage> =>
    apiClient.get("/smax/chat/threads/messages", { pagePid, tid, before }),

  getThreadProfile: (pagePid: string, tid: string, isGroup: boolean): Promise<ZaloProfile> =>
    apiClient.get("/smax/chat/threads/profile", { pagePid, tid, isGroup: String(isGroup) }),

  sendToThread: (body: SendBody & { pagePid: string; tid: string; isGroup?: boolean }) =>
    apiClient.post("/smax/chat/threads/messages", body, 120_000),

  // reaction NONE = thu hồi cảm xúc của mình
  react: (body: { pagePid: string; tid: string; pid: string; reaction: string; confirmed?: boolean }) =>
    apiClient.post("/smax/chat/threads/reaction", body),

  getChannels: (): Promise<ChatChannel[]> => apiClient.get("/smax/chat/channels"),

  getRecent: (pagePid?: string): Promise<{ items: RecentChat[] }> =>
    apiClient.get("/smax/chat/recent", { pagePid }),

  getZaloProfile: (customerId: number, pagePid: string, contactId: number): Promise<ZaloProfile> =>
    apiClient.get(`${base(customerId)}/zalo-profile`, { pagePid, contactId }),

  friendAction: (
    customerId: number,
    body: { pagePid: string; contactId: number; action: "request" | "accept" | "undo"; message?: string }
  ): Promise<{ ok: boolean; friend: ZaloProfile["friend"] }> =>
    apiClient.post(`${base(customerId)}/friend`, body),

  getContext: (customerId: number): Promise<ChatContext> =>
    apiClient.get(`${base(customerId)}/context`),

  getMessages: (
    customerId: number,
    params: { pagePid: string; contactId: number; before?: string }
  ): Promise<ChatMessagesPage> =>
    apiClient.get(`${base(customerId)}/messages`, params),

  send: (
    customerId: number,
    body: {
      pagePid: string;
      contactId: number;
      text?: string;
      attachments?: Pick<OutgoingAttachment, "path" | "kind" | "name">[];
      qrImageUrl?: string;
      productImageIds?: number[];
      stickerId?: string;
      replyToPid?: string;
      forwardMedia?: { url: string; kind: "image" | "file" }[];
      confirmed?: boolean;
    }
  ) => apiClient.post(`${base(customerId)}/messages`, body, 120_000),

  getPaymentInfo: (
    customerId: number
  ): Promise<{
    bank: { bankName: string; accountNumber: string; accountHolder: string } | null;
    amount: number | null;
    qrUrl: string | null;
  }> => apiClient.get(`${base(customerId)}/payment-info`),

  uploadAttachment: (file: File): Promise<OutgoingAttachment[]> => {
    const form = new FormData();
    form.append("files", file);
    return apiClient.postForm("/smax/chat/attachments", form);
  },

  scanSharedGroups: (
    customerId: number,
    pagePid: string,
    refresh = false
  ): Promise<SharedGroupsResult> =>
    apiClient.get(`${base(customerId)}/shared-groups`, {
      pagePid,
      refresh: refresh ? "true" : undefined,
    }),

  createContact: (
    customerId: number,
    body: { kind: ZaloContactKind; zaloId: string; name?: string }
  ): Promise<ZaloContact> => apiClient.post(`${base(customerId)}/contacts`, body),

  updateContact: (customerId: number, contactId: number, body: { name?: string }) =>
    apiClient.patch(`${base(customerId)}/contacts/${contactId}`, body),

  deleteContact: (customerId: number, contactId: number) =>
    apiClient.delete(`${base(customerId)}/contacts/${contactId}`),

  lookupByPhone: (
    pagePid: string,
    phone: string
  ): Promise<{ friend: { uid: string; name: string } | null }> =>
    apiClient.get("/smax/chat/zalo-lookup", { pagePid, phone }),
};
