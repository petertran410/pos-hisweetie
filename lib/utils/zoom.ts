// Bù CSS `zoom` toàn cục cho các panel định vị bằng `position: fixed` + portal.
//
// Bối cảnh: `app/globals.css` đặt `html { zoom: 0.85 }`. Trong Chromium,
// `getBoundingClientRect()` trả về toạ độ ở KHÔNG GIAN VISUAL (đã nhân zoom),
// còn panel `position: fixed` lại là con của `document.body` (cũng nằm trong
// ngữ cảnh zoom) nên giá trị `top/left` ta set BỊ NHÂN zoom thêm một lần nữa
// khi render → panel lệch một lượng tỉ lệ với toạ độ (rõ nhất khi ở gần đáy
// màn hình). Chia toạ độ visual cho zoom để khi trình duyệt nhân zoom lại,
// panel rơi đúng vị trí mong muốn.
//
// Lưu ý: `window.innerWidth/innerHeight` là px visual (không đổi theo CSS zoom),
// nên khi tính toán chung với rect đã bù zoom cần chia luôn kích thước viewport
// cho zoom để mọi giá trị nằm cùng một hệ toạ độ (không gian layout đã zoom).

/**
 * Zoom hiệu dụng của phần tử (tích luỹ mọi `zoom` của tổ tiên).
 * Ưu tiên `currentCSSZoom` (Chrome 128+); fallback đọc `getComputedStyle().zoom`
 * trên `<html>`; cuối cùng trả 1 (không zoom / SSR).
 */
export function getEffectiveZoom(el?: Element | null): number {
  if (typeof window === "undefined") return 1;

  const withCurrent = el as (Element & { currentCSSZoom?: number }) | null;
  if (withCurrent && typeof withCurrent.currentCSSZoom === "number") {
    return withCurrent.currentCSSZoom || 1;
  }

  const root = document.documentElement;
  const rootZoom = parseFloat(
    getComputedStyle(root).zoom as unknown as string,
  );
  return Number.isFinite(rootZoom) && rootZoom > 0 ? rootZoom : 1;
}

export interface FixedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  /** Zoom hiệu dụng đã dùng để quy đổi (tiện cho việc chia thêm nếu cần). */
  zoom: number;
}

/**
 * Trả về rect của trigger đã quy đổi sang hệ toạ độ dùng cho `position: fixed`
 * (chia cho zoom hiệu dụng). Dùng trực tiếp cho `top/left/width` của panel fixed.
 */
export function getFixedRect(el: Element): FixedRect {
  const r = el.getBoundingClientRect();
  const zoom = getEffectiveZoom(el);
  return {
    left: r.left / zoom,
    top: r.top / zoom,
    right: r.right / zoom,
    bottom: r.bottom / zoom,
    width: r.width / zoom,
    height: r.height / zoom,
    zoom,
  };
}

/**
 * Quy đổi một DOMRect đã lưu sẵn (vd `getBoundingClientRect()` cất trong state)
 * sang hệ toạ độ dùng cho `position: fixed`. Dùng khi không còn tham chiếu tới
 * phần tử trigger (đọc zoom từ `<html>`).
 */
export function normalizeRectForFixed(
  rect: Pick<DOMRect, "left" | "top" | "right" | "bottom" | "width" | "height">,
): FixedRect {
  const zoom = getEffectiveZoom();
  return {
    left: rect.left / zoom,
    top: rect.top / zoom,
    right: rect.right / zoom,
    bottom: rect.bottom / zoom,
    width: rect.width / zoom,
    height: rect.height / zoom,
    zoom,
  };
}

/** Kích thước viewport đã quy đổi sang cùng hệ toạ độ với {@link getFixedRect}. */
export function getFixedViewport(zoom: number): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return {
    width: window.innerWidth / zoom,
    height: window.innerHeight / zoom,
  };
}
