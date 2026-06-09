/**
 * Dựng URL điều hướng tới đúng giao dịch trong trang Biến động số dư.
 *
 * Trang lọc theo `search` (khớp transactionContent hoặc referenceNumber ở
 * backend). Ưu tiên referenceNumber vì là mã duy nhất; fallback dùng một đoạn
 * nội dung chuyển khoản. Nếu không có gì để khớp thì về trang tổng (bỏ filter
 * status để không che mất giao dịch đã xử lý).
 */
export function buildSepayTxHref(tx: {
  referenceNumber: string | null;
  transactionContent: string | null;
}): string {
  const base = "/tai-chinh/bien-dong-so-du";
  const key = tx.referenceNumber || tx.transactionContent;
  if (key) {
    return `${base}?search=${encodeURIComponent(key)}`;
  }
  return base;
}

/**
 * Watermark "đã toast" dùng CHUNG giữa các tab qua localStorage.
 *
 * Trước đây mốc lưu bằng useRef (RAM riêng từng tab) → mở 5 tab thì cả 5 cùng
 * pop toast cho cùng một giao dịch. Lưu vào localStorage + lắng nghe sự kiện
 * `storage` giúp: tab nào toast xong thì ghi mốc, các tab khác nhận event và
 * cập nhật mốc ngay → không pop lại. Chuông/modal vẫn hiển thị đầy đủ để xem lại.
 */
export const SEPAY_TOAST_WATERMARK_KEY = "sepay-toast-last-seen";

export function readSepayToastWatermark(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SEPAY_TOAST_WATERMARK_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeSepayToastWatermark(latestId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEPAY_TOAST_WATERMARK_KEY, String(latestId));
  } catch {
    // ignore (quota/private mode)
  }
}
