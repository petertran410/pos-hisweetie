"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  FileText,
  Loader2,
  MessageSquareText,
  Paperclip,
} from "lucide-react";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import {
  displayOccurredAt,
  displaySource,
  displayDescription,
} from "@/lib/internal-finance/display";
import { officeVoucherDetails } from "@/lib/internal-finance/office";
import { formatCurrency } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  DELIVERY_FEE: "Chi phí giao hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  OTHER_EXPENSE: "Chi phí khác",
  CASH_FUND_EXPENSE: "Chi quỹ tiền mặt",
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
  { key: "code", label: "Mã phiếu", width: "190px" },
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

/**
 * Văn phòng: phiếu sinh từ đơn PHIẾU CHI Lark, không có tick kiểm tra hay
 * Approval tuần; thêm phòng ban, phương thức, tổng tiền / tiền mặt.
 */
export const OFFICE_EXPENSE_COLUMNS = [
  { key: "code", label: "Mã phiếu", width: "190px" },
  { key: "date", label: "Ngày chi", width: "110px" },
  { key: "source", label: "Nguồn", width: "170px" },
  { key: "content", label: "Nội dung", width: "250px" },
  { key: "department", label: "Phòng ban", width: "170px" },
  { key: "item", label: "Khoản mục", width: "200px" },
  { key: "payer", label: "Người đề xuất", width: "150px" },
  { key: "method", label: "Phương thức", width: "170px" },
  { key: "amount", label: "Tiền mặt", width: "130px" },
  { key: "evidence", label: "Chứng từ", width: "90px" },
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

/** Cùng luật với backend: chưa Đã chi, chưa hủy, chưa vào Approval tuần đã gửi. */
export function isExpenseCancellable(row: InternalFinanceEntry) {
  return (
    !row.cashIssued &&
    !row.cashFlow &&
    row.status !== "CANCELLED" &&
    (!row.weeklyBatch || row.weeklyBatch.status === "READY")
  );
}

export function WarehouseExpenseTable({
  rows,
  isLoading,
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
  shows,
  selection,
  sort,
  onSort,
  totals,
  columns = WAREHOUSE_EXPENSE_COLUMNS,
}: {
  /** Bộ cột của bảng: kho (mặc định) hoặc văn phòng. */
  columns?: Array<{ key: string; label: string; width: string }>;
  /** Cột đang sắp xếp (null: mặc định ngày chi mới nhất trước). */
  sort?: { key: "date" | "amount"; dir: "asc" | "desc" } | null;
  onSort?: (key: "date" | "amount") => void;
  /** Dòng tổng dưới tên cột: tổng toàn bộ phiếu khớp bộ lọc. */
  totals?: { amount: number; issuedAmount: number };
  /** Chọn nhiều phiếu để tick hàng loạt; không truyền thì không có cột chọn. */
  selection?: {
    selected: Set<number>;
    /** null: chọn được; chuỗi: lý do không chọn được. */
    blockReason: (row: InternalFinanceEntry) => string | null;
    onToggle: (id: number) => void;
    onToggleAll: (ids: number[], checked: boolean) => void;
  };
  rows: InternalFinanceEntry[];
  isLoading: boolean;
  canCheck: (
    row: InternalFinanceEntry,
    role: WarehouseExpenseCheckRole,
  ) => boolean;
  canMarkIssued: (row: InternalFinanceEntry) => boolean;
  canEdit: (row: InternalFinanceEntry) => boolean;
  canCancel: (row: InternalFinanceEntry) => boolean;
  busyId: number | null;
  /** Dòng mở từ link (?Code=) được tô sáng. */
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
  /** Cột nào đang hiện (theo nút "Cột hiển thị" ở trang). */
  shows: (key: string) => boolean;
}) {
  const columnKeys = new Set(columns.map((column) => column.key));
  // Ô chỉ vẽ khi cột thuộc bộ cột đang dùng và chưa bị ẩn.
  const visible = (key: string) => columnKeys.has(key) && shows(key);
  const visibleCount =
    columns.filter((column) => shows(column.key)).length + (selection ? 1 : 0);
  const selectableIds = selection
    ? rows.filter((row) => !selection.blockReason(row)).map((row) => row.id)
    : [];
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selection?.selected.has(id));
  const checkCell = (
    row: InternalFinanceEntry,
    role: WarehouseExpenseCheckRole,
  ) => {
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
            {selection && (
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  title="Chọn tất cả phiếu tick được trên trang"
                  checked={allSelected}
                  disabled={!selectableIds.length}
                  onChange={(event) =>
                    selection.onToggleAll(selectableIds, event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-40"
                />
              </th>
            )}
            {columns
              .filter((column) => shows(column.key))
              .map((column) => {
                const sortable =
                  Boolean(onSort) &&
                  (column.key === "date" || column.key === "amount");
                const active = sortable && sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    onClick={
                      sortable
                        ? () => onSort?.(column.key as "date" | "amount")
                        : undefined
                    }
                    className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                      column.key === "amount" ? "text-right" : "text-left"
                    } ${sortable ? "cursor-pointer select-none hover:bg-gray-100" : ""}`}
                    style={{ width: column.width, minWidth: column.width }}>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        column.key === "amount" ? "justify-end" : ""
                      }`}>
                      {column.label}
                      {sortable &&
                        (active && sort?.dir === "desc" ? (
                          <ArrowDown className="h-3 w-3 text-brand" />
                        ) : active && sort?.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3 text-brand" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-gray-400 opacity-40" />
                        ))}
                    </span>
                  </th>
                );
              })}
            <th style={{ width: "150px", minWidth: "150px" }} />
          </tr>
          {totals && (visible("amount") || visible("cashIssued")) && (
            <tr className="border-b bg-gray-50/60">
              {selection && <td className="px-3 py-2" />}
              {columns
                .filter((column) => shows(column.key))
                .map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-2 ${
                      column.key === "amount" ? "text-right" : ""
                    }`}>
                    {column.key === "amount" ? (
                      <span className="font-semibold text-red-600">
                        {formatCurrency(totals.amount)}
                      </span>
                    ) : column.key === "cashIssued" ? (
                      <span
                        className="font-semibold text-green-700"
                        title="Tổng tiền các phiếu đã tick Đã chi">
                        {formatCurrency(totals.issuedAmount)}
                      </span>
                    ) : null}
                  </td>
                ))}
              <td className="px-4 py-2" />
            </tr>
          )}
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
              <td
                colSpan={visibleCount + 1}
                className="py-20 text-center text-gray-400">
                Không có khoản chi phù hợp
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              // Phiếu văn phòng từ đơn Lark: còn hiệu lực là đã duyệt, hủy là thu hồi.
              const fromLark = row.sourceType === "LARK_APPROVAL";
              const approvalStatus =
                row.weeklyBatch?.approvalRequest?.status ??
                (fromLark
                  ? row.status === "CANCELLED"
                    ? "REVERTED"
                    : "APPROVED"
                  : undefined);
              const snapshot = row.sourceSnapshot || {};
              const details = officeVoucherDetails(row.sourceSnapshot);
              const vehicleName =
                row.vehicle?.label ||
                row.vehicleName ||
                (snapshot.vehicle ? String(snapshot.vehicle) : "");
              const groupLabel =
                SUBCATEGORY_LABELS[row.subCategory || ""] ||
                CATEGORY_LABELS[row.category] ||
                row.category;
              const cancelled = row.status === "CANCELLED";
              const noteCount = row._count?.reviewNotes || 0;
              return (
                <tr
                  key={row.id}
                  className={`border-b transition-colors ${
                    highlightId === row.id
                      ? "bg-brand-soft"
                      : cancelled
                        ? "bg-gray-50 text-gray-400"
                        : selection?.selected.has(row.id)
                          ? "bg-brand-soft/60"
                          : "hover:bg-gray-50"
                  }`}>
                  {selection && (
                    <td className="w-10 px-3 py-2.5">
                      {(() => {
                        const block = selection.blockReason(row);
                        return (
                          <input
                            type="checkbox"
                            title={block || "Chọn để tick hàng loạt"}
                            checked={selection.selected.has(row.id)}
                            disabled={Boolean(block)}
                            onChange={() => selection.onToggle(row.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand disabled:opacity-30"
                          />
                        );
                      })()}
                    </td>
                  )}
                  {visible("code") && (
                    <td className="px-4 py-2.5">
                      <div
                        className={`font-mono text-xs ${cancelled ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {row.code}
                      </div>
                      {cancelled && (
                        <div
                          className="mt-1 max-w-[180px] break-words text-xs text-red-600"
                          title={[
                            row.canceller?.name,
                            dateTimeLabel(row.cancelledAt),
                          ]
                            .filter(Boolean)
                            .join(" · ")}>
                          <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium">
                            Đã hủy
                          </span>
                          {row.cancelReason && (
                            <span className="ml-1">{row.cancelReason}</span>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                  {visible("date") && (
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {displayOccurredAt({
                        occurredAt: row.occurredAt,
                        sourceType: row.sourceType,
                        sourceSnapshot: row.sourceSnapshot,
                      })}
                    </td>
                  )}
                  {visible("source") && (
                    <td className="px-4 py-2.5">
                      <div className="text-gray-900">
                        {displaySource(row.sourceType, row.category)}
                      </div>
                      {fromLark && (
                        <Link
                          href={`/tai-chinh/don-lark-approval?search=${encodeURIComponent(row.code)}`}
                          className="text-xs text-brand hover:underline">
                          Xem đơn Lark
                        </Link>
                      )}
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
                  {visible("content") && (
                    <td className="px-4 py-2.5">
                      <div className="max-w-[280px] break-words text-gray-900">
                        {displayDescription(row.description) || "-"}
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
                  {visible("department") && (
                    <td className="px-4 py-2.5">
                      <div className="max-w-[180px] break-words text-gray-900">
                        {details.department || (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      {details.expenseType && (
                        <div className="mt-0.5 max-w-[180px] break-words text-xs text-gray-500">
                          {details.expenseType}
                        </div>
                      )}
                    </td>
                  )}
                  {visible("item") && (
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
                  {visible("payer") && (
                    <td className="px-4 py-2.5">
                      {row.payer?.name || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {visible("method") && (
                    <td className="px-4 py-2.5">
                      <div className="max-w-[180px] break-words text-gray-900">
                        {details.method || (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      {details.cashSource && (
                        <div className="mt-0.5 text-xs text-gray-500">
                          {details.cashSource}
                        </div>
                      )}
                    </td>
                  )}
                  {visible("creator") && (
                    <td className="px-4 py-2.5">
                      {row.creator?.name || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  {visible("amount") && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(row.amount)}
                      </div>
                      {/* Đơn trộn chuyển khoản + tiền mặt: quỹ chỉ trừ phần tiền mặt. */}
                      {details.totalAmount &&
                        details.totalAmount !== Number(row.amount) && (
                          <div
                            className="mt-0.5 whitespace-nowrap text-xs text-gray-500"
                            title="Tổng tiền của đơn; phần còn lại chuyển khoản">
                            Tổng {formatCurrency(details.totalAmount)}
                            {details.transferAmount
                              ? ` · CK ${formatCurrency(details.transferAmount)}`
                              : ""}
                          </div>
                        )}
                    </td>
                  )}
                  {visible("evidence") && (
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
                  {visible("manager") && (
                    <td className="px-4 py-2.5">{checkCell(row, "manager")}</td>
                  )}
                  {visible("accountant") && (
                    <td className="px-4 py-2.5">
                      {checkCell(row, "accountant")}
                    </td>
                  )}
                  {visible("batch") && (
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
                  {visible("approvalStatus") && (
                    <td className="px-4 py-2.5">
                      {approvalStatus ? (
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                            APPROVAL_STATUS_CLASS[approvalStatus] ||
                            "bg-gray-100 text-gray-600"
                          }`}>
                          {APPROVAL_STATUS_LABELS[approvalStatus] ||
                            approvalStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Chưa gửi</span>
                      )}
                    </td>
                  )}
                  {visible("cashIssued") && (
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
                          <span className="font-medium text-green-700">
                            Đã chi
                          </span>
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
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenNotes(row)}
                        title="Ghi chú & yêu cầu xem lại"
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <MessageSquareText className="h-3.5 w-3.5" />
                        {noteCount > 0 && noteCount}
                      </button>
                      {canEdit(row) && !row.weeklyBatch && (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          title="Sửa khoản chi"
                          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                          <FileText className="h-3.5 w-3.5" />
                          Sửa
                        </button>
                      )}
                      {canCancel(row) && (
                        <button
                          type="button"
                          onClick={() => onCancel(row)}
                          title="Hủy phiếu chi"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">
                          <Ban className="h-3.5 w-3.5" />
                          Hủy
                        </button>
                      )}
                    </div>
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
