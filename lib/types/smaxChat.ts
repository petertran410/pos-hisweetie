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
  // Ảnh đại diện tài khoản Zalo của kênh
  avatar: string | null;
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
  // Báo đơn Giao hàng gần đây; null = không có quyền xem
  recentPackingSlips: {
    id: number;
    code: string;
    date: string;
    packages: number;
    paymentMethod: string;
    cashAmount: number | null;
    documents: string[];
    // Hóa đơn trong báo đơn có hàng lạnh (sản phẩm cargoType COLD)
    hasColdItems: boolean;
  }[] | null;
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
  // Tin trả lời: trích tin gốc
  quote?: { pid: string | null; text: string; senderName: string | null } | null;
  // Cảm xúc gộp theo icon (HEART, LIKE, HAHA, WOW, CRY, ANGRY…); mine = kênh của mình đã thả
  reactions?: { icon: string; count: number; mine: boolean; users: { name: string | null; avatar: string | null }[] }[];
  createdAt: string;
}

export interface ChatMessagesPage {
  thread: { name: string; chatType: string } | null;
  // pid người gửi (khác kênh) → tên + avatar
  senders?: Record<string, { name: string | null; avatar: string | null }>;
  messages: ChatMessage[];
  hasMore: boolean;
  // Thả cảm xúc được không (backend đã cấu hình token Smax)
  canReact?: boolean;
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
  // Ảnh sản phẩm / Báo đơn tick chọn gửi kèm (gửi id, backend tra URL); productId = id báo đơn khi kind="packingSlip"
  productImages?: {
    id: number;
    url: string;
    productId: number;
    productName: string;
    kind?: "packingSlip";
  }[];
  // Sticker Zalo — gửi thành 1 tin riêng
  stickerId?: string;
  // Đang trả lời tin (pid + trích đoạn để hiển thị)
  replyTo?: { pid: string; preview: string; senderName: string | null; thumb?: string | null };
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
  // Tổng số tin của thread — "tin mới" = chênh lệch so với lần xem gần nhất trên POS
  messageCount: number;
  avatar: string | null;
  memberPreview: { name: string | null; avatar: string | null }[];
  smaxUrl: string;
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
  // Môi trường thử nghiệm: hỏi xác nhận trước khi gửi
  confirmBeforeSend?: boolean;
}

/** Nội dung gửi của 1 lượt (dùng chung chat theo khách và hội thoại chưa gắn khách). */
export interface SendBody {
  text?: string;
  attachments?: Pick<OutgoingAttachment, "path" | "kind" | "name">[];
  qrImageUrl?: string;
  productImageIds?: number[];
  packingSlipImageIds?: number[];
  // Gửi ảnh trước chữ (Báo đơn 1 ảnh)
  imagesFirst?: boolean;
  stickerId?: string;
  replyToPid?: string;
  // Chuyển tiếp ảnh/tệp đã có trên máy chủ Zalo
  forwardMedia?: { url: string; kind: "image" | "file" }[];
  confirmed?: boolean;
}

/** Hội thoại Zalo chưa gắn khách POS, mở từ "Đang chat gần đây". */
export interface LooseThread {
  pagePid: string;
  tid: string;
  zaloId: string;
  isGroup: boolean;
  name: string;
  // Khách đoán theo mã trong tên nhóm — gợi ý gắn nhanh
  suggestion?: { id: number; code: string | null; name: string } | null;
}
