"use client";

import Link from "next/link";
import {
  Ban,
  CalendarRange,
  Check,
  FileText,
  Loader2,
  MessageSquareText,
  Paperclip,
} from "lucide-react";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import {
  displayOccurredAt,
  displaySource,
} from "@/lib/internal-finance/display";
import { formatCurrency } from "@/lib/utils";
import {
  CardAction,
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import type { WarehouseExpenseCheckRole } from "./WarehouseExpenseTable";

const WAREHOUSE_BRANCH_IDS = [6, 1];

/** Phiếu chi kho trên điện thoại: thẻ có tick, Đã chi, ghi chú, sửa, hủy. */
export function WarehouseExpenseMobileList({
  rows,
  isLoading,
  search,
  onSearchChange,
  activeFilterCount,
  onOpenFilter,
  total,
  pageAmount,
  page,
  totalPages,
  onPageChange,
  onCreate,
  canCheck,
  canMarkIssued,
  canEdit,
  canCancel,
  busyId,
  highlightId,
  onCheck,
  onOpenAttachments,
  onEdit,
  onMarkIssued,
  onCancel,
  onOpenNotes,
}: {
  rows: InternalFinanceEntry[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
  total: number;
  pageAmount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  canCheck: (
    row: InternalFinanceEntry,
    role: WarehouseExpenseCheckRole,
  ) => boolean;
  canMarkIssued: (row: InternalFinanceEntry) => boolean;
  canEdit: (row: InternalFinanceEntry) => boolean;
  canCancel: (row: InternalFinanceEntry) => boolean;
  busyId: number | null;
  highlightId?: number | null;
  onCheck: (
    row: InternalFinanceEntry,
    role: WarehouseExpenseCheckRole,
    checked: boolean,
  ) => void;
  onOpenAttachments: (row: InternalFinanceEntry) => void;
  onEdit: (row: InternalFinanceEntry) => void;
  onMarkIssued: (row: InternalFinanceEntry) => void;
  onCancel: (row: InternalFinanceEntry) => void;
  onOpenNotes: (row: InternalFinanceEntry) => void;
}) {
  const tick = (
    row: InternalFinanceEntry,
    role: WarehouseExpenseCheckRole,
    label: string,
  ) => {
    const checked = Boolean(
      role === "manager" ? row.managerReviewedAt : row.accountantReviewedAt,
    );
    const enabled = canCheck(row, role);
    return (
      <button
        type="button"
        disabled={!enabled || busyId === row.id}
        onClick={() => onCheck(row, role, !checked)}
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-60 ${
          checked
            ? "border-green-200 bg-green-50 text-green-700"
            : "text-gray-600"
        }`}>
        <span
          className={`flex h-4 w-4 items-center justify-center rounded border ${
            checked
              ? "border-green-600 bg-green-600 text-white"
              : "border-gray-300"
          }`}>
          {checked && <Check className="h-3 w-3" />}
        </span>
        {label}
      </button>
    );
  };

  return (
    <FinanceMobileShell
      title="Phiếu chi kho"
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Tìm mã, nội dung, xe, báo đơn..."
      activeFilterCount={activeFilterCount}
      onOpenFilter={onOpenFilter}
      actions={
        <Link
          href="/tai-chinh/approval-tuan"
          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700">
          <CalendarRange className="h-3.5 w-3.5" />
          Approval tuần
        </Link>
      }
      summary={
        <div className="flex items-center justify-between text-gray-500">
          <span>
            <strong className="text-gray-900">{total}</strong> phiếu
          </span>
          <span>
            Trang này:{" "}
            <strong className="text-red-600">
              {formatCurrency(pageAmount)}
            </strong>
          </span>
        </div>
      }
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyText="Không có khoản chi phù hợp"
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onCreate={onCreate}>
      {rows.map((row) => {
        const cancelled = row.status === "CANCELLED";
        const warehouse = WAREHOUSE_BRANCH_IDS.includes(row.branchId);
        const noteCount = row._count?.reviewNotes || 0;
        return (
          <FinanceMobileCard
            key={row.id}
            code={row.code}
            muted={cancelled}
            highlight={highlightId === row.id}
            badge={
              cancelled ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                  Đã hủy
                </span>
              ) : row.cashIssued ? (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                  Đã chi
                </span>
              ) : row.weeklyBatch ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  Trong tuần
                </span>
              ) : null
            }
            title={row.description || "-"}
            meta={
              <>
                <div>
                  {displayOccurredAt({
                    occurredAt: row.occurredAt,
                    sourceType: row.sourceType,
                    sourceSnapshot: row.sourceSnapshot,
                  })}{" "}
                  · {displaySource(row.sourceType, row.category)}
                </div>
                {(row.expenseItem || row.payer?.name) && (
                  <div className="truncate">
                    {[
                      row.expenseItem,
                      row.payer?.name && `Chi: ${row.payer.name}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                {cancelled && row.cancelReason && (
                  <div className="text-red-600">
                    Lý do hủy: {row.cancelReason}
                  </div>
                )}
              </>
            }
            amount={`-${formatCurrency(row.amount)}`}
            amountTone="negative">
            {warehouse && tick(row, "manager", "Quản lý kho")}
            {warehouse && tick(row, "accountant", "Kế toán kho")}
            {!row.cashIssued && canMarkIssued(row) && (
              <CardAction tone="primary" onClick={() => onMarkIssued(row)}>
                {busyId === row.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Đã chi
              </CardAction>
            )}
            {row.attachments?.length > 0 && (
              <CardAction onClick={() => onOpenAttachments(row)}>
                <Paperclip className="h-3.5 w-3.5" />
                {row.attachments.length}
              </CardAction>
            )}
            <CardAction title="Ghi chú" onClick={() => onOpenNotes(row)}>
              <MessageSquareText className="h-3.5 w-3.5" />
              {noteCount > 0 && noteCount}
            </CardAction>
            {canEdit(row) && !row.weeklyBatch && (
              <CardAction onClick={() => onEdit(row)}>
                <FileText className="h-3.5 w-3.5" />
                Sửa
              </CardAction>
            )}
            {canCancel(row) && (
              <CardAction tone="danger" onClick={() => onCancel(row)}>
                <Ban className="h-3.5 w-3.5" />
                Hủy
              </CardAction>
            )}
          </FinanceMobileCard>
        );
      })}
    </FinanceMobileShell>
  );
}
