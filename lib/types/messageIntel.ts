/** Message Intelligence: AI phân loại từng tin nhắn Smax (backend src/message-intel, taxonomy v1). */

export const INTENT_LABEL: Record<string, string> = {
  order: "Đặt hàng",
  order_change: "Điều chỉnh đơn",
  order_cancel: "Hủy đơn",
  price_inquiry: "Hỏi giá",
  stock_inquiry: "Hỏi tồn kho",
  product_inquiry: "Hỏi sản phẩm",
  recipe_inquiry: "Hỏi công thức",
  delivery_inquiry: "Hỏi giao hàng",
  payment: "Thanh toán/công nợ",
  complaint: "Khiếu nại",
  feedback: "Góp ý",
  return_refund: "Đổi trả/hoàn tiền",
  partnership: "Hợp tác/đại lý/OEM",
  acknowledgment: "Xác nhận",
  greeting: "Chào hỏi/cảm ơn",
  informational: "Cung cấp thông tin",
  other: "Khác",
  unclear: "Không đủ thông tin",
};

export const TOPIC_LABEL: Record<string, string> = {
  product: "Sản phẩm",
  product_quality: "Chất lượng",
  packaging: "Bao bì",
  pricing: "Giá bán",
  inventory: "Tồn kho",
  order: "Đơn hàng",
  delivery: "Giao hàng",
  missing_items: "Thiếu hàng",
  wrong_items: "Giao sai",
  payment: "Thanh toán",
  debt: "Công nợ",
  recipe: "Công thức",
  customer_service: "CSKH",
  competitor: "Đối thủ",
  promotion: "Khuyến mãi",
  workshop: "Workshop",
  distribution: "Đại lý/phân phối",
};

export const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Tích cực",
  neutral: "Trung tính",
  negative: "Tiêu cực",
};

export const URGENCY_LABEL = ["Không khẩn", "Bình thường", "Ưu tiên", "Khẩn cấp"];
export const PURCHASE_LABEL = ["Không có", "Thấp", "Trung bình", "Cao"];

export const SKIP_LABEL: Record<string, string> = {
  staff: "Tin nhân viên",
  order_report: "Báo đơn tự động",
  recalled: "Đã thu hồi",
  media_only: "Chỉ ảnh / tệp",
  sticker_only: "Chỉ sticker",
  empty: "Không nội dung",
  excluded: "Hội thoại loại trừ",
  system_notice: "Thông báo kết bạn / cuộc gọi",
  merged: "Đã gộp vào cụm tin",
};

export const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ phân loại",
  processing: "Đang xử lý",
  retry: "Chờ thử lại",
  completed: "Đã phân loại",
  failed: "Lỗi",
  skipped: "Bỏ qua",
};

export type IntelCount<K = string | null> = { key: K; count: number };

export type IntelOverview = {
  versionId: number;
  totals: {
    messages: number;
    eligible: number;
    completed: number;
    completedByJev: number;
    completedByRule: number;
    pending: number;
    failed: number;
    coverage: number | null;
    inputTokens: number;
    oldestPendingAt: string | null;
  };
  skipped: Record<string, number>;
  flags: { anomaly: number; escalation: number; reply: number; complaint: number };
  intents: IntelCount[];
  sentiments: IntelCount[];
  urgency: IntelCount<number | null>[];
  topics: IntelCount<string>[];
  channels: {
    pagePid: string;
    name: string;
    total: number;
    eligible: number;
    completed: number;
    pending: number;
    failed: number;
  }[];
};

export type IntelMessage = {
  id: string;
  msgPid: string;
  messageAt: string;
  channel: string;
  pagePid: string;
  tid: string;
  threadName: string | null;
  isGroup: boolean | null;
  senderName: string | null;
  text: string | null;
  /** Tin cuối cụm: số tin khách gửi liên tiếp đã gộp (text = cả cụm) */
  burstSize?: number | null;
  /** Tin đã gộp: msg_pid tin cuối cụm */
  mergedInto?: string | null;
  status: string;
  skipReason: string | null;
  source: string | null;
  lastError: string | null;
  intent: string | null;
  intentConfidence: number | null;
  topics: string[];
  sentiment: string | null;
  urgency: number | null;
  purchaseIntent: number | null;
  requiresReply: boolean | null;
  requiresEscalation: boolean | null;
  isAnomaly: boolean | null;
  contextPartial: boolean;
};

export type IntelMessagesResult = {
  total: number;
  page: number;
  limit: number;
  contentVisible: boolean;
  items: IntelMessage[];
};

export type IntelVersion = {
  id: number;
  name: string;
  model: string;
  status: "draft" | "active" | "retired";
  activatedAt: string | null;
  createdAt: string;
};

export type IntelStatus = {
  runtime: {
    paused: boolean;
    discoveryCursor: string;
    dailyTokenBudget: number;
    tokensToday: number;
    backfillStatus: "running" | "done" | null;
    backfillCursor: string;
    backfillUntilId: string;
    /** Điểm bắt đầu quét (id) khi đang chạy → tính % tiến độ */
    backfillStartId: string | null;
    backfillFrom: string | null;
    backfillTo: string | null;
    backfillPagePids: string[];
    updatedAt: string;
  };
  versions: IntelVersion[];
  /** Cảnh báo quản lý qua Lark (bật bằng MESSAGE_INTEL_ALERTS_ENABLED) */
  alerts: {
    enabled: boolean;
    chatId: string;
    /** Chưa đặt chat id trên màn hình → nhóm mặc định "Báo cáo hàng ngày Sale Chat" */
    defaultChat: boolean;
    recent: {
      id: number;
      pagePid: string;
      tid: string;
      reason: "escalation" | "complaint" | "anomaly";
      status: "sending" | "sent" | "grouped" | "recalled" | "failed";
      messageAt: string;
      createdAt: string;
      error: string | null;
    }[];
  };
  queue: Record<string, { count: number; inputTokens: number }>;
  config: {
    enabled: boolean;
    dryRun: boolean;
    pagePids: string[];
    concurrency: number;
    batch: number;
    jevConfigured: boolean;
    /** Jev dự phòng qua OpenCode Go (AI_OPENCODEGO_API_KEY) */
    jevFallbackConfigured: boolean;
  };
};

export type ReviewLabels = {
  intent: string | null;
  topics: string[];
  sentiment: string | null;
  urgency: number | null;
  purchaseIntent: number | null;
  requiresReply: boolean | null;
  requiresEscalation: boolean | null;
  isAnomaly: boolean | null;
};

export type ReviewItem = {
  msgPid: string;
  channel: string;
  threadName: string | null;
  isGroup: boolean;
  messageAt: string;
  senderName: string | null;
  text: string;
  /** Chấm cả cụm tin khách gửi liên tiếp */
  burstSize?: number | null;
  quote: string | null;
  previous: { role: "customer" | "staff" | "other_member"; senderName: string | null; at: string; text: string }[];
};

export type ReviewSummary = {
  versionId: number;
  reviewed: number;
  matched: number;
  intent: { n: number; rate: number | null };
  sentiment: { n: number; rate: number | null };
  urgency: { n: number; rate: number | null };
  requiresReply: { n: number; rate: number | null };
  isAnomaly: { n: number; rate: number | null };
  complaintRecall: { n: number; rate: number | null };
};

export type SandboxResult = {
  rule: { status: "pending" | "completed" | "skipped"; skipReason?: string };
  state: unknown;
  result: {
    labels: ReviewLabels;
    answers: Record<string, unknown>;
    model: string;
    inputTokens: number;
    latencyMs: number;
  } | null;
};

/** Hồ sơ AI của khách POS (90 ngày); enabled: false = chưa bật phân loại tin. */
export type CustomerIntelSummary =
  | { enabled: false }
  | { linked: false }
  | {
      linked: true;
      days: number;
      messages: number;
      complaints: number;
      anomalies: number;
      orders: number;
      negative: number;
      positive: number;
      highPurchaseIntent: number;
      topTopics: { key: string; n: number }[];
      lastIssue: { at: string; intent: string | null; text: string | null } | null;
      lastMessageAt: string | null;
    };

/** Hội thoại loại trừ khỏi phân loại tin (1 nhóm = hội thoại được chọn + các kênh cùng nhóm). */
export type IntelExclusion = {
  groupKey: string;
  name: string;
  createdByName: string | null;
  createdAt: string;
  threads: { pagePid: string; tid: string; name: string; channel: string }[];
};

export type IntelThreadHit = {
  pagePid: string;
  tid: string;
  name: string;
  isGroup: boolean;
  lastMessageAt: string | null;
  channel: string;
  excluded: boolean;
};

export type IntelControl =
  | { action: "create_version_v1"; name?: string; thresholds?: { yes: number; no: number; topic: number } }
  | { action: "activate"; versionId: number }
  | { action: "pause" | "resume" | "cancel_backfill" | "retry_failed" }
  | { action: "backfill"; from: string; to: string; pagePids?: string[] }
  | { action: "set_budget"; tokens: number }
  | { action: "set_alerts"; alertsEnabled?: boolean; alertChatId?: string };
