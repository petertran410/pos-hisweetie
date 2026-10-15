"use client";

import { useEffect } from "react";
import { Loader2, Users, X } from "lucide-react";
import type { WarehouseExpenseQuery } from "@/lib/api/internal-finance";
import { useWarehouseExpensePayerSummary } from "@/lib/hooks/useInternalFinance";
import { formatCurrency } from "@/lib/utils";

/** Báo cáo nhanh: tổng tiền chi theo người chi, theo bộ lọc đang chọn. */
export function PayerSummaryModal({
  query,
  scopeLabel,
  onClose,
  onSelectPayer,
}: {
  /** Bộ lọc của danh sách (không cần trang, sắp xếp). */
  query: WarehouseExpenseQuery;
  /** Mô tả phạm vi đang xem, ví dụ chi nhánh và khoảng ngày. */
  scopeLabel?: string;
  onClose: () => void;
  /** Bấm một người để lọc danh sách theo người đó. */
  onSelectPayer?: (payerId: number) => void;
}) {
  const summary = useWarehouseExpensePayerSummary(query, true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const rows = summary.data?.rows || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Users className="h-5 w-5 text-brand" />
              Chi tiêu theo người chi
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {scopeLabel || "Theo chi nhánh và bộ lọc đang chọn"}
            </p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="shrink-0 rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          {summary.isLoading ? (
            <div className="flex justify-center py-12 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : summary.isError ? (
            <div className="py-12 text-center text-sm text-red-600">
              {summary.error instanceof Error
                ? summary.error.message
                : "Không tải được báo cáo"}
            </div>
          ) : !rows.length ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Không có khoản chi phù hợp
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-brand-border">
              <table className="w-full text-sm">
                <thead className="bg-brand-soft">
                  <tr>
                    <th className="border-r border-brand-border px-4 py-2.5 text-left font-semibold text-gray-800">
                      Người chi
                    </th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-800">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.payerId ?? "none"}
                      onClick={
                        onSelectPayer && row.payerId !== null
                          ? () => onSelectPayer(row.payerId as number)
                          : undefined
                      }
                      title={
                        onSelectPayer && row.payerId !== null
                          ? "Bấm để lọc danh sách theo người này"
                          : undefined
                      }
                      className={`border-t ${
                        onSelectPayer && row.payerId !== null
                          ? "cursor-pointer hover:bg-gray-50"
                          : ""
                      }`}>
                      <td className="border-r px-4 py-2.5 text-gray-900">
                        <div
                          className={
                            row.payerId === null ? "italic text-gray-500" : ""
                          }>
                          {row.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {row.count} phiếu
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-gray-900">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-brand-soft">
                  <tr className="border-t border-brand-border">
                    <td className="border-r border-brand-border px-4 py-2.5 font-semibold text-gray-900">
                      Tổng
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        ({summary.data?.count || 0} phiếu)
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">
                      {formatCurrency(summary.data?.total || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
