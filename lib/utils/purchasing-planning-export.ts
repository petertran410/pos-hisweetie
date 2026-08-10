/**
 * Xuất Excel cho bảng "Dự kiến đặt hàng".
 *
 * Chỉ lo việc chuyển `ColumnConfig` + danh sách item thành file .xlsx.
 * KHÔNG gọi API, KHÔNG chứa business logic — bên gọi tự quyết định lấy dữ liệu nào.
 */
import * as XLSX from "xlsx";
import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";

/** Giá trị một ô trong file xuất */
type Cell = string | number | Date | null;

/**
 * Cột đủ điều kiện xuất Excel.
 *
 * Cột không khai báo `exportValue` được coi là chỉ phục vụ thao tác UI
 * (checkbox, nút hành động…) nên bị loại khỏi file xuất.
 */
export function getExportableColumns<T>(
  columns: ColumnConfig<T>[]
): ColumnConfig<T>[] {
  return columns.filter((c) => typeof c.exportValue === "function");
}

/**
 * Dựng ma trận [header, ...rows] để đưa vào `XLSX.utils.aoa_to_sheet`.
 *
 * Thứ tự cột giữ đúng thứ tự mảng `columns` truyền vào.
 * Giá trị `undefined` được quy về `null` để ô trong Excel là ô trống,
 * thay vì in ra chữ "undefined".
 */
export function buildExportRows<T>(
  items: T[],
  columns: ColumnConfig<T>[]
): { headers: string[]; rows: Cell[][] } {
  const headers = columns.map((c) => c.label);

  const rows = items.map((item) =>
    columns.map<Cell>((col) => {
      try {
        const v = col.exportValue?.(item);
        return v === undefined ? null : v;
      } catch {
        // Một cột lỗi không được làm hỏng cả file
        return null;
      }
    })
  );

  return { headers, rows };
}

/** Tên file dạng `Du-kien-dat-hang_2026-08-08_1530.xlsx` */
export function buildExportFileName(prefix = "Du-kien-dat-hang"): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}`;
  return `${prefix}_${stamp}.xlsx`;
}

/**
 * Tạo và tải file Excel.
 *
 * @returns số dòng đã ghi (chưa tính header)
 */
export function exportRecommendationsToExcel<T>(
  items: T[],
  columns: ColumnConfig<T>[],
  fileName = buildExportFileName()
): number {
  const { headers, rows } = buildExportRows(items, columns);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], {
    // Giữ Date là kiểu ngày của Excel thay vì chuỗi
    cellDates: true,
  });

  // Ước lượng độ rộng cột từ `width` của bảng (đơn vị px) để file dễ đọc.
  ws["!cols"] = columns.map((c) => {
    const px = parseInt(c.width ?? "100", 10);
    const wch = Number.isNaN(px) ? 14 : Math.round(px / 7);
    return { wch: Math.min(45, Math.max(10, wch)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dự kiến đặt hàng");
  XLSX.writeFile(wb, fileName);

  return rows.length;
}
