"use client";

import { useCallback, useMemo } from "react";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

export interface ToggleColumn {
  key: string;
  label: string;
  /** Mặc định hiện; đặt false để cột ẩn sẵn. */
  visible?: boolean;
}

const noRender = () => null;

/**
 * Ẩn/hiện cột cho bảng viết ô thủ công (không render theo cấu hình cột):
 * dùng chung nút `ColumnToggle` và cách lưu localStorage với bảng hóa đơn.
 */
export function useColumnToggle(storageKey: string, defs: ToggleColumn[]) {
  const defaults = useMemo<ColumnConfig<unknown>[]>(
    () =>
      defs.map((def) => ({
        key: def.key,
        label: def.label,
        visible: def.visible !== false,
        render: noRender,
      })),
    [defs],
  );
  const { columns, toggleColumn } = useColumnVisibility(storageKey, defaults);
  const hidden = useMemo(
    () => new Set(columns.filter((col) => !col.visible).map((col) => col.key)),
    [columns],
  );
  const shows = useCallback((key: string) => !hidden.has(key), [hidden]);
  return { columns, toggleColumn, shows, visibleCount: columns.length - hidden.size };
}
