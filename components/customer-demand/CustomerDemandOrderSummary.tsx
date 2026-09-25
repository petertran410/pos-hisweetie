"use client";

import { useMemo, useState } from "react";
import { useCustomerDemandOrderSummary } from "@/lib/hooks/useCustomerDemand";
import type { CustomerDemandFilters } from "@/lib/types/customer-demand";
import { DemandViewToggle, type DemandViewMode } from "./DemandViewToggle";
import { CustomerDemandExportMenu } from "./CustomerDemandExportMenu";
import { CustomerDemandMonthPicker } from "./CustomerDemandMonthPicker";
import { CustomerDemandSummarySearch } from "./CustomerDemandSummarySearch";
import { toDemandSummaryFilters } from "./demand-summary";
import { useDemandSummaryMonths } from "./useDemandSummaryMonths";
import {
  DemandButton,
  DemandModalShell,
  formatDemandMonth,
  formatDemandQty,
} from "./DemandUi";

interface CustomerDemandOrderSummaryProps {
  filters: CustomerDemandFilters;
  search?: string;
  onSearchChange: (value: string | undefined) => void;
  viewMode: DemandViewMode;
  onViewModeChange: (mode: DemandViewMode) => void;
  embedded?: boolean;
  canExport: boolean;
}

export function CustomerDemandOrderSummary({
  filters,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  embedded = false,
  canExport,
}: CustomerDemandOrderSummaryProps) {
  const [detail, setDetail] = useState<{
    product: { code: string; name: string; unit: string | null };
    month?: string;
    customers: Array<{ id: number; code: string | null; name: string }>;
    lines: Array<{
      demandId: number;
      demandMonthId: number;
      demandMonth: string;
      customer: { id: number; code: string | null; name: string };
      quantityBase: number;
      inputQuantity: number;
      inputUnit: string;
    }>;
  } | null>(null);
  const summaryFilters = useMemo(
    () => toDemandSummaryFilters(filters, search),
    [filters, search]
  );
  const { data, isLoading, isError } = useCustomerDemandOrderSummary(
    summaryFilters
  );
  const availableMonths = useMemo(() => data?.months ?? [], [data?.months]);
  const { visibleMonths, setPickedMonths } =
    useDemandSummaryMonths(availableMonths);
  const products = useMemo(
    () =>
      (data?.products ?? [])
        .map((row) => {
          const totalQuantityBase = visibleMonths.reduce(
            (sum, month) => sum + (row.quantities[month] ?? 0),
            0
          );
          const customers = new Set<number>();
          const hasMonthlyCustomerDetails = Boolean(row.customersByMonth);
          for (const month of visibleMonths) {
            for (const customer of hasMonthlyCustomerDetails
              ? row.customersByMonth?.[month] ?? []
              : row.customers ?? []) {
              customers.add(customer.id);
            }
          }
          return {
            ...row,
            totalQuantityBase,
            customerCount: customers.size || row.customerCount,
          };
        })
        .filter((row) => row.totalQuantityBase > 0),
    [data?.products, visibleMonths]
  );
  const totals = useMemo(() => {
    const next: Record<string, number> = {};
    for (const month of visibleMonths) {
      next[month] = products.reduce(
        (sum, row) => sum + (row.quantities[month] ?? 0),
        0
      );
    }
    return next;
  }, [visibleMonths, products]);
  const grandTotal = products.reduce(
    (sum, row) => sum + row.totalQuantityBase,
    0
  );

  return (
    <div
      className={
        embedded
          ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
          : "mr-4 mt-4 mb-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white"
      }>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
            Tổng cần đặt
          </h2>
          <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 md:inline-flex">
            {products.length.toLocaleString("vi-VN")} mã
          </span>
          {!embedded && (
            <DemandViewToggle mode={viewMode} onChange={onViewModeChange} />
          )}
          {!embedded && (
            <CustomerDemandSummarySearch
              value={search}
              onChange={onSearchChange}
              className="w-full min-w-[240px] sm:w-80"
            />
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {!embedded && (
            <CustomerDemandExportMenu
              filters={summaryFilters}
              canExport={canExport}
              groupBy="product"
            />
          )}
          <CustomerDemandMonthPicker
            months={availableMonths}
            selected={visibleMonths}
            onChange={setPickedMonths}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Đang tính tổng...
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-red-600">
            Không tính được tổng số lượng cần đặt.
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            Không có sản phẩm cần đặt trong bộ lọc này.
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Mã hàng
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Tên hàng
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Số khách
                </th>
                {visibleMonths.map((month) => (
                  <th
                    key={month}
                    className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    {formatDemandMonth(month)}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                  Tổng
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((row) => (
                <tr key={row.product.id} className="border-b hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-3 font-mono text-xs font-semibold text-brand">
                    {row.product.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {row.product.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {row.product.unit || "Đơn vị"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    <button
                      type="button"
                      onClick={() =>
                        setDetail({
                          product: row.product,
                          customers: getCustomersForMonths(row, visibleMonths),
                          lines: visibleMonths.flatMap(
                            (month) => row.detailsByMonth?.[month] ?? []
                          ),
                        })
                      }
                      className="rounded px-2 py-1 text-brand underline-offset-2 hover:bg-brand-soft hover:underline">
                      {row.customerCount.toLocaleString("vi-VN")}
                    </button>
                  </td>
                  {visibleMonths.map((month) => (
                    <td
                      key={month}
                      className="px-4 py-3 text-right font-mono text-gray-800">
                      {row.quantities[month] ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDetail({
                              product: row.product,
                              month,
                              customers:
                                row.customersByMonth?.[month] ?? [],
                              lines: row.detailsByMonth?.[month] ?? [],
                            })
                          }
                          className="rounded px-2 py-1 text-brand underline-offset-2 hover:bg-brand-soft hover:underline">
                          {formatDemandQty(row.quantities[month])}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                    {formatDemandQty(row.totalQuantityBase)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-gray-50">
              <tr>
                <td
                  colSpan={3}
                  className="sticky left-0 bg-gray-50 px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tổng
                </td>
                {visibleMonths.map((month) => (
                  <td
                    key={month}
                    className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">
                    {formatDemandQty(totals[month] ?? 0)}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">
                  {formatDemandQty(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      <DemandSummaryDetailModal
        detail={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  );
}

function DemandSummaryDetailModal({
  detail,
  onClose,
}: {
  detail: {
    product: { code: string; name: string; unit: string | null };
    month?: string;
    customers: Array<{ id: number; code: string | null; name: string }>;
    lines: Array<{
    demandId: number;
    demandMonthId: number;
    demandMonth: string;
    customer: { id: number; code: string | null; name: string };
      quantityBase: number;
      inputQuantity: number;
      inputUnit: string;
    }>;
  } | null;
  onClose: () => void;
}) {
  if (!detail) return null;
  const title = detail.month
    ? `${detail.product.code} · ${formatDemandMonth(detail.month)}`
    : `${detail.product.code} · Danh sách khách hàng`;

  return (
    <DemandModalShell
      open
      onClose={onClose}
      closeOnOverlay
      size="import"
      title={title}
      subtitle={`${detail.product.name} · Đơn vị cơ bản: ${
        detail.product.unit ?? "đơn vị"
      }`}>
      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          <span className="cd-chip cd-chip-confirmed">
            {detail.customers.length} khách hàng
          </span>
          <span className="cd-chip cd-chip-confirmed">
            {formatDemandQty(
              detail.lines.reduce((sum, line) => sum + line.quantityBase, 0)
            )}{" "}
            {detail.product.unit ?? "đơn vị"}
          </span>
        </div>

        {!detail.month && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Khách hàng
            </p>
            <div className="flex flex-wrap gap-2">
              {detail.customers.map((customer) => (
                <span
                  key={customer.id}
                  className="rounded-full bg-white px-3 py-1.5 text-sm text-gray-700 shadow-[inset_0_0_0_1px_var(--cd-hairline)]">
                  {customer.code ? `${customer.code} · ` : ""}
                  {customer.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="cd-table w-full text-sm">
            <thead>
              <tr>
                <th>Phiếu</th>
                <th>Khách hàng</th>
                {!detail.month && <th>Tháng</th>}
                <th className="text-right">Đã nhập</th>
                <th className="text-right">Quy đổi</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line, index) => (
                <tr key={`${line.demandId}-${line.demandMonthId}-${index}`}>
                  <td className="cd-mono text-[var(--cd-cyan-deep)]">
                    #{line.demandId}
                  </td>
                  <td>
                    {line.customer.code ? `${line.customer.code} · ` : ""}
                    {line.customer.name}
                  </td>
                  {!detail.month && (
                    <td>{formatDemandMonth(line.demandMonth)}</td>
                  )}
                  <td className="text-right">
                    {formatDemandQty(line.inputQuantity)}{" "}
                    {line.inputUnit === "CARTON"
                      ? "thùng"
                      : detail.product.unit ?? "đơn vị"}
                  </td>
                  <td className="text-right font-semibold">
                    {formatDemandQty(line.quantityBase)}{" "}
                    {detail.product.unit ?? "đơn vị"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <DemandButton type="button" variant="ghost" onClick={onClose}>
            Đóng
          </DemandButton>
        </div>
      </div>
    </DemandModalShell>
  );
}

function getCustomersForMonths(
  row: {
    customers?: Array<{ id: number; code: string | null; name: string }>;
    customersByMonth?: Record<
      string,
      Array<{ id: number; code: string | null; name: string }>
    >;
  },
  months: string[]
) {
  const customers = new Map<
    number,
    { id: number; code: string | null; name: string }
  >();
  const hasMonthlyCustomers = !!row.customersByMonth;

  for (const month of months) {
    const source = hasMonthlyCustomers
      ? row.customersByMonth?.[month] ?? []
      : row.customers ?? [];
    for (const customer of source) {
      customers.set(customer.id, customer);
    }
  }

  return [...customers.values()];
}
