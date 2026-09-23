"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useCustomerDemandOrderSummary } from "@/lib/hooks/useCustomerDemand";
import type { CustomerDemandFilters } from "@/lib/types/customer-demand";
import { DemandViewToggle, type DemandViewMode } from "./DemandViewToggle";
import {
  DemandButton,
  DemandModalShell,
  formatDemandMonth,
  formatDemandQty,
} from "./DemandUi";

const SUMMARY_MONTHS_STORAGE_KEY = "customer-demand-summary-months";

function readSavedSummaryMonths() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SUMMARY_MONTHS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.filter((value): value is string => typeof value === "string")
      : null;
  } catch {
    return null;
  }
}

interface CustomerDemandOrderSummaryProps {
  filters: CustomerDemandFilters;
  viewMode: DemandViewMode;
  onViewModeChange: (mode: DemandViewMode) => void;
  embedded?: boolean;
}

export function CustomerDemandOrderSummary({
  filters,
  viewMode,
  onViewModeChange,
  embedded = false,
}: CustomerDemandOrderSummaryProps) {
  const [search, setSearch] = useState("");
  const [pickedMonths, setPickedMonths] = useState<string[] | null>(
    readSavedSummaryMonths
  );
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
    () => ({
      customerId: filters.customerId,
      month: filters.month,
      monthFrom: filters.monthFrom,
      monthTo: filters.monthTo,
      status: filters.status,
    }),
    [
      filters.customerId,
      filters.month,
      filters.monthFrom,
      filters.monthTo,
      filters.status,
    ]
  );
  const { data, isLoading, isError } = useCustomerDemandOrderSummary(
    summaryFilters
  );
  const availableMonths = useMemo(() => data?.months ?? [], [data?.months]);
  const visibleMonths = useMemo(() => {
    const picked = (pickedMonths ?? availableMonths).filter((month) =>
      availableMonths.includes(month)
    );
    return picked.length ? picked : availableMonths;
  }, [availableMonths, pickedMonths]);

  useEffect(() => {
    try {
      if (pickedMonths?.length) {
        localStorage.setItem(
          SUMMARY_MONTHS_STORAGE_KEY,
          JSON.stringify(pickedMonths)
        );
      } else {
        localStorage.removeItem(SUMMARY_MONTHS_STORAGE_KEY);
      }
    } catch {
      // localStorage bị chặn thì vẫn giữ lựa chọn trong phiên hiện tại.
    }
  }, [pickedMonths]);

  const query = search.trim().toLowerCase();
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
        .filter((row) => {
          if (row.totalQuantityBase <= 0) return false;
          if (!query) return true;
          return `${row.product.code} ${row.product.name}`
            .toLowerCase()
            .includes(query);
        }),
    [data?.products, query, visibleMonths]
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
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <MonthPicker
            months={availableMonths}
            selected={visibleMonths}
            onChange={setPickedMonths}
          />
          <div className="relative min-w-[220px] flex-1 sm:w-64 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã hoặc tên hàng"
              className="w-full rounded-lg border bg-white py-1.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </div>
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

function MonthPicker({
  months,
  selected,
  onChange,
}: {
  months: string[];
  selected: string[];
  onChange: (months: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = months.length > 0 && selected.length === months.length;

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const label = allSelected
    ? "Tất cả tháng"
    : selected.length === 1
      ? formatDemandMonth(selected[0])
      : `${selected.length} tháng`;

  const toggle = (month: string) => {
    const next = selected.includes(month)
      ? selected.filter((item) => item !== month)
      : [...selected, month].sort();
    onChange(next.length && next.length < months.length ? next : null);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex min-w-36 items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <span className="truncate text-gray-800">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-72 w-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
            Tất cả tháng
            {allSelected && <Check className="h-3.5 w-3.5 text-brand" />}
          </button>
          {months.map((month) => {
            const active = selected.includes(month);
            return (
              <button
                key={month}
                type="button"
                onClick={() => toggle(month)}
                className={`mt-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                  active ? "bg-brand-soft text-gray-900" : "text-gray-700 hover:bg-gray-50"
                }`}>
                {formatDemandMonth(month)}
                {active && <Check className="h-3.5 w-3.5 text-brand" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
