/**
 * Xuất Excel — Module Dự kiến chuyển kho (Hà Nội → Sài Gòn)
 */

import * as XLSX from "xlsx";
import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import type { TransferPlanningItem } from "@/lib/types/transfer-planning";

type Cell = string | number | Date | null;

export function getExportableColumns<T, Ctx = unknown>(
  columns: ColumnConfig<T, Ctx>[]
): ColumnConfig<T, Ctx>[] {
  return columns.filter((c) => typeof c.exportValue === "function");
}

export function buildExportRows<T, Ctx = unknown>(
  items: T[],
  columns: ColumnConfig<T, Ctx>[]
): { headers: string[]; rows: Cell[][] } {
  const headers = columns.map((c) => c.label);

  const rows = items.map((item) =>
    columns.map<Cell>((col) => {
      try {
        const v = col.exportValue?.(item);
        return v === undefined ? null : v;
      } catch {
        return null;
      }
    })
  );

  return { headers, rows };
}

export function buildExportFileName(prefix = "Du-kien-chuyen-kho-HN-SG"): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}`;
  return `${prefix}_${stamp}.xlsx`;
}

export function exportTransferPlanningToExcel<Ctx = unknown>(
  items: TransferPlanningItem[],
  columns: ColumnConfig<TransferPlanningItem, Ctx>[],
  fileName = buildExportFileName()
): number {
  const exportCols = getExportableColumns(columns);
  const { headers, rows } = buildExportRows(items, exportCols);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], {
    cellDates: true,
  });

  // Căn chỉnh độ rộng cột
  ws["!cols"] = exportCols.map((c) => {
    const px = parseInt(c.width ?? "100", 10);
    const wch = Number.isNaN(px) ? 14 : Math.round(px / 7);
    return { wch: Math.min(45, Math.max(12, wch)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dự kiến chuyển kho");
  XLSX.writeFile(wb, fileName);

  return rows.length;
}
