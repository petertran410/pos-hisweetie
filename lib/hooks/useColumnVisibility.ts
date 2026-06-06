"use client";

import { useState, useEffect, useCallback } from "react";

export interface ColumnConfig<T, Ctx = unknown> {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (item: T, ctx?: Ctx) => React.ReactNode;
}

/**
 * Quản lý trạng thái ẩn/hiện cột của bảng, đồng bộ với localStorage.
 *
 * Dùng chiến lược merge-on-init: lấy danh sách cột (label/width/render) từ
 * `defaults`, chỉ khôi phục `visible` theo `key` từ bản đã lưu. Nhờ vậy khi
 * thêm/bớt/đổi cột trong code, cấu hình cũ trong localStorage vẫn an toàn.
 */
export function useColumnVisibility<T, Ctx = unknown>(
  storageKey: string,
  defaults: ColumnConfig<T, Ctx>[]
) {
  const [columns, setColumns] = useState<ColumnConfig<T, Ctx>[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return defaults.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: { key: string }) => s.key === col.key)
                ?.visible ?? col.visible,
          }));
        } catch {
          return defaults;
        }
      }
    }
    return defaults;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Chỉ lưu key + visible để tránh serialize hàm render.
      const toSave = columns.map((c) => ({ key: c.key, visible: c.visible }));
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    }
  }, [storageKey, columns]);

  const toggleColumn = useCallback((key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  }, []);

  const visibleColumns = columns.filter((col) => col.visible);

  return { columns, setColumns, visibleColumns, toggleColumn };
}
