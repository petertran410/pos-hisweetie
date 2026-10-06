"use client";

import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Paperclip,
} from "lucide-react";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import { displayOccurredAt, displaySource } from "@/lib/internal-finance/display";
import { formatCurrency } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  DELIVERY_FEE: "Chi phí giao hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  OTHER_EXPENSE: "Chi phí khác",
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  FEE_GUI_BEN: "Phí gửi bến",
  FEE_GRAB: "Phí Grab",
  SHIPPING_OUT: "Cước gửi hàng",
  SHIPPING_IN: "Cước nhận hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  OTHER: "Chi phí khác",
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELED: "Đã hủy",
  DELETED: "Đã xóa",
  REVERTED: "Đã thu hồi",
  CREATE_FAILED: "Tạo thất bại",
};

const APPROVAL_STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-100 text-gray-600",
  DELETED: "bg-gray-100 text-gray-600",
  REVERTED: "bg-orange-100 text-orange-700",
  CREATE_FAILED: "bg-red-100 text-red-700",
};

export function WarehouseExpenseTable({
  rows,
  isLoading,
  canMarkIssued,
  canEdit,
  markingId,
  onOpenAttachments,
  onEdit,
  onMarkIssued,
}: {
  rows: InternalFinanceEntry[];
  isLoading: boolean;
  canMarkIssued: (row: InternalFinanceEntry) => boolean;
  canEdit: (row: InternalFinanceEntry) => boolean;
  markingId: number | null;
  onOpenAttachments: (row: InternalFinanceEntry) => void;
  onEdit: (row: InternalFinanceEntry) => void;
  onMarkIssued: (row: InternalFinanceEntry) => void;
}) {
  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            {[
              ["Ngày chi", "110px"],
              ["Nguồn", "170px"],
              ["Nội dung", "250px"],
              ["Khoản mục", "170px"],
              ["Số tiền", "130px"],
              ["Chứng từ", "90px"],
              ["Batch Approval", "160px"],
              ["Trạng thái duyệt", "140px"],
              ["Đã chi", "130px"],
              ["", "120px"],
            ].map(([label, width]) => (
              <th
                key={label || "actions"}
                className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                  label === "Số tiền" ? "text-right" : "text-left"
                }`}
                style={{ width, minWidth: width }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={10} className="py-20 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tải...
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-20 text-center text-gray-400">
                Không có khoản chi phù hợp
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const approvalStatus = row.weeklyBatch?.approvalRequest?.status;
              const snapshot = row.sourceSnapshot || {};
              const showIssue = canMarkIssued(row);
              return (
                <tr key={row.id} className="border-b transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {displayOccurredAt({
                      occurredAt: row.occurredAt,
                      sourceType: row.sourceType,
                      sourceSnapshot: row.sourceSnapshot,
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-gray-900">{displaySource(row.sourceType)}</div>
                    {row.packingSlip ? (
                      <Link
                        href={`/don-hang/bao-don?Code=${encodeURIComponent(row.packingSlip.code)}`}
                        className="font-mono text-xs text-brand hover:underline">
                        {row.packingSlip.code}
                      </Link>
                    ) : snapshot.vehicle ? (
                      ["FUEL", "VEHICLE_CARE"].includes(row.sourceType) ? (
                        <Link
                          href="/tai-chinh/xe-co"
                          className="block truncate text-xs text-brand hover:underline"
                          title={String(snapshot.vehicle)}>
                          {String(snapshot.vehicle)}
                        </Link>
                      ) : (
                        <div
                          className="truncate text-xs text-gray-500"
                          title={String(snapshot.vehicle)}>
                          {String(snapshot.vehicle)}
                        </div>
                      )
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="max-w-[280px] break-words text-gray-900">
                      {row.description || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-gray-900">
                      {SUBCATEGORY_LABELS[row.subCategory || ""] ||
                        CATEGORY_LABELS[row.category] ||
                        row.category}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.attachments?.length ? (
                      <button
                        type="button"
                        title={`Xem ${row.attachments.length} chứng từ`}
                        onClick={() => onOpenAttachments(row)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-brand hover:border-brand hover:bg-brand-soft">
                        <Paperclip className="h-3.5 w-3.5" />
                        {row.attachments.length}
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.weeklyBatch ? (
                      <div>
                        <div className="font-mono text-xs text-gray-900">
                          {row.weeklyBatch.code}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {row.weeklyBatch.code ? "Phiếu chi tuần" : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Chưa tổng hợp</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {approvalStatus ? (
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                          APPROVAL_STATUS_CLASS[approvalStatus] ||
                          "bg-gray-100 text-gray-600"
                        }`}>
                        {APPROVAL_STATUS_LABELS[approvalStatus] || approvalStatus}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Chưa gửi</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.fundTransaction?.code ? (
                      <div className={`font-mono text-xs ${row.fundTransaction.status === "CANCELLED" ? "text-red-600" : "text-green-700"}`}>
                        {row.fundTransaction.code}
                        {row.fundTransaction.status === "CANCELLED" && <span className="mt-1 block font-sans">Đã hủy giao dịch quỹ</span>}
                      </div>
                    ) : row.cashIssued ? (
                      <span className="text-xs font-medium text-green-700">Đã chi</span>
                    ) : (
                      <span className="text-xs text-gray-400">Chưa chi</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {showIssue ? (
                      <button
                        type="button"
                        disabled={markingId === row.id}
                        onClick={() => onMarkIssued(row)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                        {markingId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Đã chi
                      </button>
                    ) : canEdit(row) && !row.weeklyBatch ? (
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        title="Sửa khoản chi"
                        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <FileText className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
