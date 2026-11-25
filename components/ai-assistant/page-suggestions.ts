import { useCallback } from "react";
import { useAuthStore } from "@/lib/store/auth";

/**
 * "Gợi ý cho trang …": câu hỏi hợp với trang POS đang mở. Mỗi câu ghi quyền cần (một trong các
 * quyền là đủ, giống điều kiện công cụ ở backend), để không ai được gợi ý câu trợ lý phải từ chối.
 */
type Prompt = { question: string; needs?: string[] };
type PageTopic = { match: (path: string) => boolean; prompts: Prompt[] };

const INVOICES = ["invoices:view"];
const ORDERS = ["orders:view"];
const CUSTOMERS = ["customers:view"];
const DEBTS = ["customers:view_debt", "debt_tracking:view"];
const STOCK = ["inventory:view", "products:view"];
const LEADS = ["leads:view"];
const QUOTES = ["quotes:view"];
const REVENUE = ["reports:sale_branch", "dashboard:view"];

const TOPICS: PageTopic[] = [
  {
    match: (path) => path.startsWith("/don-hang/hoa-don") && !path.startsWith("/don-hang/hoa-don-vat"),
    prompts: [
      { question: "Hôm nay xuất bao nhiêu hoá đơn, tổng bao nhiêu tiền?", needs: INVOICES },
      { question: "Hoá đơn nào còn nợ quá 30 ngày?", needs: INVOICES },
      { question: "Khách nào mua nhiều nhất tháng này?", needs: INVOICES },
      { question: "Có hoá đơn nào bị huỷ hôm nay không?", needs: INVOICES },
      { question: "So với tuần trước, doanh thu tuần này thế nào?", needs: REVENUE },
    ],
  },
  {
    match: (path) => path.startsWith("/don-hang/dat-hang") || path.startsWith("/ban-hang"),
    prompts: [
      { question: "Hôm nay có bao nhiêu đơn đặt hàng mới?", needs: ORDERS },
      { question: "Đơn đặt hàng nào đang chờ xử lý?", needs: ORDERS },
      { question: "Tuần này khách nào đặt nhiều đơn nhất?", needs: ORDERS },
      { question: "Mặt hàng nào sắp hết ở kho đang chọn?", needs: STOCK },
    ],
  },
  {
    match: (path) => path.startsWith("/khach-hang/theo-doi-cong-no") || path.startsWith("/khach-hang/ticket-cong-no"),
    prompts: [
      { question: "Khách nào nợ quá hạn trên 30 ngày?", needs: DEBTS },
      { question: "Tổng công nợ khách hiện tại là bao nhiêu?", needs: DEBTS },
      { question: "10 khách nợ nhiều nhất là ai?", needs: DEBTS },
    ],
  },
  {
    match: (path) => path.startsWith("/khach-hang/lead") || path === "/bao-cao/lead",
    prompts: [
      { question: "Tuần này có bao nhiêu lead mới, theo nguồn?", needs: LEADS },
      { question: "Lead nào chuyển Sale quá 2 ngày mà chưa gắn khách POS?", needs: LEADS },
      { question: "Kênh nào ra nhiều lead chuyển đổi nhất tháng này?", needs: LEADS },
      { question: "Lead nào của tôi cần chăm sóc hôm nay?", needs: LEADS },
    ],
  },
  {
    match: (path) => path.startsWith("/khach-hang/bao-gia"),
    prompts: [
      { question: "Tháng này đã gửi bao nhiêu báo giá?", needs: QUOTES },
      { question: "Báo giá nào đang chờ khách phản hồi?", needs: QUOTES },
      { question: "Báo giá nào khách đã chấp nhận tuần này?", needs: QUOTES },
    ],
  },
  {
    match: (path) => path === "/khach-hang",
    prompts: [
      { question: "Tháng này có bao nhiêu khách mới?", needs: CUSTOMERS },
      { question: "Khách nào lâu rồi chưa mua hàng?", needs: INVOICES },
      { question: "Khách nào nợ quá hạn trên 30 ngày?", needs: DEBTS },
    ],
  },
  {
    match: (path) => path.startsWith("/san-pham"),
    prompts: [
      { question: "Mặt hàng nào sắp hết ở kho đang chọn?", needs: STOCK },
      { question: "Kho đang chọn còn bao nhiêu mặt hàng dưới mức tồn tối thiểu?", needs: STOCK },
      { question: "So tồn kho giữa các kho của một mặt hàng", needs: STOCK },
    ],
  },
  {
    match: (path) => path === "/" || path.startsWith("/bao-cao"),
    prompts: [
      { question: "Hôm nay doanh thu bao nhiêu?", needs: REVENUE },
      { question: "Doanh thu tháng này đến hôm nay theo từng kho?", needs: REVENUE },
      { question: "So với tháng trước, doanh thu tháng này thế nào?", needs: REVENUE },
    ],
  },
];

const GENERAL: Prompt[] = [
  { question: "Hôm nay xuất bao nhiêu hoá đơn, tổng bao nhiêu tiền?", needs: INVOICES },
  { question: "Doanh thu tháng này đến hôm nay theo từng kho?", needs: REVENUE },
  { question: "Khách nào nợ quá hạn trên 30 ngày?", needs: DEBTS },
  { question: "Hôm nay có bao nhiêu đơn đặt hàng mới?", needs: ORDERS },
  { question: "Tuần này có bao nhiêu lead mới, theo nguồn?", needs: LEADS },
  { question: "Tháng này đã gửi bao nhiêu báo giá?", needs: QUOTES },
  { question: "Mặt hàng nào sắp hết ở kho đang chọn?", needs: STOCK },
];

/** Câu hỏi về khách đang mở trong chat Smax (server biết khách qua `chatCustomerId`). */
const CHAT_CUSTOMER: Prompt[] = [
  { question: "Khách đang chat còn nợ bao nhiêu?", needs: DEBTS },
  { question: "Đơn gần nhất của khách đang chat là gì?", needs: [...INVOICES, ...ORDERS] },
  { question: "Khách đang chat hay mua sản phẩm nào?", needs: INVOICES },
  { question: "Báo giá gần nhất gửi khách đang chat?", needs: QUOTES },
];

/**
 * Tối đa 5 câu cho trang `path` mà người xem được hỏi: có khách đang chat thì 2 câu về khách đó
 * lên đầu, rồi câu của trang, còn chỗ thì lấp bằng câu chung.
 */
export function pageSuggestions(path: string, can: (permission: string) => boolean, chatting = false): string[] {
  const allowed = (prompt: Prompt) => !prompt.needs || prompt.needs.some(can);
  const pick = (prompts: Prompt[]) => prompts.filter(allowed).map((prompt) => prompt.question);
  const customer = chatting ? pick(CHAT_CUSTOMER).slice(0, 2) : [];
  const own = pick(TOPICS.find((topic) => topic.match(path))?.prompts ?? []);
  return [...new Set([...customer, ...own, ...pick(GENERAL)])].slice(0, 5);
}

/** Kiểm quyền "resource:action" như `useCan` (Super Admin có mọi quyền), dạng hàm cho danh sách gợi ý. */
export function useHasPermission(): (permission: string) => boolean {
  const user = useAuthStore((s) => s.user);
  return useCallback(
    (permission: string) => Boolean(user && (user.roles?.includes("Super Admin") || user.permissions?.includes(permission))),
    [user]
  );
}
