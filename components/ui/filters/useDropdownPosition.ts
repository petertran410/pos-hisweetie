"use client";

import { useState, useCallback, useLayoutEffect } from "react";
import { getFixedRect, getFixedViewport } from "@/lib/utils/zoom";

export interface DropdownPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  dropUp: boolean;
}

/**
 * `html` có thể bị thu nhỏ bằng `zoom` (globals.css). getBoundingClientRect()
 * trả toạ độ visual, còn phần tử `fixed` đặt theo CSS px sẽ bị nhân với zoom
 * khi render — nên phải chia toạ độ đo được cho zoom để panel bám đúng trigger.
 */
const getDocumentZoom = () => {
  const zoom = parseFloat(
    getComputedStyle(document.documentElement).zoom || "1"
  );
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
};

/**
 * Tính toạ độ panel (position: fixed) từ nút trigger, tự lật lên/xuống theo
 * khoảng trống còn lại của viewport. Render qua portal nên không bị container
 * overflow cắt và hoạt động chính xác ở mọi mức zoom.
 *
 * - Mặc định mở xuống dưới (dropUp = false).
 * - Khi khoảng trống bên dưới không đủ chứa panel VÀ khoảng trống bên trên lớn
 *   hơn bên dưới → lật lên trên (dropUp = true).
 */
export function useDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  panelMaxH: number,
  preferredWidth?: number
): DropdownPosition | null {
  const [pos, setPos] = useState<DropdownPosition | null>(null);

  const compute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    // Đổi toạ độ visual sang CSS px (không gian của phần tử fixed dưới html zoom).
    const zoom = getDocumentZoom();
    const rect = el.getBoundingClientRect();
    const left = rect.left / zoom;
    const top = rect.top / zoom;
    const bottom = rect.bottom / zoom;
    const triggerWidth = rect.width / zoom;
    const viewportWidth = window.innerWidth / zoom;
    const viewportHeight = window.innerHeight / zoom;
    const GAP = 4;
    const spaceBelow = viewportHeight - bottom - GAP;
    const spaceAbove = top - GAP;
    const dropUp = spaceBelow < panelMaxH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      panelMaxH,
      Math.max(140, dropUp ? spaceAbove : spaceBelow)
    );
    const width = Math.min(
      Math.max(triggerWidth, preferredWidth || triggerWidth),
      viewportWidth - GAP * 2
    );
    const clampedLeft = Math.min(
      Math.max(GAP, left),
      viewportWidth - width - GAP
    );
    setPos({
      left: clampedLeft,
      width,
      maxHeight,
      dropUp,
      top: dropUp ? top - GAP : bottom + GAP,
    });
  }, [triggerRef, panelMaxH, preferredWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    compute();
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [open, compute]);

  return pos;
}
