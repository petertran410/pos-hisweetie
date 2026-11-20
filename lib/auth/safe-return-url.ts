/**
 * Đích chuyển sau đăng nhập: chỉ đường dẫn nội bộ của POS, sai → "/".
 * Từ chối `javascript:`, `https://host`, `//host`, `/\host`, ký tự điều khiển
 * (trình duyệt bỏ tab/xuống dòng nên `/<TAB>/host` thành `//host`) và dạng dấu
 * chấm như `/.//host` (chuẩn hóa thành `//host`, router coi là host khác).
 * Cùng logic với backend `safeReturnTo` (src/auth/lark-oauth.util.ts).
 * File thuần, không import, để kiểm thử độc lập.
 */
export function safeReturnUrl(
  value: string | null | undefined,
  origin: string = typeof window === "undefined"
    ? "http://return-to.invalid"
    : window.location.origin,
): string {
  if (typeof value !== "string" || !value) return "/";
  if (!/^\/(?![/\\])/.test(value)) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return "/";
    const path = url.pathname + url.search + url.hash;
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}
