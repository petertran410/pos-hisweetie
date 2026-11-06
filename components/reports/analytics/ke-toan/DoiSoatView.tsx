"use client";

import { useMemo, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import type {
  CashFilters,
  CashSlipRow,
  InvoiceCodRow,
  ReconcileRow,
} from "@/lib/api/analytics-ke-toan";
import { useDoiSoat } from "@/lib/hooks/useAnalyticsKeToan";
import {
  BranchDateFilter,
  ExportButton,
  exportSheets,
  fmtDate,
  fmtInt,
  LoadState,
  PagedTable,
  textOrBlank,
  UpdatedAt,
  type KeToanColumn,
} from "./KeToanShared";

/** Dòng hiển thị của pivot: dòng khách, dòng "Tổng" của ngày, dòng "Tổng Cộng". */
interface PivotLine extends ReconcileRow {
  kind: "row" | "sub" | "grand";
  firstOfDate: boolean;
}

const SUB_BG = "#F3F8F9";

const PIVOT_COLUMNS: KeToanColumn<PivotLine>[] = [
  {
    key: "date",
    label: "Ngày Báo Đơn",
    format: (v, r) =>
      r.kind === "grand"
        ? "Tổng Cộng"
        : r.kind === "sub"
          ? "Tổng"
          : r.firstOfDate
            ? fmtDate(v)
            : "",
    background: (_, r) => (r.kind === "sub" ? SUB_BG : undefined),
    exportValue: (r) => (r.kind === "grand" ? "Tổng Cộng" : fmtDate(r.date)),
  },
  {
    key: "customerName",
    label: "Tên Khách",
    format: (v, r) => (r.kind === "row" ? textOrBlank(v) : ""),
    background: (_, r) => (r.kind === "sub" ? SUB_BG : undefined),
    exportValue: (r) => (r.kind === "row" ? textOrBlank(r.customerName) : ""),
  },
  {
    key: "delivered",
    label: "Giao Hàng COD",
    align: "right",
    format: (v, r) => (r.kind === "sub" ? <b>{fmtInt(v)}</b> : fmtInt(v)),
    background: (_, r) => (r.kind === "sub" ? SUB_BG : undefined),
  },
  {
    key: "invoiceCod",
    label: "Hóa Đơn COD",
    align: "right",
    format: (v, r) => (r.kind === "sub" ? <b>{fmtInt(v)}</b> : fmtInt(v)),
    background: (_, r) => (r.kind === "sub" ? SUB_BG : undefined),
  },
];

const PACKING_COLUMNS: KeToanColumn<CashSlipRow>[] = [
  {
    key: "date",
    label: "Ngày Báo Đơn",
    sortable: true,
    format: (v) => (v ? fmtDate(v) : ""),
    exportValue: (r) => (r.code ? fmtDate(r.date) : "Tổng"),
  },
  { key: "code", label: "Mã Báo Đơn", sortable: true },
  {
    key: "customerName",
    label: "Tên Khách",
    sortable: true,
    format: (v, r) => (r.code ? textOrBlank(v) : ""),
  },
  {
    key: "amount",
    label: "Giao Hàng COD",
    align: "right",
    sortable: true,
    format: fmtInt,
  },
];

const INVOICE_COLUMNS: KeToanColumn<InvoiceCodRow>[] = [
  {
    key: "date",
    label: "Ngày Báo Đơn",
    sortable: true,
    format: (v, r) => (r.code ? fmtDate(v) : ""),
    exportValue: (r) => (r.code ? fmtDate(r.date) : "Tổng"),
  },
  {
    key: "code",
    label: "Mã Hóa Đơn",
    sortable: true,
    format: (v, r) =>
      r.cancelled ? (
        <span title="Hoá đơn đã huỷ — Power BI gộp vào dòng trống">
          {String(v)} <span className="text-[11px] text-red-500">(đã huỷ)</span>
        </span>
      ) : (
        String(v ?? "")
      ),
    exportValue: (r) => (r.cancelled ? `${r.code} (đã huỷ)` : r.code),
  },
  {
    key: "customerName",
    label: "Tên Khách",
    sortable: true,
    format: (v, r) => (r.code ? textOrBlank(v) : ""),
  },
  {
    key: "amount",
    label: "Hóa Đơn COD",
    align: "right",
    sortable: true,
    format: fmtInt,
  },
];

/**
 * Phân tích › Kế Toán › Đối Soát — so tiền COD thu khi giao hàng (phiếu báo đơn)
 * với tiền mặt ghi trên hoá đơn, theo Ngày Báo Đơn × Tên Khách; kèm 2 bảng chi tiết.
 */
export function DoiSoatView() {
  const [filters, setFilters] = useState<CashFilters>({});
  const { data, isLoading, isFetching, error } = useDoiSoat(filters);

  const pivot = useMemo(() => {
    const out: PivotLine[] = [];
    const src = data?.pivot ?? [];
    let i = 0;
    while (i < src.length) {
      const d = src[i].date;
      let delivered: number | null = null;
      let invoiceCod: number | null = null;
      let first = true;
      while (i < src.length && src[i].date === d) {
        const r = src[i];
        out.push({ ...r, kind: "row", firstOfDate: first });
        first = false;
        if (r.delivered !== null) delivered = (delivered ?? 0) + r.delivered;
        if (r.invoiceCod !== null)
          invoiceCod = (invoiceCod ?? 0) + r.invoiceCod;
        i++;
      }
      out.push({
        date: d,
        customerName: null,
        delivered,
        invoiceCod,
        kind: "sub",
        firstOfDate: false,
      });
    }
    return out;
  }, [data]);

  const grand: PivotLine | null = data
    ? {
        date: null,
        customerName: null,
        delivered: data.totals.delivered,
        invoiceCod: data.totals.invoiceCod,
        kind: "grand",
        firstOfDate: false,
      }
    : null;
  const packingTotal: CashSlipRow | null = data?.packing.length
    ? {
        date: "",
        code: "",
        customerName: null,
        branch: null,
        amount: data.totals.delivered ?? 0,
      }
    : null;
  const invoiceTotal: InvoiceCodRow | null = data?.invoices.length
    ? {
        date: null,
        code: "",
        customerName: null,
        branch: null,
        amount: data.totals.invoiceCod ?? 0,
        cancelled: false,
      }
    : null;

  return (
    <>
      <BranchDateFilter
        branches={data?.branches ?? []}
        branch={filters.branch}
        from={filters.from}
        to={filters.to}
        onChange={setFilters}
        right={
          <div className="flex items-center gap-2">
            {isFetching && (
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "var(--dt-text-muted)" }}
              />
            )}
            {data && (
              <ExportButton
                onExport={() =>
                  exportSheets("Doi-Soat-COD", [
                    {
                      name: "Đối soát",
                      columns: PIVOT_COLUMNS,
                      rows: pivot.filter((r) => r.kind === "row"),
                      totals: grand,
                    },
                    {
                      name: "Giao Hàng COD",
                      columns: PACKING_COLUMNS,
                      rows: data.packing,
                      totals: packingTotal,
                    },
                    {
                      name: "Hóa Đơn COD",
                      columns: INVOICE_COLUMNS,
                      rows: data.invoices,
                      totals: invoiceTotal,
                    },
                  ])
                }
              />
            )}
          </div>
        }
      />
      <div
        className="flex items-start gap-2 text-[12.5px] px-3 py-2 rounded-lg"
        style={{ background: "#EEF5F7", color: "var(--dt-text-secondary)" }}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Ngày Báo Đơn: phía phiếu là ngày tạo phiếu báo đơn; phía hoá đơn là
          ngày phiếu báo đơn mới nhất của hoá đơn (hoá đơn chưa có phiếu nằm ở
          dòng “(Trống)”). Bộ lọc Chi Nhánh / Ngày áp cho cả hai phía.
        </span>
      </div>
      <LoadState error={error} loading={isLoading || !data}>
        {data && (
          <div className="grid gap-3 xl:grid-cols-2 items-start">
            <Panel
              title="Tiền Mặt - Kho"
              subtitle="Đối soát theo Ngày Báo Đơn × Tên Khách">
              <PagedTable
                columns={PIVOT_COLUMNS}
                rows={pivot}
                totals={pivot.length ? grand : null}
                rowKey={(r, i) => `${r.kind}|${r.date}|${r.customerName}|${i}`}
                maxHeight={900}
                pageSize={200}
              />
            </Panel>
            <div className="grid gap-3 min-w-0">
              <Panel
                title="Tiền Mặt - Kho"
                subtitle="Chi tiết phiếu báo đơn — Giao Hàng COD">
                <PagedTable
                  columns={PACKING_COLUMNS}
                  rows={data.packing}
                  totals={packingTotal}
                  rowKey={(r) => r.code}
                  maxHeight={420}
                />
              </Panel>
              <Panel
                title="Tiền Mặt - Kho"
                subtitle="Chi tiết hoá đơn — Hóa Đơn COD">
                <PagedTable
                  columns={INVOICE_COLUMNS}
                  rows={data.invoices}
                  totals={invoiceTotal}
                  rowKey={(r) => r.code}
                  maxHeight={420}
                />
              </Panel>
            </div>
          </div>
        )}
      </LoadState>
      <UpdatedAt at={data?.updatedAt} />
    </>
  );
}
