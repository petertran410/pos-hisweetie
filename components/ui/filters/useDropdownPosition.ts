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
    // Toạ độ đã bù `zoom` toàn cục → dùng trực tiếp cho panel position:fixed.
    const rect = getFixedRect(el);
    const { width: vw, height: vh } = getFixedViewport(rect.zoom);
    const GAP = 4;
    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const dropUp = spaceBelow < panelMaxH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      panelMaxH,
      Math.max(140, dropUp ? spaceAbove : spaceBelow)
    );
    const width = Math.min(
      Math.max(rect.width, preferredWidth || rect.width),
      vw - GAP * 2,
    );
    const left = Math.min(
      Math.max(GAP, rect.left),
      vw - width - GAP,
    );
    setPos({
      left,
      width,
      maxHeight,
      dropUp,
      top: dropUp ? rect.top - GAP : rect.bottom + GAP,
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
