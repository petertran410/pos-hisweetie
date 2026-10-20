"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { CashAdvance } from "@/lib/api/cash-advances";
import { formatDateKey } from "@/lib/cash-advances/display";
import { formatCurrency } from "@/lib/utils";
import { CashAdvanceDetail } from "./CashAdvanceDetail";
import {
  CashAdvanceStatusBadge,
  RefundStateBadge,
} from "./CashAdvanceStatusBadge";
import type { CashAdvanceActions } from "./useCashAdvanceActions";

export const CASH_ADVANCE_COLUMNS = [
  { key: "code", label: "Mã" },
  { key: "date", label: "Ngày tạm ứng" },
  { key: "branch", label: "Kho" },
  { key: "recipient", label: "Người tạm ứng" },
  { key: "period", label: "Kỳ tạm ứng" },
  { key: "amount", label: "Số tiền" },
  { key: "used", label: "Đã dùng" },
  { key: "remaining", label: "Còn lại" },
  { key: "refunded", label: "Hoàn ứng" },
  { key: "due", label: "Hạn hoàn ứng" },
  { key: "status", label: "Trạng thái" },
  { key: "creator", label: "Người tạo" },
];

const RIGHT = new Set(["amount", "used", "remaining", "refunded"]);

export function CashAdvanceTable({
  rows,
  isLoading,
  shows,
  totals,
  actions,
  highlightId,
}: {
  rows: CashAdvance[];
  isLoading: boolean;
  shows: (key: string) => boolean;
  totals?: Record<string, number>;
  actions: CashAdvanceActions;
  highlightId?: number;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Mở sẵn phiếu trong link ?Code=.
  const [seenHighlight, setSeenHighlight] = useState<number | undefined>();
  if (highlightId && highlightId !== seenHighlight) {
    setSeenHighlight(highlightId);
    setExpandedId(highlightId);
  }
  const columns = CASH_ADVANCE_COLUMNS.filter((column) => shows(column.key));
  const cell = (row: CashAdvance, key: string) => {
    switch (key) {
      case "code":
        return (
          <span
            className={`font-mono text-xs font-semibold ${
              row.status === "CANCELLED"
                ? "text-gray-400 line-through"
                : "text-brand"
            }`}>
            {row.code}
          </span>
        );
      case "date":
        return formatDateKey(row.advanceDate);
      case "branch":
        return row.branch?.name || "-";
      case "recipient":
        return <span className="font-medium">{row.recipient.name}</span>;
      case "period":
        return <span className="text-xs">{row.periodLabel}</span>;
      case "amount":
        return (
          <span className="font-semibold">{formatCurrency(row.amount)}</span>
        );
      case "used":
        return (
          <span
            className="text-red-600"
            title={`Đã chi (chốt): ${formatCurrency(row.usage.locked)} · Dự kiến: ${formatCurrency(row.usage.projected)}`}>
            {formatCurrency(row.usage.used)}
          </span>
        );
      case "remaining":
        return (
          <span className="font-medium text-green-700">
            {formatCurrency(row.usage.remaining)}
          </span>
        );
      case "refunded":
        return row.usage.refunded ? (
          <span className="text-blue-700">
            {formatCurrency(row.usage.refunded)}
          </span>
        ) : (
          "-"
        );
      case "due":
        return (
          <span className={row.overdue ? "font-medium text-red-600" : ""}>
            {formatDateKey(row.refundDueDate)}
          </span>
        );
      case "status":
        return (
          <div className="flex flex-col items-start gap-1">
            <CashAdvanceStatusBadge status={row.status} />
            <RefundStateBadge
              needsRefund={row.needsRefund}
              overdue={row.overdue}
            />
          </div>
        );
      case "creator":
        return row.creator?.name || "-";
      default:
        return null;
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            <th className="w-8 px-2 py-2.5" />
            {columns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                  RIGHT.has(column.key) ? "text-right" : "text-left"
                }`}>
                {column.label}
              </th>
            ))}
          </tr>
          {totals && (
            <tr className="border-b bg-gray-50/60 text-xs font-semibold">
              <td />
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="whitespace-nowrap px-3 py-1.5 text-right">
                  {column.key === "amount" &&
                    formatCurrency(totals.amount || 0)}
                  {column.key === "used" && (
                    <span className="text-red-600">
                      {formatCurrency(totals.used || 0)}
                    </span>
                  )}
                  {column.key === "remaining" && (
                    <span className="text-green-700">
                      {formatCurrency(totals.remaining || 0)}
                    </span>
                  )}
                  {column.key === "refunded" && (
                    <span className="text-blue-700">
                      {formatCurrency(totals.refunded || 0)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length + 1} className="p-10 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
              </td>
            </tr>
          ) : !rows.length ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="p-10 text-center text-gray-400">
                Chưa có phiếu tạm ứng
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className={`cursor-pointer border-b hover:bg-gray-50 ${
                      expanded ? "bg-brand-soft/40" : ""
                    } ${row.status === "CANCELLED" ? "text-gray-400" : ""}`}>
                    <td className="px-2 py-2 text-gray-400">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 ${
                          RIGHT.has(column.key)
                            ? "whitespace-nowrap text-right"
                            : column.key === "period"
                              ? "min-w-40"
                              : "whitespace-nowrap"
                        }`}>
                        {cell(row, column.key)}
                      </td>
                    ))}
                  </tr>
                  {expanded && (
                    <tr className="border-b bg-gray-50/70">
                      <td colSpan={columns.length + 1} className="p-4">
                        <CashAdvanceDetail id={row.id} actions={actions} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
