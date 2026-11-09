import { apiClient } from "@/lib/config/api";

// Media tin nhắn nhanh gửi lên: tệp đã tải lên POS (bỏ url xem trước)
type QuickReplyMediaInput = { path: string; kind: "image" | "video" | "file"; name: string; size?: number };
import type {
  ChatChannel,
  ChatContext,
  ChatMessagesPage,
  LibraryAlbum,
  LibraryFile,
  OutgoingAttachment,
  QuickReply,
  QuickReplyList,
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

  // Đổi tên hội thoại Zalo cá nhân (1-1 / nhóm) trên Smax
  renameThread: (body: { pagePid: string; tid: string; name: string }): Promise<{ name: string; alias: string | null }> =>
    apiClient.patch("/smax/chat/threads/name", body),

  // Bật Meta Business AI trả lời hội thoại Messenger (tắt = gửi tin kèm humanAgent)
  passControlAI: (body: { pagePid: string; tid: string; confirmed?: boolean }) =>
    apiClient.post("/smax/chat/threads/meta-ai", body),

  // recall = thu hồi cả 2 phía; delete = xoá phía mình
  messageAction: (body: { pagePid: string; tid: string; pid: string; action: "recall" | "delete"; confirmed?: boolean }) =>
    apiClient.post("/smax/chat/threads/message-action", body),

  getChannels: (): Promise<ChatChannel[]> => apiClient.get("/smax/chat/channels"),

  // q: tìm theo tên Zalo / tên nhóm trên toàn bộ hội thoại của kênh
  // fresh: bỏ qua cache ngắn của backend (nút ⟳)
  getRecent: (pagePid?: string, limit?: number, q?: string, fresh?: boolean): Promise<{ items: RecentChat[] }> =>
    apiClient.get("/smax/chat/recent", { pagePid, limit, q, fresh: fresh ? 1 : undefined }),

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

  // Tin nhắn nhanh: chung (cần quyền smax_chat:manage_quick_replies để sửa) + riêng của mình
  quickReplies: (): Promise<QuickReplyList> => apiClient.get("/smax/chat/quick-replies"),
  createQuickReply: (body: { shared?: boolean; shortcut: string; content: string; media?: QuickReplyMediaInput[] }): Promise<QuickReply> =>
    apiClient.post("/smax/chat/quick-replies", body),
  updateQuickReply: (id: number, body: { shortcut: string; content: string; media?: QuickReplyMediaInput[] }): Promise<QuickReply> =>
    apiClient.patch(`/smax/chat/quick-replies/${id}`, body),
  deleteQuickReply: (id: number): Promise<{ ok: true }> => apiClient.delete(`/smax/chat/quick-replies/${id}`),

  // Thư viện Smax: album, tệp (phân trang theo cursor), lấy tệp đã chọn làm tệp đính kèm
  libraryAlbums: (): Promise<LibraryAlbum[]> => apiClient.get("/smax/chat/library/albums"),
  libraryFiles: (q: { albumId?: string; keyword?: string; cursor?: number }): Promise<{ files: LibraryFile[]; nextCursor: number | null }> =>
    apiClient.get("/smax/chat/library/files", {
      ...(q.albumId ? { albumId: q.albumId } : {}),
      ...(q.keyword ? { keyword: q.keyword } : {}),
      ...(q.cursor ? { cursor: String(q.cursor) } : {}),
    }),
  // Sửa Thư viện Smax (quyền smax_chat:manage_library): tải lên album đang xem, xoá hẳn trên Smax
  uploadLibraryFiles: (files: File[], albumId?: string): Promise<{ uploaded: number }> => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (albumId) form.append("albumId", albumId);
    return apiClient.postForm("/smax/chat/library/files", form);
  },
  deleteLibraryFiles: (files: Pick<LibraryFile, "id" | "name">[]): Promise<{ deleted: number }> =>
    apiClient.delete("/smax/chat/library/files", { files: files.map(({ id, name }) => ({ id, name })) }),
  importLibraryFile: (f: Pick<LibraryFile, "url" | "name" | "mime">): Promise<OutgoingAttachment[]> =>
    apiClient.post("/smax/chat/library/import", { items: [{ url: f.url, name: f.name, mime: f.mime }] }, 120_000),

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
    // zaloId: số Zalo, hoặc tid hội thoại kênh khác (fb…, zl…) kèm pagePid
    body: { kind: ZaloContactKind; zaloId: string; name?: string; pagePid?: string }
    // linkedLead: lead chưa gắn cùng ID Zalo / hội thoại → backend tự gắn vào khách
  ): Promise<ZaloContact & { linkedLead?: { id: number; code: string } | null }> =>
    apiClient.post(`${base(customerId)}/contacts`, body),

  updateContact: (customerId: number, contactId: number, body: { name?: string }) =>
    apiClient.patch(`${base(customerId)}/contacts/${contactId}`, body),

  deleteContact: (customerId: number, contactId: number) =>
    apiClient.delete(`${base(customerId)}/contacts/${contactId}`),

  lookupByPhone: (
    pagePid: string,
    phone: string
  ): Promise<{ friend: { uid: string; name: string } | null }> =>
    apiClient.get("/smax/chat/zalo-lookup", { pagePid, phone }),

  // Đặt xe giao hàng: kênh + nhóm Zalo cố định nhận tin
  deliveryBookingTarget: (): Promise<{
    channelName: string;
    groupName: string | null;
    connectionError: boolean;
    confirmBeforeSend: boolean;
  }> => apiClient.get("/smax/chat/delivery-booking"),

  // Nhân viên được chọn làm người gửi theo chi nhánh (null = mọi nhân sự)
  deliveryBookingSenders: (branchId: number): Promise<{ userIds: number[] | null }> =>
    apiClient.get("/smax/chat/delivery-booking/senders", { branchId }),

  // invoiceIds: nhiều hóa đơn gộp 1 tin đặt xe (người nhận 1, 2… theo thứ tự)
  bookDelivery: (body: {
    invoiceId?: number;
    invoiceIds?: number[];
    text: string;
    confirmed?: boolean;
  }): Promise<{ ok: true }> =>
    apiClient.post("/smax/chat/delivery-booking", body),
};
