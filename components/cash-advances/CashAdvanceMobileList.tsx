"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import type { CashAdvance } from "@/lib/api/cash-advances";
import { formatDateKey } from "@/lib/cash-advances/display";
import { formatCurrency } from "@/lib/utils";
import { CashAdvanceDetail } from "./CashAdvanceDetail";
import {
  CashAdvanceStatusBadge,
  RefundStateBadge,
} from "./CashAdvanceStatusBadge";
import type { CashAdvanceActions } from "./useCashAdvanceActions";

/** Ngăn chi tiết toàn màn hình trên điện thoại. */
export function MobileDetailSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end bg-black/40">
      <div className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-gray-50">
        <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="truncate font-mono text-sm font-semibold text-brand">
            {title}
          </h2>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CashAdvanceMobileList({
  rows,
  isLoading,
  search,
  onSearchChange,
  activeFilterCount,
  onOpenFilter,
  totals,
  page,
  totalPages,
  onPageChange,
  onCreate,
  actions,
}: {
  rows: CashAdvance[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
  totals?: Record<string, number>;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  actions: CashAdvanceActions;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const open = rows.find((row) => row.id === openId);
  return (
    <>
      <FinanceMobileShell
        title="Tạm ứng"
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Tìm mã, nội dung, người tạm ứng..."
        activeFilterCount={activeFilterCount}
        onOpenFilter={onOpenFilter}
        summary={
          totals ? (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <span>
                Tạm ứng <strong>{formatCurrency(totals.amount || 0)}</strong>
              </span>
              <span>
                Đã dùng{" "}
                <strong className="text-red-600">
                  {formatCurrency(totals.used || 0)}
                </strong>
              </span>
              <span>
                Còn lại{" "}
                <strong className="text-green-700">
                  {formatCurrency(totals.remaining || 0)}
                </strong>
              </span>
            </div>
          ) : undefined
        }
        isLoading={isLoading}
        isEmpty={!rows.length}
        emptyText="Chưa có phiếu tạm ứng"
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onCreate={onCreate}>
        {rows.map((row) => (
          <FinanceMobileCard
            key={row.id}
            code={row.code}
            muted={row.status === "CANCELLED"}
            badge={<CashAdvanceStatusBadge status={row.status} />}
            title={`${row.recipient.name} · ${row.description}`}
            meta={
              <>
                <div>
                  {row.branch?.name} · {row.periodLabel}
                </div>
                <div>
                  Đã dùng {formatCurrency(row.usage.used)} · Còn{" "}
                  {formatCurrency(row.usage.remaining)} · Hạn hoàn ứng{" "}
                  {formatDateKey(row.refundDueDate)}
                </div>
                <RefundStateBadge
                  needsRefund={row.needsRefund}
                  overdue={row.overdue}
                />
              </>
            }
            amount={formatCurrency(row.amount)}
            onClick={() => setOpenId(row.id)}
          />
        ))}
      </FinanceMobileShell>
      {open && (
        <MobileDetailSheet title={open.code} onClose={() => setOpenId(null)}>
          <CashAdvanceDetail id={open.id} actions={actions} />
        </MobileDetailSheet>
      )}
    </>
  );
}
