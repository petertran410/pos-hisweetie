"use client";

import { useState, useCallback, useLayoutEffect } from "react";

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
  panelMaxH: number
): DropdownPosition | null {
  const [pos, setPos] = useState<DropdownPosition | null>(null);

  const compute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const GAP = 4;
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const dropUp = spaceBelow < panelMaxH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      panelMaxH,
      Math.max(140, dropUp ? spaceAbove : spaceBelow)
    );
    setPos({
      left: rect.left,
      width: rect.width,
      maxHeight,
      dropUp,
      top: dropUp ? rect.top - GAP : rect.bottom + GAP,
    });
  }, [triggerRef, panelMaxH]);

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
