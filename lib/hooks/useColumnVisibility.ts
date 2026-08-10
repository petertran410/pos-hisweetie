"use client";

import { useState, useEffect, useCallback } from "react";

export interface ColumnConfig<T, Ctx = unknown> {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (item: T, ctx?: Ctx) => React.ReactNode;
  /**
   * Giá trị thô để xuất Excel. Nếu bỏ trống, cột được coi là chỉ phục vụ thao
   * tác UI (checkbox, nút hành động…) và sẽ không xuất hiện trong file xuất.
   * Trả về giá trị nguyên bản (số, ngày) để Excel giữ đúng kiểu dữ liệu.
   */
  exportValue?: (item: T, ctx?: Ctx) => string | number | Date | null;
  /** Giải thích ngắn hiển thị khi rê chuột vào tiêu đề cột */
  tooltip?: string;
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
          const parsed: unknown = JSON.parse(saved);
          const savedColumns = Array.isArray(parsed) ? parsed : [];
          return defaults.map((col) => ({
            ...col,
            visible: (() => {
              const savedColumn = savedColumns.find(
                (s): s is { key: string; visible: boolean } =>
                  !!s &&
                  typeof s === "object" &&
                  "key" in s &&
                  "visible" in s &&
                  typeof s.key === "string" &&
                  typeof s.visible === "boolean" &&
                  s.key === col.key
              );
              return savedColumn?.visible ?? col.visible;
            })(),
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
      try {
        // Chỉ lưu key + visible để tránh serialize hàm render.
        const toSave = columns.map((c) => ({ key: c.key, visible: c.visible }));
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch {
        // localStorage đầy hoặc bị chặn — vẫn dùng được trong phiên hiện tại.
      }
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
