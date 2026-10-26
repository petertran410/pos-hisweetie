export type ZaloContactKind = "user" | "group";

export interface ZaloContact {
  id: number;
  customerId: number;
  kind: ZaloContactKind;
  zaloId: string;
  name: string | null;
}

export interface ChatChannel {
  pagePid: string;
  name: string;
  platform: "zalo" | "zaloweb" | string;
  connectionError: { at: string | null; note: string | null } | null;
  // Đã liên kết nhưng kênh không còn trên Smax
  missing: boolean;
}

export interface ChatContext {
  customer: { id: number; code: string | null; name: string; phone: string | null };
  salePic: { id: number; name: string } | null;
  myChannels: ChatChannel[];
  contacts: { user: ZaloContact | null; groups: ZaloContact[] };
  // null = không có quyền xem công nợ
  debt: number | null;
  recentOrders: { id: number; code: string; date: string; total: number; status: string | null }[];
  recentInvoices: {
    id: number;
    code: string;
    date: string;
    total: number;
    debt: number;
    status: string | null;
  }[];
  confirmBeforeSend: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  type: "message" | "system";
  fromMe: boolean;
  senderPid: string | null;
  senderName: string | null;
  attachments: { url: string; thumbnail: string | null; title: string; type: string }[];
  // Ảnh/video gửi cùng lượt có chung mã (Zalo group_layout_id)
  albumId: string | null;
  // Tin sticker Zalo (ảnh lấy theo mã, xem lib/chat/stickers.ts)
  stickerId: string | null;
  createdAt: string;
}

export interface ChatMessagesPage {
  thread: { name: string; chatType: string } | null;
  // pid người gửi (khác kênh) → tên + avatar
  senders?: Record<string, { name: string | null; avatar: string | null }>;
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface SharedGroup {
  zaloId: string;
  name: string;
  memberCount: number;
  lastMessageAt: string | null;
  avatar: string | null;
  memberPreview: { name: string | null; avatar: string | null }[];
  saved: boolean;
}

export interface SharedGroupsResult {
  groups: SharedGroup[];
  scannedAt: string;
  // Smax chỉ trả tối đa 500 nhóm hoạt động gần nhất của kênh
  truncated: boolean;
}

/** Tệp đã tải lên POS, chờ gửi qua Zalo (path do backend cấp). */
export interface OutgoingAttachment {
  path: string;
  kind: "image" | "video" | "file";
  name: string;
  size: number;
  // URL xem trước trên POS
  url: string;
}

export interface ChatDraft {
  text: string;
  attachments: OutgoingAttachment[];
  // Ảnh VietQR thanh toán (tin công nợ gửi nhanh)
  qrImageUrl?: string;
  // Ảnh sản phẩm tick chọn gửi kèm (gửi id, backend tra URL)
  productImages?: { id: number; url: string; productId: number; productName: string }[];
  // Sticker Zalo — gửi thành 1 tin riêng
  stickerId?: string;
}

export interface RecentChat {
  tid: string;
  zaloId: string;
  pagePid: string;
  channelName: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: boolean;
  // linked: đã lưu ID Zalo cho khách; byCode: đoán theo mã khách trong tên nhóm
  match:
    | { type: "linked"; customer: { id: number; code: string | null; name: string }; contactId: number; kind: ZaloContactKind }
    | { type: "byCode"; customer: { id: number; code: string | null; name: string } }
    | null;
}

export interface ZaloProfile {
  kind: ZaloContactKind;
  zaloId: string;
  name: string | null;
  avatar: string | null;
  memberCount: number | null;
  // Nhóm: tối đa 4 thành viên để ghép avatar kiểu Zalo
  memberPreview: { name: string | null; avatar: string | null }[];
  // Chỉ chat trực tiếp; null nếu không tra được
  friend: { isFriend: boolean; isRequested: boolean; isRequesting: boolean } | null;
  smaxUrl: string;
}
