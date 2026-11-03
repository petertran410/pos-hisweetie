export type ZaloContactKind = "user" | "group";

export interface ZaloContact {
  id: number;
  customerId: number;
  kind: ZaloContactKind;
  // Zalo cá nhân: số Zalo; kênh khác (Zalo OA, Facebook, Shopee…): tid hội thoại (fb…, zl…, sp…)
  zaloId: string;
  name: string | null;
  // Kênh của hội thoại kênh khác (null = ID Zalo cá nhân, dùng với mọi kênh Zalo cá nhân)
  pagePid?: string | null;
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

// Khách POS gắn với 1 hội thoại Zalo (1 nhóm có thể gắn nhiều khách)
export interface LinkedCustomer {
  id: number;
  code: string | null;
  name: string;
  contactId: number;
}

export interface ChatContext {
  customer: { id: number; code: string | null; name: string; phone: string | null };
  salePic: { id: number; name: string } | null;
  myChannels: ChatChannel[];
  // sharedWith: khách khác cùng gắn nhóm này
  contacts: {
    user: ZaloContact | null;
    groups: (ZaloContact & { sharedWith: LinkedCustomer[] })[];
    // Hội thoại trên kênh khác Zalo cá nhân, mỗi cái gắn 1 kênh (pagePid)
    others: (ZaloContact & { sharedWith: LinkedCustomer[] })[];
  };
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
  // Tin sticker Facebook: URL ảnh sticker
  stickerImage?: string | null;
  // Tin trả lời: trích tin gốc
  quote?: { pid: string | null; text: string; senderName: string | null } | null;
  // Cảm xúc gộp theo icon (HEART, LIKE, HAHA, WOW, CRY, ANGRY…); mine = kênh của mình đã thả
  reactions?: { icon: string; count: number; mine: boolean; users: { name: string | null; avatar: string | null }[] }[];
  // Đã thu hồi (kênh hoặc khách) — vẫn có nội dung gốc
  recalled?: boolean;
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
  // zaloweb, zalo (OA), facebook, instagram, tiktokweb, shopee, custom…
  platform: string;
  // Bình luận bài viết (Facebook…), khác tin nhắn Messenger
  isComment?: boolean;
  // SĐT khách Smax thu được (Facebook…) — điền sẵn khi tạo lead
  phones?: string[];
  // Đã gắn lead (trang Lead) → hiện "Lead · tên", tránh tạo trùng
  lead?: { id: number; name: string; status: string } | null;
  // Messenger: META_AI = Meta Business AI đang trả lời; bật được khi canPassControlAI
  controlledBy?: string | null;
  canPassControlAI?: boolean;
  // Smax báo trả lời được qua API (Facebook ngoài 24h, Shopee… thường không)
  canReply: boolean;
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
    | {
        type: "linked";
        customer: { id: number; code: string | null; name: string };
        contactId: number;
        kind: ZaloContactKind;
        // Mọi khách gắn hội thoại này (khách đầu = customer)
        customers: LinkedCustomer[];
      }
    | { type: "byCode"; customer: { id: number; code: string | null; name: string } }
    // Gợi ý theo SĐT khách Smax thu được (Facebook…)
    | { type: "byPhone"; customer: { id: number; code: string | null; name: string } }
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
  platform?: string;
  // false = Smax báo không trả lời được qua API (Facebook ngoài 24h, Shopee…)
  canReply?: boolean;
  // Bình luận bài viết Facebook: link bài viết (kèm comment_id)
  isComment?: boolean;
  commentUrl?: string | null;
  // Messenger: META_AI = Meta Business AI đang trả lời; bật được khi canPassControlAI
  controlledBy?: string | null;
  canPassControlAI?: boolean;
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
  // Messenger: gửi kèm thẻ HUMAN_AGENT → lấy lại quyền trả lời từ Meta Business AI
  humanAgent?: boolean;
  confirmed?: boolean;
}

/** Hội thoại Zalo chưa gắn khách POS, mở từ "Đang chat gần đây". */
export interface LooseThread {
  pagePid: string;
  tid: string;
  zaloId: string;
  isGroup: boolean;
  name: string;
  // Nền tảng của kênh (thiếu = Zalo cá nhân, dữ liệu lưu từ trước)
  platform?: string;
  phones?: string[];
  lead?: { id: number; name: string; status: string } | null;
  // Khách đoán theo mã trong tên nhóm / SĐT — gợi ý gắn nhanh
  suggestion?: { id: number; code: string | null; name: string } | null;
}
