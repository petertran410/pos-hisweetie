"use client";

import { useMemo } from "react";
import { useCustomerDemandCustomerSummary } from "@/lib/hooks/useCustomerDemand";
import type {
  CustomerDemandCustomerSummary as CustomerSummary,
  CustomerDemandFilters,
} from "@/lib/types/customer-demand";
import { CustomerDemandExportMenu } from "./CustomerDemandExportMenu";
import { CustomerDemandMonthPicker } from "./CustomerDemandMonthPicker";
import { CustomerDemandSummarySearch } from "./CustomerDemandSummarySearch";
import { DemandViewToggle, type DemandViewMode } from "./DemandViewToggle";
import { toDemandSummaryFilters } from "./demand-summary";
import { useDemandSummaryMonths } from "./useDemandSummaryMonths";
import { formatDemandQty } from "./DemandUi";

const CUSTOMER_WEIGHT = 26;
const CODE_WEIGHT = 14;
const PRODUCT_WEIGHT = 28;
const MONTH_WEIGHT = 8;
const TOTAL_WEIGHT = 9;
const CUSTOMER_MIN_PX = 300;
const CODE_MIN_PX = 148;
const PRODUCT_MIN_PX = 320;
const MONTH_MIN_PX = 104;
const TOTAL_MIN_PX = 112;

function customerLabel(customer: SummaryGroup["customer"]) {
  return customer.code ? `${customer.code} · ${customer.name}` : customer.name;
}

function formatSummaryMonth(value: string, months: string[]) {
  const [year, month] = (value || "").split("-");
  const monthNumber = Number(month);
  if (!year || !monthNumber) return value || "-";
  const years = new Set(months.map((item) => item.slice(0, 4)));
  return years.size > 1
    ? `Tháng ${monthNumber}/${year}`
    : `Tháng ${monthNumber}`;
}

function summaryColumnLayout(monthCount: number) {
  const count = Math.max(monthCount, 1);
  const weight =
    CUSTOMER_WEIGHT +
    CODE_WEIGHT +
    PRODUCT_WEIGHT +
    count * MONTH_WEIGHT +
    TOTAL_WEIGHT;
  const share = (value: number) => `${(value / weight) * 100}%`;
  return {
    customer: share(CUSTOMER_WEIGHT),
    code: share(CODE_WEIGHT),
    product: share(PRODUCT_WEIGHT),
    month: share(MONTH_WEIGHT),
    total: share(TOTAL_WEIGHT),
    minWidth:
      CUSTOMER_MIN_PX +
      CODE_MIN_PX +
      PRODUCT_MIN_PX +
      count * MONTH_MIN_PX +
      TOTAL_MIN_PX,
  };
}

type SummaryGroup = CustomerSummary["groups"][number];
type SummaryProduct = SummaryGroup["products"][number];

interface Props {
  filters: CustomerDemandFilters;
  search?: string;
  onSearchChange: (value: string | undefined) => void;
  viewMode: DemandViewMode;
  onViewModeChange: (mode: DemandViewMode) => void;
  embedded?: boolean;
  canExport: boolean;
}

export function CustomerDemandCustomerSummary({
  filters,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  embedded = false,
  canExport,
}: Props) {
  const summaryFilters = useMemo(
    () => toDemandSummaryFilters(filters, search),
    [filters, search]
  );
  const { data, isLoading, isError } =
    useCustomerDemandCustomerSummary(summaryFilters);
  const availableMonths = useMemo(() => data?.months ?? [], [data?.months]);
  const { visibleMonths, setPickedMonths } =
    useDemandSummaryMonths(availableMonths);
  const groups = useMemo(
    () => visibleCustomerGroups(data?.groups ?? [], visibleMonths),
    [data?.groups, visibleMonths]
  );

  return (
    <div
      className={
        embedded
          ? "flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
          : "mr-4 mt-4 mb-4 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white"
      }>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
            Theo khách, theo tháng
          </h2>
          <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 md:inline-flex">
            {groups.length.toLocaleString("vi-VN")} khách
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
              groupBy="customer"
            />
          )}
          <CustomerDemandMonthPicker
            months={availableMonths}
            selected={visibleMonths}
            onChange={setPickedMonths}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Đang tính tổng...
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-sm text-red-600">
            Không tính được tổng theo khách hàng.
          </div>
        ) : groups.length === 0 ? (
          <div className="py-20 text-center text-sm text-gray-400">
            Không có dữ liệu trong bộ lọc này.
          </div>
        ) : embedded ? (
          <CustomerSummaryCards groups={groups} months={visibleMonths} />
        ) : (
          <CustomerSummaryTable groups={groups} months={visibleMonths} />
        )}
      </div>
    </div>
  );
}

function CustomerSummaryTable({
  groups,
  months,
}: {
  groups: SummaryGroup[];
  months: string[];
}) {
  const columns = summaryColumnLayout(months.length);

  return (
    <table
      className="w-full table-fixed border-separate border-spacing-0 text-sm"
      style={{ minWidth: columns.minWidth }}>
      <colgroup>
        <col style={{ width: columns.customer }} />
        <col style={{ width: columns.code }} />
        <col style={{ width: columns.product }} />
        {months.map((month) => (
          <col key={month} style={{ width: columns.month }} />
        ))}
        <col style={{ width: columns.total }} />
      </colgroup>
      <thead className="sticky top-0 z-20 bg-gray-50">
        <tr>
          <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
            Tên khách hàng
          </th>
          <th className="border-b border-l border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-semibold text-gray-600">
            Mã sản phẩm
          </th>
          <th className="border-b border-l border-gray-200 bg-gray-50 px-4 py-2.5 text-left text-xs font-semibold text-gray-600">
            Tên hàng hóa
          </th>
          {months.map((month) => (
            <th
              key={month}
              className="border-b border-l border-gray-300 bg-gray-50 px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-gray-600">
              {formatSummaryMonth(month, months)}
            </th>
          ))}
          <th className="border-b border-l border-gray-300 bg-gray-50 px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-gray-600">
            Tổng
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) =>
          group.products.map((product, index) => (
            <tr key={`${group.customer.id}-${product.product.id}`}>
              {index === 0 && (
                <td
                  rowSpan={group.products.length}
                  className="sticky left-0 z-10 border-b border-r border-gray-200 bg-white px-4 align-middle">
                  <div
                    className="truncate text-sm font-medium text-gray-900"
                    title={customerLabel(group.customer)}>
                    {group.customer.name}
                  </div>
                </td>
              )}
              <td className="border-b border-l border-gray-200 px-3 py-2">
                <div
                  className="truncate font-mono text-xs text-gray-700"
                  title={product.product.code}>
                  {product.product.code}
                </div>
              </td>
              <ProductCell product={product} />
              {months.map((month) => (
                <QuantityCell
                  key={month}
                  value={product.quantities[month] ?? 0}
                />
              ))}
              <td className="border-b border-l border-gray-300 px-3 py-2 text-right font-mono whitespace-nowrap text-gray-900">
                {formatDemandQty(product.totalQuantityBase)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function CustomerSummaryCards({
  groups,
  months,
}: {
  groups: SummaryGroup[];
  months: string[];
}) {
  return (
    <div className="space-y-3 p-3">
      {groups.map((group) => (
        <section
          key={group.customer.id}
          className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b bg-gray-50 px-3 py-2">
            <p
              className="truncate text-center text-sm font-medium text-gray-900"
              title={customerLabel(group.customer)}>
              {group.customer.name}
            </p>
          </div>
          <div className="overflow-x-auto">
            <SummaryGrid products={group.products} months={months} />
          </div>
        </section>
      ))}
    </div>
  );
}

function SummaryGrid({
  products,
  months,
}: {
  products: SummaryProduct[];
  months: string[];
}) {
  return (
    <table className="w-full min-w-[680px] text-sm">
      <thead className="bg-white">
        <tr>
          <th className="w-[1%] whitespace-nowrap border-l border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-600">
            Mã sản phẩm
          </th>
          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
            Tên hàng hóa
          </th>
          {months.map((month) => (
            <th
              key={month}
              className="w-[1%] whitespace-nowrap border-l border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-600">
              {formatSummaryMonth(month, months)}
            </th>
          ))}
          <th className="w-[1%] whitespace-nowrap border-l border-gray-300 px-3 py-2 text-right text-xs font-semibold text-gray-600">
            Tổng
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => (
          <tr
            key={product.product.id}
            className="border-t">
            <td className="whitespace-nowrap border-l border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-700">
              {product.product.code}
            </td>
            <td className="border-l border-gray-200 px-3 py-2.5">
              <div className="truncate text-gray-900" title={product.product.name}>
                {product.product.name}
              </div>
            </td>
            {months.map((month) => (
              <td
                key={month}
                className="w-[1%] whitespace-nowrap border-l border-gray-300 px-3 py-2.5 text-right font-mono text-gray-800">
                {product.quantities[month]
                  ? formatDemandQty(product.quantities[month])
                  : ""}
              </td>
            ))}
            <td className="w-[1%] whitespace-nowrap border-l border-gray-300 px-3 py-2.5 text-right font-mono text-gray-900">
              {formatDemandQty(product.totalQuantityBase)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProductCell({ product }: { product: SummaryProduct }) {
  return (
    <td className="border-b border-l border-gray-200 bg-white px-4 py-2">
      <div
        className="truncate text-gray-900"
        title={`${product.product.code}${
          product.product.unit ? ` · ${product.product.unit}` : ""
        } · ${product.product.name}`}>
        {product.product.name}
      </div>
    </td>
  );
}

function QuantityCell({ value }: { value: number }) {
  return (
    <td className="border-b border-l border-gray-300 px-3 py-2 text-right font-mono whitespace-nowrap text-gray-800">
      {value ? formatDemandQty(value) : ""}
    </td>
  );
}

function visibleCustomerGroups(groups: SummaryGroup[], months: string[]) {
  return groups
    .map((group) => {
      const products = group.products
        .map((product) => {
          const quantities = Object.fromEntries(
            months.map((month) => [month, product.quantities[month] ?? 0])
          );
          const totalQuantityBase = months.reduce(
            (sum, month) => sum + (product.quantities[month] ?? 0),
            0
          );
          return { ...product, quantities, totalQuantityBase };
        })
        .filter((product) => product.totalQuantityBase > 0);
      const totals = Object.fromEntries(
        months.map((month) => [
          month,
          products.reduce(
            (sum, product) => sum + (product.quantities[month] ?? 0),
            0
          ),
        ])
      );
      return {
        ...group,
        products,
        totals,
        totalQuantityBase: products.reduce(
          (sum, product) => sum + product.totalQuantityBase,
          0
        ),
      };
    })
    .filter((group) => group.products.length > 0);
}
