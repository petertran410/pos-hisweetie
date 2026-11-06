"use client";

import { Download } from "lucide-react";
import type {
  DetailRow,
  DetailTable,
} from "@/lib/api/analytics-khach-hang-dlcl";
import { AnalyticsTable, type AnalyticsColumn } from "../shared/AnalyticsTable";
import { downloadCsv, numText } from "./dlclFormat";

/** Cột có thể hiện của bảng chi tiết (tableEx), theo thứ tự phần tử trong DetailRow. */
export type DetailField =
  | "date"
  | "invoiceCode"
  | "customerName"
  | "customerCode"
  | "productCode"
  | "productName"
  | "quantity"
  | "price"
  | "discount"
  | "amount"
  | "free"
  | "parentName";

const FIELD_INDEX: Record<DetailField, number> = {
  date: 0,
  invoiceCode: 1,
  customerName: 2,
  customerCode: 3,
  productCode: 4,
  productName: 5,
  quantity: 6,
  price: 7,
  discount: 8,
  amount: 9,
  free: 10,
  parentName: 11,
};

const LABEL: Record<DetailField, string> = {
  date: "Thời gian mua",
  invoiceCode: "Mã hóa đơn",
  customerName: "Tên khách",
  customerCode: "Mã khách",
  productCode: "Mã hàng",
  productName: "Tên hàng",
  quantity: "Số lượng hàng",
  price: "Đơn giá",
  discount: "Giảm giá",
  amount: "Tổng tiền hàng",
  free: "Giảm 100% hóa đơn",
  parentName: "Tên khách cha",
};

const NUMERIC = new Set<DetailField>([
  "quantity",
  "price",
  "discount",
  "amount",
]);
const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

function show(field: DetailField, v: DetailRow[number]): string {
  if (v === null || v === undefined) return "";
  if (field === "date") return fmtDate(String(v));
  if (field === "free") return v ? "Có" : "Không";
  if (NUMERIC.has(field)) return numText(Number(v));
  return String(v);
}

/** Bảng chi tiết doanh số từng dòng hàng (tableEx của Power BI), kèm tải CSV. */
export function DlclDetailTable({
  detail,
  fields,
  filename,
}: {
  detail: DetailTable;
  fields: DetailField[];
  filename: string;
}) {
  const columns: AnalyticsColumn<DetailRow>[] = fields.map((f) => ({
    key: f,
    label: LABEL[f],
    align: NUMERIC.has(f) ? "right" : "left",
    value: (r) => r[FIELD_INDEX[f]],
    format: (v) => show(f, v as DetailRow[number]),
  }));
  // Dòng Tổng (chỉ khi đã có đủ dòng): cùng dạng DetailRow, chỉ cộng số lượng & tiền.
  const sum = (f: DetailField) =>
    detail.rows.reduce((s, r) => s + Number(r[FIELD_INDEX[f]] ?? 0), 0);
  let totals: DetailRow | null = null;
  if (!detail.truncated && detail.rows.length) {
    const t = new Array(12).fill(null) as unknown[];
    t[FIELD_INDEX.quantity] = sum("quantity");
    t[FIELD_INDEX.amount] = sum("amount");
    totals = t as DetailRow;
  }

  const exportCsv = () =>
    downloadCsv(filename, [
      fields.map((f) => LABEL[f]),
      ...detail.rows.map((r) =>
        fields.map((f) => {
          const v = r[FIELD_INDEX[f]];
          if (f === "free") return v ? "Có" : "Không";
          return v as string | number | null;
        }),
      ),
    ]);

  return (
    <div className="space-y-2">
      <div
        className="flex flex-wrap items-center gap-2 text-[12.5px]"
        style={{ color: "var(--dt-text-muted)" }}>
        <span>
          {detail.truncated
            ? `Hiển thị ${detail.rows.length.toLocaleString("vi-VN")} / ${detail.count.toLocaleString("vi-VN")} dòng mới nhất — thu hẹp bộ lọc để xem hết.`
            : `${detail.count.toLocaleString("vi-VN")} dòng`}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={exportCsv}
          disabled={!detail.rows.length}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium hover:bg-gray-50 disabled:opacity-40"
          style={{
            borderColor: "var(--dt-border)",
            color: "var(--dt-text-secondary)",
          }}>
          <Download className="w-3.5 h-3.5" /> Tải CSV
        </button>
      </div>
      <AnalyticsTable
        columns={columns}
        rows={detail.rows}
        totals={totals}
        maxHeight={480}
      />
    </div>
  );
}
