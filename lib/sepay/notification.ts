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
