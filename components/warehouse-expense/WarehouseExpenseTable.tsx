"use client";

import Link from "next/link";
import { FileText, Loader2, Paperclip } from "lucide-react";
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

export const WAREHOUSE_EXPENSE_COLUMNS = [
  { key: "date", label: "Ngày chi", width: "110px" },
  { key: "source", label: "Nguồn", width: "170px" },
  { key: "content", label: "Nội dung", width: "250px" },
  { key: "item", label: "Khoản mục", width: "200px" },
  { key: "payer", label: "Người chi", width: "150px" },
  { key: "creator", label: "Người tạo", width: "150px" },
  { key: "amount", label: "Số tiền", width: "130px" },
  { key: "evidence", label: "Chứng từ", width: "90px" },
  { key: "manager", label: "Quản lý kho", width: "130px" },
  { key: "accountant", label: "Kế toán kho", width: "130px" },
  { key: "batch", label: "Batch Approval", width: "160px" },
  { key: "approvalStatus", label: "Trạng thái duyệt", width: "140px" },
  { key: "cashIssued", label: "Đã chi", width: "150px" },
];

export type WarehouseExpenseCheckRole = "manager" | "accountant";

const WAREHOUSE_BRANCH_IDS = [6, 1];

const dateTimeLabel = (value?: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "";

/** Tick kiểm tra chỉ đổi được khi phiếu chưa chi và batch chưa gửi Approval. */
export function isExpenseCheckOpen(row: InternalFinanceEntry) {
  return (
    WAREHOUSE_BRANCH_IDS.includes(row.branchId) &&
    !row.cashIssued &&
    !row.cashFlow &&
    !["CANCELLED", "REJECTED"].includes(row.status) &&
    (!row.weeklyBatch || row.weeklyBatch.status === "READY")
  );
}

export function WarehouseExpenseTable({
  rows,
  isLoading,
  canCheck,
  canMarkIssued,
  canEdit,
  busyId,
  onCheck,
  onOpenAttachments,
  onEdit,
  onMarkIssued,
  shows,
}: {
  rows: InternalFinanceEntry[];
  isLoading: boolean;
  canCheck: (row: InternalFinanceEntry, role: WarehouseExpenseCheckRole) => boolean;
  canMarkIssued: (row: InternalFinanceEntry) => boolean;
  canEdit: (row: InternalFinanceEntry) => boolean;
  busyId: number | null;
  onCheck: (
    row: InternalFinanceEntry,
    role: WarehouseExpenseCheckRole,
    checked: boolean,
  ) => void;
  onOpenAttachments: (row: InternalFinanceEntry) => void;
  onEdit: (row: InternalFinanceEntry) => void;
  onMarkIssued: (row: InternalFinanceEntry) => void;
  /** Cột nào đang hiện (theo nút "Cột hiển thị" ở trang). */
  shows: (key: string) => boolean;
}) {
  const visibleCount = WAREHOUSE_EXPENSE_COLUMNS.filter((column) =>
    shows(column.key),
  ).length;
  const checkCell = (row: InternalFinanceEntry, role: WarehouseExpenseCheckRole) => {
    if (!WAREHOUSE_BRANCH_IDS.includes(row.branchId)) {
      return <span className="text-gray-400">-</span>;
    }
    const reviewer =
      role === "manager" ? row.managerReviewer : row.accountantReviewer;
    const at =
      role === "manager" ? row.managerReviewedAt : row.accountantReviewedAt;
    // Tick tính theo thời điểm kiểm tra; dòng đồng bộ về có thể không kèm tên.
    const checked = Boolean(at);
    return (
      <label
        className="inline-flex items-center gap-1.5 text-xs text-gray-700"
        title={
          checked
            ? [reviewer?.name, dateTimeLabel(at)].filter(Boolean).join(" · ")
            : undefined
        }>
        <input
          type="checkbox"
          checked={checked}
          disabled={busyId === row.id || !canCheck(row, role)}
          onChange={(event) => onCheck(row, role, event.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
        />
        {checked && reviewer && (
          <span className="max-w-[90px] truncate">{reviewer.name}</span>
        )}
      </label>
    );
  };

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            {[
              ...WAREHOUSE_EXPENSE_COLUMNS.filter((column) =>
                shows(column.key),
              ).map((column) => [column.label, column.width]),
              ["", "90px"],
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
              <td colSpan={visibleCount + 1} className="py-20 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tải...
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={visibleCount + 1} className="py-20 text-center text-gray-400">
                Không có khoản chi phù hợp
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const approvalStatus = row.weeklyBatch?.approvalRequest?.status;
              const snapshot = row.sourceSnapshot || {};
              const vehicleName =
                row.vehicle?.label ||
                row.vehicleName ||
                (snapshot.vehicle ? String(snapshot.vehicle) : "");
              const groupLabel =
                SUBCATEGORY_LABELS[row.subCategory || ""] ||
                CATEGORY_LABELS[row.category] ||
                row.category;
              return (
                <tr key={row.id} className="border-b transition-colors hover:bg-gray-50">
                  {shows("date") && (
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {displayOccurredAt({
                        occurredAt: row.occurredAt,
                        sourceType: row.sourceType,
                        sourceSnapshot: row.sourceSnapshot,
                      })}
                    </td>
                  )}
                  {shows("source") && (
                    <td className="px-4 py-2.5">
                      <div className="text-gray-900">{displaySource(row.sourceType, row.category)}</div>
                      {row.packingSlip ? (
                        <Link
                          href={`/don-hang/bao-don?Code=${encodeURIComponent(row.packingSlip.code)}`}
                          className="font-mono text-xs text-brand hover:underline">
                          {row.packingSlip.code}
                        </Link>
                      ) : vehicleName ? (
                        ["FUEL", "VEHICLE_CARE"].includes(row.category) ? (
                          <Link
                            href="/tai-chinh/xe-co"
                            className="block truncate text-xs text-brand hover:underline"
                            title={vehicleName}>
                            {vehicleName}
                          </Link>
                        ) : (
                          <div
                            className="truncate text-xs text-gray-500"
                            title={vehicleName}>
                            {vehicleName}
                          </div>
                        )
                      ) : null}
                    </td>
                  )}
                  {shows("content") && (
                    <td className="px-4 py-2.5">
                      <div className="max-w-[280px] break-words text-gray-900">
                        {row.description || "-"}
                      </div>
                      {row.quantity != null && row.unitPrice != null && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {formatCurrency(row.quantity)} ×{" "}
                          {formatCurrency(row.unitPrice)}
                        </div>
                      )}
                      {row.note && (
                        <div className="mt-0.5 max-w-[280px] break-words text-xs text-gray-500">
                          Ghi chú: {row.note}
                        </div>
                      )}
                    </td>
                  )}
                  {shows("item") && (
                    <td className="px-4 py-2.5">
                      <div className="max-w-[220px] break-words text-gray-900">
                        {row.expenseItem || groupLabel}
                      </div>
                      {row.expenseItem && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {groupLabel}
                        </div>
                      )}
                    </td>
                  )}
                  {shows("payer") && (
                    <td className="px-4 py-2.5">
                      {row.payer?.name || <span className="text-gray-400">-</span>}
                    </td>
                  )}
                  {shows("creator") && (
                    <td className="px-4 py-2.5">
                      {row.creator?.name || <span className="text-gray-400">-</span>}
                    </td>
                  )}
                  {shows("amount") && (
                    <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                      {formatCurrency(row.amount)}
                    </td>
                  )}
                  {shows("evidence") && (
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
                  )}
                  {shows("manager") && (
                    <td className="px-4 py-2.5">{checkCell(row, "manager")}</td>
                  )}
                  {shows("accountant") && (
                    <td className="px-4 py-2.5">{checkCell(row, "accountant")}</td>
                  )}
                  {shows("batch") && (
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
                  )}
                  {shows("approvalStatus") && (
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
                  )}
                  {shows("cashIssued") && (
                    <td className="px-4 py-2.5">
                      <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                        {busyId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={row.cashIssued}
                            disabled={row.cashIssued || !canMarkIssued(row)}
                            onChange={() => onMarkIssued(row)}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-50"
                          />
                        )}
                        {row.fundTransaction?.code ? (
                          <span
                            className={`font-mono ${row.fundTransaction.status === "CANCELLED" ? "text-red-600" : "text-green-700"}`}>
                            {row.fundTransaction.code}
                          </span>
                        ) : row.cashIssued ? (
                          <span className="font-medium text-green-700">Đã chi</span>
                        ) : (
                          <span className="text-gray-400">Chưa chi</span>
                        )}
                      </label>
                      {row.fundTransaction?.status === "CANCELLED" && (
                        <div className="mt-0.5 text-xs text-red-600">
                          Đã hủy giao dịch quỹ
                        </div>
                      )}
                      {row.cashIssuedReason && (
                        <div
                          className="mt-0.5 max-w-[150px] break-words text-xs text-gray-500"
                          title={row.cashIssuer?.name || undefined}>
                          Lý do: {row.cashIssuedReason}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    {canEdit(row) && !row.weeklyBatch ? (
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
