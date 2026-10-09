/**
 * Style cho file Excel "Xuất file" chi tiết (hóa đơn / đặt hàng):
 * tô nền dòng tiêu đề và đóng khung khối tổng kết tiền hàng.
 */

import * as XLSX from "xlsx-js-style";

const THIN = { style: "thin", color: { rgb: "9CA3AF" } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

const fill = (rgb: string) => ({ patternType: "solid", fgColor: { rgb } });

export function styleDetailExportSheet(
  ws: XLSX.WorkSheet,
  colCount: number,
  summaryStartRow: number,
  summaryRowCount: number
) {
  // Dòng tiêu đề cột.
  for (let c = 0; c < colCount; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (!cell) continue;
    cell.s = {
      font: { bold: true },
      fill: fill("E5E7EB"),
      border: BORDER,
      alignment: { horizontal: "center", vertical: "center" },
    };
  }

  // Khối tổng kết: nhãn ở cột áp chót, giá trị ở cột cuối.
  const labelCol = colCount - 2;
  const valueCol = colCount - 1;
  for (let i = 0; i < summaryRowCount; i++) {
    const r = summaryStartRow + i;
    const isLast = i === summaryRowCount - 1;
    const base = {
      fill: fill(isLast ? "FDE68A" : "FEF9C3"),
      border: BORDER,
    };

    const label = ws[XLSX.utils.encode_cell({ r, c: labelCol })];
    if (label) {
      label.s = {
        ...base,
        font: { bold: true, ...(isLast && { color: { rgb: "DC2626" } }) },
      };
    }

    const value = ws[XLSX.utils.encode_cell({ r, c: valueCol })];
    if (value) {
      value.s = {
        ...base,
        font: { bold: isLast, ...(isLast && { color: { rgb: "DC2626" } }) },
        alignment: { horizontal: "right" },
      };
    }
  }
}
