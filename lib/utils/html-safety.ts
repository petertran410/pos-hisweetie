import DOMPurify from "dompurify";

/** Escape chữ trước khi ghép vào chuỗi HTML (ví dụ option `html` của SweetAlert). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Lọc HTML bản in / mẫu in: giữ bảng, style, ảnh (https, data:), svg; bỏ
 * script, thuộc tính on*, link javascript:. Chỉ lọc phần nội dung — khung
 * <html>/<head> do buildPrintDocumentHtml tự dựng. FORCE_BODY giữ thẻ <style>
 * đứng đầu mẫu (mặc định DOMPurify bỏ thẻ đó).
 */
export function sanitizePrintHtml(html: string | null | undefined): string {
  // Không có DOM (render phía server) thì DOMPurify trả nguyên chuỗi → không dùng.
  if (typeof window === "undefined" || !DOMPurify.isSupported) return "";
  return DOMPurify.sanitize(html ?? "", { FORCE_BODY: true });
}

/**
 * Khổ giấy đưa vào `@page { size: … }`: chỉ chữ, số, khoảng trắng, dấu chấm
 * (A4 portrait, 80mm 200mm…) để giá trị không thoát được khỏi khối CSS.
 */
export function safeCssPageSize(
  value: string | null | undefined,
  fallback = "",
): string {
  const v = String(value ?? "").trim();
  return /^[A-Za-z0-9 .]{1,40}$/.test(v) ? v : fallback;
}

/**
 * sandbox cho khung in: không có allow-scripts nên mã chèn trong bản in không
 * chạy; allow-same-origin để trang cha đo, chụp và tải font; allow-modals để
 * gọi print(). Đặt TRƯỚC khi gắn iframe vào trang.
 */
export const PRINT_FRAME_SANDBOX = "allow-same-origin allow-modals";
