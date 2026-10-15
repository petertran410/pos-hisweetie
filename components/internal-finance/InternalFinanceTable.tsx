"use client";

import {
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import { TablePagination } from "@/components/shared/TablePagination";
import { PAGE_SIZE_OPTIONS } from "@/lib/hooks/usePageSize";
import { ColumnToggle } from "@/components/shared/ColumnToggle";
import { useColumnToggle } from "@/lib/hooks/useColumnToggle";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";
import {
  displayEntryCode,
  displayOccurredAt,
  displaySource,
  displayDescription,
} from "@/lib/internal-finance/display";
import { InternalFinanceDetailRow } from "./InternalFinanceDetailRow";

const CATEGORY_LABELS: Record<string, string> = {
  DELIVERY_FEE: "Chi phí giao hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  SALARY_ADVANCE: "Tạm ứng lương",
  CUSTOMER_RECEIPT: "Thu tiền khách hàng",
  MANUAL_RECEIPT: "Phiếu thu thủ công",
  OTHER_EXPENSE: "Chi phí khác",
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  FEE_GUI_BEN: "Phí gửi bến",
  FEE_GRAB: "Phí Grab",
  SHIPPING_OUT: "Cước gửi hàng",
  SHIPPING_IN: "Cước nhận hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  SALARY_ADVANCE: "Tạm ứng lương",
  OTHER: "Chi phí khác",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_ACCOUNTANT: "Chờ kiểm tra",
  ACCOUNTANT_APPROVED: "Kế toán đã duyệt",
  PENDING_MANAGER: "Chờ quản lý",
  MANAGER_APPROVED: "Đã kiểm tra",
  READY_FOR_WEEKLY_APPROVAL: "Đã gom tuần",
  IN_WEEKLY_APPROVAL: "Đang duyệt tuần",
  APPROVED: "Đã duyệt",
  POSTED: "Đã ghi sổ",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_ACCOUNTANT: "bg-yellow-100 text-yellow-700",
  ACCOUNTANT_APPROVED: "bg-teal-100 text-teal-700",
  PENDING_MANAGER: "bg-orange-100 text-orange-700",
  MANAGER_APPROVED: "bg-teal-100 text-teal-600",
  READY_FOR_WEEKLY_APPROVAL: "bg-blue-100 text-blue-700",
  IN_WEEKLY_APPROVAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  POSTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const EVIDENCE_COLORS: Record<string, string> = {
  COMPLETE: "bg-green-100 text-green-700",
  MISSING: "bg-yellow-100 text-yellow-700",
  EXCEPTION_APPROVED: "bg-orange-100 text-orange-700",
};

const EVIDENCE_LABELS: Record<string, string> = {
  COMPLETE: "Đủ chứng từ",
  MISSING: "Thiếu chứng từ",
  EXCEPTION_APPROVED: "Duyệt ngoại lệ",
};

export interface InternalFinanceSummaryItem {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "negative" | "warning";
}

const FINANCE_COLUMNS: Array<{
  key: string;
  label: string;
  width: string;
  align?: "left" | "right";
}> = [
  { key: "code", label: "Mã", width: "150px" },
  { key: "date", label: "Thời gian", width: "160px" },
  { key: "branch", label: "Chi nhánh", width: "150px" },
  { key: "category", label: "Nghiệp vụ", width: "220px" },
  { key: "invoice", label: "Hóa đơn", width: "150px" },
  { key: "amount", label: "Số tiền", width: "140px", align: "right" },
  { key: "evidence", label: "Chứng từ", width: "140px" },
  { key: "reviewer", label: "Người kiểm tra", width: "170px" },
  { key: "status", label: "Trạng thái", width: "150px" },
  { key: "weekly", label: "Approval tuần", width: "170px" },
  { key: "cashIssued", label: "Đã chi", width: "110px" },
  { key: "cashFlow", label: "CashFlow", width: "140px" },
  { key: "source", label: "Nguồn", width: "140px" },
];

export function InternalFinanceTable({
  rows,
  isLoading,
  title,
  toolbar,
  summary,
  search = "",
  onSearchChange,
  total = rows.length,
  page = 1,
  pageSize = 50,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
  isMobile = false,
  activeFilterCount = 0,
  onOpenFilter,
}: {
  /** Điện thoại: danh sách thẻ, bấm thẻ mở chi tiết dạng bottom sheet. */
  isMobile?: boolean;
  activeFilterCount?: number;
  onOpenFilter?: () => void;
  rows: InternalFinanceEntry[];
  isLoading: boolean;
  title: string;
  toolbar?: ReactNode;
  summary?: InternalFinanceSummaryItem[];
  search?: string;
  onSearchChange?: (search: string) => void;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  const [searchText, setSearchText] = useState(search);

  useEffect(() => {
    if (!search) setSearchText("");
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchText.trim();
      if (next === search.trim()) return;
      onSearchChange?.(next);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, search, onSearchChange]);

  const toneClass = (tone?: InternalFinanceSummaryItem["tone"]) => {
    if (tone === "positive") return "text-green-700";
    if (tone === "negative") return "text-red-600";
    if (tone === "warning") return "text-orange-600";
    return "text-gray-900";
  };

  const {
    columns: toggleColumns,
    toggleColumn,
    shows,
  } = useColumnToggle("internalFinanceTableColumns", FINANCE_COLUMNS);
  const columns = FINANCE_COLUMNS.filter((column) => shows(column.key));
  const colSpan = columns.length + 1;
  const displayTotalPages = Math.max(totalPages, 1);

  if (isMobile) {
    const detailRow = rows.find((row) => row.id === expandedEntryId);
    return (
      <>
        <FinanceMobileShell
          title={title}
          search={searchText}
          onSearchChange={setSearchText}
          searchPlaceholder="Tìm mã phiếu, khách hàng..."
          activeFilterCount={activeFilterCount}
          onOpenFilter={onOpenFilter}
          actions={toolbar}
          summary={
            summary && summary.length > 0 ? (
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 dt-no-scrollbar">
                {summary.map((item) => (
                  <span key={item.label} className="shrink-0 whitespace-nowrap">
                    <span className="mr-1.5 text-gray-500">{item.label}</span>
                    <span className={`font-semibold ${toneClass(item.tone)}`}>
                      {formatCurrency(item.value)}
                    </span>
                  </span>
                ))}
              </div>
            ) : undefined
          }
          isLoading={isLoading}
          isEmpty={rows.length === 0}
          emptyText="Không có dòng tài chính nào"
          page={page}
          totalPages={displayTotalPages}
          onPageChange={onPageChange}>
          {rows.map((row) => (
            <FinanceMobileCard
              key={row.id}
              code={displayEntryCode({
                code: row.code,
                description: row.description,
                invoiceCodes: row.invoiceLinks.map(
                  ({ invoice }) => invoice.code,
                ),
              })}
              badge={
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"
                  }`}>
                  {STATUS_LABELS[row.status] || row.status}
                </span>
              }
              title={
                SUBCATEGORY_LABELS[row.subCategory || ""] ||
                CATEGORY_LABELS[row.category] ||
                row.category
              }
              meta={
                <>
                  <div>
                    {displayOccurredAt(row)} · {row.branch?.name || "-"}
                  </div>
                  {row.description && (
                    <div className="line-clamp-2 break-words">
                      {displayDescription(row.description)}
                    </div>
                  )}
                  <div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        EVIDENCE_COLORS[row.evidenceStatus] ||
                        "bg-gray-100 text-gray-600"
                      }`}>
                      {EVIDENCE_LABELS[row.evidenceStatus] ||
                        row.evidenceStatus}
                    </span>
                  </div>
                </>
              }
              amount={`${row.direction === "RECEIPT" ? "+" : "-"}${formatCurrency(row.amount)}`}
              amountTone={row.direction === "RECEIPT" ? "positive" : "negative"}
              onClick={() => setExpandedEntryId(row.id)}
            />
          ))}
        </FinanceMobileShell>
        {detailRow && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/40"
            onClick={() => setExpandedEntryId(null)}>
            <div
              className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white"
              onClick={(event) => event.stopPropagation()}>
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                <span className="font-mono text-sm font-semibold text-brand">
                  {detailRow.code}
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedEntryId(null)}
                  className="rounded-lg border px-3 py-1.5 text-sm text-gray-700">
                  Đóng
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto pb-[env(safe-area-inset-bottom)]">
                <table className="w-full text-sm">
                  <tbody>
                    <InternalFinanceDetailRow row={detailRow} colSpan={1} />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
            {title}
          </h2>
          <input
            type="text"
            placeholder="Tìm mã phiếu, khách hàng..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-64 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {toolbar}
          <ColumnToggle columns={toggleColumns} onToggle={toggleColumn} />
        </div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                  style={{ width: column.width, minWidth: column.width }}>
                  {column.label}
                </th>
              ))}
              <th className="w-8 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {summary && summary.length > 0 && (
              <tr className="border-b bg-gray-50/60">
                <td colSpan={colSpan} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                    {summary.map((item) => (
                      <span
                        key={item.label}
                        className="whitespace-nowrap text-sm">
                        <span className="mr-2 text-gray-500">{item.label}</span>
                        <span
                          className={`font-semibold ${toneClass(item.tone)}`}>
                          {formatCurrency(item.value)}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="py-20 text-center text-gray-400">
                  <div className="text-sm">Không có dòng tài chính nào</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expanded = expandedEntryId === row.id;
                const edge = expanded ? "border-t-2 border-brand" : "";
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() =>
                        setExpandedEntryId((current) =>
                          current === row.id ? null : row.id,
                        )
                      }
                      className={`cursor-pointer transition-colors ${
                        expanded ? "bg-brand-soft" : "border-b hover:bg-gray-50"
                      }`}>
                      {shows("code") && (
                        <td
                          className={`px-4 py-2.5 ${edge} ${
                            expanded ? "border-l-2 bg-brand-soft" : ""
                          }`}
                          style={{ width: "150px", minWidth: "150px" }}>
                          <span className="font-medium text-brand">
                            {displayEntryCode({
                              code: row.code,
                              description: row.description,
                              invoiceCodes: row.invoiceLinks.map(
                                ({ invoice }) => invoice.code,
                              ),
                            })}
                          </span>
                        </td>
                      )}
                      {shows("date") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          {displayOccurredAt(row)}
                        </td>
                      )}
                      {shows("branch") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          {row.branch?.name || "-"}
                        </td>
                      )}
                      {shows("category") && (
                        <td className={`px-4 py-2.5 ${edge}`}>
                          <div className="text-gray-900">
                            {SUBCATEGORY_LABELS[row.subCategory || ""] ||
                              CATEGORY_LABELS[row.category] ||
                              row.category}
                          </div>
                          {row.description && (
                            <div className="max-w-[220px] truncate text-xs text-gray-500">
                              {displayDescription(row.description)}
                            </div>
                          )}
                        </td>
                      )}
                      {shows("invoice") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          {row.invoiceLinks.length
                            ? row.invoiceLinks
                                .map(({ invoice }) => invoice.code)
                                .join(", ")
                            : "-"}
                        </td>
                      )}
                      {shows("amount") && (
                        <td className={`px-4 py-2.5 text-right ${edge}`}>
                          <span
                            className={`font-semibold ${
                              row.direction === "RECEIPT"
                                ? "text-green-700"
                                : "text-red-600"
                            }`}>
                            {row.direction === "RECEIPT" ? "+" : "-"}
                            {formatCurrency(row.amount)}
                          </span>
                        </td>
                      )}
                      {shows("evidence") && (
                        <td className={`px-4 py-2.5 ${edge}`}>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              EVIDENCE_COLORS[row.evidenceStatus] ||
                              "bg-gray-100 text-gray-600"
                            }`}>
                            {EVIDENCE_LABELS[row.evidenceStatus] ||
                              row.evidenceStatus}
                          </span>
                        </td>
                      )}
                      {shows("reviewer") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          {row.direction === "EXPENSE" &&
                          (row.managerReviewedAt ||
                            row.accountantReviewedAt) ? (
                            <div className="space-y-0.5 text-xs">
                              {row.managerReviewedAt && (
                                <div>
                                  QL kho:{" "}
                                  {row.managerReviewer?.name || "đã tick"}
                                </div>
                              )}
                              {row.accountantReviewedAt && (
                                <div>
                                  KT kho:{" "}
                                  {row.accountantReviewer?.name || "đã tick"}
                                </div>
                              )}
                            </div>
                          ) : row.reviews.length > 0 ? (
                            [
                              ...new Set(
                                row.reviews.map(
                                  (review) =>
                                    review.reviewer?.name ||
                                    review.reviewerNameSnapshot ||
                                    "Người dùng Lark chưa liên kết",
                                ),
                              ),
                            ].join(", ")
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {shows("status") && (
                        <td className={`px-4 py-2.5 ${edge}`}>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[row.status] ||
                              "bg-gray-100 text-gray-600"
                            }`}>
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                      )}
                      {shows("weekly") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          {row.weeklyBatch ? (
                            <Link
                              href={`/tai-chinh/approval-tuan?batchId=${row.weeklyBatch.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="text-brand hover:underline">
                              {row.weeklyBatch.code}
                            </Link>
                          ) : row.direction === "RECEIPT" ? (
                            "Không áp dụng"
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {shows("cashIssued") && (
                        <td className={`px-4 py-2.5 text-xs ${edge}`}>
                          {row.direction === "RECEIPT" ? (
                            <span className="text-gray-400">-</span>
                          ) : row.cashIssued ? (
                            <span
                              className="font-medium text-green-700"
                              title={row.cashIssuedReason || undefined}>
                              Đã chi
                            </span>
                          ) : (
                            <span className="text-gray-400">Chưa chi</span>
                          )}
                        </td>
                      )}
                      {shows("cashFlow") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          {row.cashFlow?.code || "-"}
                        </td>
                      )}
                      {shows("source") && (
                        <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                          <div>
                            {displaySource(row.sourceType, row.category)}
                          </div>
                          {row.packingSlip && (
                            <div className="text-brand">
                              {row.packingSlip.code}
                            </div>
                          )}
                        </td>
                      )}
                      <td
                        className={`px-4 py-2.5 ${edge} ${
                          expanded ? "border-r-2" : ""
                        }`}>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-400 transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expanded && (
                      <InternalFinanceDetailRow row={row} colSpan={colSpan} />
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={displayTotalPages}
        total={total}
        limit={pageSize}
        limitOptions={PAGE_SIZE_OPTIONS}
        unit="dòng"
        onPageChange={(next) => onPageChange?.(next)}
        onLimitChange={(next) => onPageSizeChange?.(next)}
      />
    </div>
  );
}
