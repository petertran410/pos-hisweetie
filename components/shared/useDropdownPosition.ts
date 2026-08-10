import { useState, useLayoutEffect, useCallback } from "react";
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
 * khoảng trống viewport. Render qua portal nên không bị container overflow cắt
 * và hoạt động chính xác ở mọi mức zoom.
 */
export function useDropdownPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  panelMaxH: number,
): DropdownPosition | null {
  const [pos, setPos] = useState<DropdownPosition | null>(null);

  const compute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    // Toạ độ đã bù `zoom` toàn cục → dùng trực tiếp cho panel position:fixed.
    const rect = getFixedRect(el);
    const vh = getFixedViewport(rect.zoom).height;
    const GAP = 4;
    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const dropUp = spaceBelow < panelMaxH && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      panelMaxH,
      Math.max(140, dropUp ? spaceAbove : spaceBelow),
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
