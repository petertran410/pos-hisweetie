import { apiClient } from "@/lib/config/api";
import { formatCurrency } from "@/lib/utils";

/** AI soạn nháp trong ô chat Smax (`/ai/compose`, quyền smax_chat:send). Chỉ soạn, không gửi. */
export type ComposeMode = "reply" | "order" | "reminder" | "complaint" | "rewrite" | "quick" | "summary" | "classify" | "lead" | "image";
export type RewriteStyle = "polite" | "short" | "honorific" | "spelling" | "dieptra" | "lermao";

export const REWRITE_LABEL: Record<RewriteStyle, string> = {
  polite: "Lịch sự hơn",
  short: "Ngắn gọn hơn",
  honorific: "Thêm dạ / ạ",
  spelling: "Sửa chính tả",
  dieptra: "Giọng Diệp Trà",
  lermao: "Giọng LerMao",
};

export const MODE_LABEL: Record<ComposeMode, string> = {
  reply: "Gợi ý trả lời",
  order: "Xác nhận đơn hàng",
  reminder: "Nhắc thanh toán",
  complaint: "Trả lời khiếu nại",
  rewrite: "Viết lại",
  quick: "Tin nhắn nhanh phù hợp",
  summary: "Tóm tắt hội thoại",
  classify: "Phân loại hội thoại",
  lead: "Lấy thông tin khách mới",
  image: "AI đọc ảnh",
};

export type ComposeRequest = {
  mode: ComposeMode;
  pagePid: string;
  tid: string;
  customerId?: number;
  draft?: string;
  style?: RewriteStyle;
  facts?: string;
  unreadCount?: number;
  tids?: string[];
  messageId?: string;
  imageUrl?: string;
};

/** Tóm tắt tin chưa đọc: messageId để cuộn tới tin trong khung chat. */
export type SummaryResult = {
  count: number;
  overview: string;
  unanswered: { messageId: string; time: string; who: string; text: string }[];
  needs: { who: string; need: string }[];
  todo: string[];
};

export type OrderCandidate = {
  productId: number;
  code: string;
  name: string;
  unit: string | null;
  price: number | null;
  priceBookId: number | null;
  priceBookName: string | null;
  /** false: không có trong bảng giá của đơn → giá gốc. */
  inBook: boolean;
  /** Khách đã mua món này: giá theo hoá đơn gần nhất (ưu tiên hơn bảng giá). */
  lastInvoice: { code: string; date: string } | null;
  bought: boolean;
};

export type OrderLine = {
  text: string;
  quantity: number;
  unit: string | null;
  note: string | null;
  candidates: OrderCandidate[];
};

export type OrderResult = {
  customer: { id: number; code: string | null; name: string } | null;
  priceVisible: boolean;
  /** Bảng giá cho cả đơn (id null = Bảng giá chung) và lý do chọn; null khi không được xem giá. */
  priceBook: { id: number | null; name: string; source: string } | null;
  lines: OrderLine[];
  delivery: { date: string | null; address: string | null; receiver: string | null };
  note: string | null;
};

export const aiComposeApi = {
  status: (): Promise<{ enabled: boolean; limitPerDay: number; remaining: number }> =>
    apiClient.get("/ai/compose/status"),
  drafts: (body: ComposeRequest): Promise<{ drafts: string[] }> => apiClient.post("/ai/compose", body),
  order: (body: ComposeRequest): Promise<OrderResult> => apiClient.post("/ai/compose", body),
  quick: (body: ComposeRequest): Promise<{ ids: number[] }> => apiClient.post("/ai/compose", body),
  summary: (body: ComposeRequest): Promise<SummaryResult> => apiClient.post("/ai/compose", body),
  lead: (body: ComposeRequest): Promise<LeadInfo> => apiClient.post("/ai/compose", body),
  image: (body: ComposeRequest): Promise<ImageReadResult> => apiClient.post("/ai/compose", body),
};

/** Dòng đơn sau khi nhân viên chọn sản phẩm / sửa số lượng. */
export type ReviewedLine = { candidate: OrderCandidate; quantity: number };

const vnd = (n: number) => `${formatCurrency(Math.round(n))}đ`;

/** Tin xác nhận đơn: dựng từ dòng đã duyệt (giá là giá POS, không phải chữ của AI). */
export function orderConfirmText(
  lines: ReviewedLine[],
  info: { delivery: OrderResult["delivery"]; note: string | null; priceVisible: boolean },
) {
  const priced = info.priceVisible && lines.every((l) => l.candidate.price !== null);
  const out = ["Dạ em xác nhận lại đơn hàng của mình ạ:"];
  lines.forEach((l, i) => {
    const unit = l.candidate.unit ? ` ${l.candidate.unit.toLowerCase()}` : "";
    const price = priced ? ` x ${vnd(l.candidate.price!)} = ${vnd(l.candidate.price! * l.quantity)}` : "";
    out.push(`${i + 1}. ${l.candidate.name}: ${l.quantity}${unit}${price}`);
  });
  if (priced) out.push(`Tổng tiền hàng: ${vnd(lines.reduce((s, l) => s + l.candidate.price! * l.quantity, 0))}`);
  const { date, address, receiver } = info.delivery;
  if (date) out.push(`Ngày giao: ${date}`);
  if (address) out.push(`Địa chỉ giao: ${address}${receiver ? ` (${receiver})` : ""}`);
  if (info.note) out.push(`Ghi chú: ${info.note}`);
  out.push("Anh/chị kiểm tra giúp em, nếu đúng em lên đơn ngay ạ.");
  return out.join("\n");
}

/** Đơn nháp chuyển sang /ban-hang (tab Đặt hàng mới), đọc một lần rồi xoá. */
export type PosOrderDraft = {
  customerId: number | null;
  priceBookId: number | null;
  priceBookName: string | null;
  items: { productId: number; quantity: number; price: number | null }[];
  note: string;
};

export const POS_ORDER_DRAFT_KEY = "pos-ai-order-draft";

export function savePosOrderDraft(draft: PosOrderDraft) {
  sessionStorage.setItem(POS_ORDER_DRAFT_KEY, JSON.stringify(draft));
}

export function takePosOrderDraft(): PosOrderDraft | null {
  try {
    const raw = sessionStorage.getItem(POS_ORDER_DRAFT_KEY);
    sessionStorage.removeItem(POS_ORDER_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as PosOrderDraft) : null;
  } catch {
    return null;
  }
}

/** Gợi ý bán thêm (`GET /ai/compose/upsell/:customerId`, thống kê hoá đơn, không gọi AI). */
export type UpsellResult = {
  /** Khách nhận hàng qua nhà xe → đã bỏ hàng lạnh. */
  viaCoach: boolean;
  historyMonths: number;
  reorder: {
    productId: number;
    code: string;
    name: string;
    unit: string | null;
    lastDate: string;
    cycleDays: number;
    daysSince: number;
    overdueDays: number;
    times: number;
    price: number | null;
    priceSource: string | null;
  }[];
  together: {
    productId: number;
    code: string;
    name: string;
    unit: string | null;
    withName: string;
    confidence: number;
    price: number | null;
    priceSource: string | null;
  }[];
};

export const upsellApi = (customerId: number): Promise<UpsellResult> =>
  apiClient.get(`/ai/compose/upsell/${customerId}`);


/** Nhãn phân loại hội thoại (backend THREAD_LABELS). */
export type ThreadLabel = "order" | "price" | "complaint" | "delivery" | "other";
export const THREAD_LABEL_META: Record<ThreadLabel, { text: string; className: string }> = {
  order: { text: "Đặt hàng", className: "bg-green-50 text-green-700 border-green-200" },
  price: { text: "Hỏi giá", className: "bg-sky-50 text-sky-700 border-sky-200" },
  complaint: { text: "Khiếu nại", className: "bg-red-50 text-red-700 border-red-200" },
  delivery: { text: "Hỏi giao hàng", className: "bg-amber-50 text-amber-800 border-amber-200" },
  other: { text: "Khác", className: "bg-gray-50 text-gray-600 border-gray-200" },
};

export const threadLabelApi = {
  /** AI phân loại các hội thoại đang hiển thị (tối đa 30, tính 1 lượt AI). */
  classify: (pagePid: string, tids: string[]): Promise<{ labeled: number }> =>
    // Đọc 30 hội thoại từ Smax + 1 lượt AI: thường 35–50 giây, vượt mặc định 30 giây
    apiClient.post("/ai/compose", { mode: "classify", pagePid, tid: tids[0], tids }, 120_000),
  set: (pagePid: string, tid: string, label: ThreadLabel): Promise<{ ok: true }> =>
    apiClient.patch("/ai/compose/labels", { pagePid, tid, label }),
};

/** Thông tin khách mới AI đọc từ hội thoại (điền sẵn form lead). `unsure`: ô AI chưa chắc. */
export type LeadInfo = {
  name: string | null;
  category: "cafe" | "chain" | "distributor" | "training" | null;
  province: string | null;
  ward: string | null;
  need: string | null;
  unsure: ("name" | "category" | "province" | "ward" | "need")[];
};

const foldPlace = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/^(tinh|thanh pho|tp\.?|phuong|xa|thi tran|dac khu)\s+/, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Tìm tỉnh / phường theo tên AI đọc được ("TP HCM", "Hồ Chí Minh", "phường Bến Thành"). */
export function matchPlace<T extends { code: string; name: string }>(name: string | null, list: T[]): T | undefined {
  if (!name) return undefined;
  const alias: Record<string, string> = { hcm: "ho chi minh", "sai gon": "ho chi minh", hn: "ha noi" };
  let key = foldPlace(name);
  key = alias[key] ?? key;
  return (
    list.find((p) => foldPlace(p.name) === key) ??
    list.find((p) => foldPlace(p.name).includes(key) || key.includes(foldPlace(p.name)))
  );
}

/** Kết quả AI đọc ảnh khách gửi. `sepay`: giao dịch đang chờ khớp (chỉ khi có quyền xem SePay). */
export type ImageReadResult = {
  kind: "transfer" | "shipping" | "defect" | "other";
  summary: string | null;
  transfer: { amount: number | null; content: string | null; bank: string | null; time: string | null; reference: string | null } | null;
  shipping: { carrier: string | null; trackingCode: string | null; packages: string | null; note: string | null } | null;
  defect: { product: string | null; issue: string | null; note: string | null } | null;
  sepay:
    | { id: number; transactionDate: string | null; amount: number; content: string | null; reference: string | null; bank: string | null }[]
    | null;
};

/** ChatThread → ChatComposer: đọc ảnh của tin (menu "AI đọc ảnh"). */
export const AI_READ_IMAGE_EVENT = "chat-ai-read-image";
export function requestImageRead(messageId: string, imageUrl: string) {
  window.dispatchEvent(new CustomEvent(AI_READ_IMAGE_EVENT, { detail: { messageId, imageUrl } }));
}
