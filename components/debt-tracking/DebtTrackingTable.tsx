"use client";

import { useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  Loader2,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Repeat,
  Ticket,
} from "lucide-react";
import {
  DebtTrackingRow,
  DebtTrackingParams,
  DEBT_FORM_LABELS,
  describeDebtPolicy,
} from "@/lib/api/debt-tracking";
import { PaymentHistoryCell } from "./PaymentHistoryCell";
import { useDebtTracking } from "@/lib/hooks/useDebtTracking";
import { usePermission } from "@/lib/hooks/usePermissions";
import { DebtStatusBadge, ROW_TINT } from "./DebtStatusBadge";
import { DebtNoteCell } from "./DebtNoteCell";
import { DebtPolicyModal } from "./DebtPolicyModal";
import { StopDeliveryDetailModal } from "./StopDeliveryDetailModal";
import { useCreateStopDeliveryTicket } from "@/lib/hooks/useDebtTickets";
import { useCloseDebtTicket } from "@/lib/hooks/useDebtTickets";
import { formatCurrency } from "@/lib/utils";
import CodeLink from "../shared/CodeLink";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";

export function DebtTrackingTable({
  params,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  params: DebtTrackingParams;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { data, isLoading, isFetching } = useDebtTracking(params);
  const canEditPolicy = usePermission("debt_tracking", "update_policy");
  const canNote = true;
  const canCreateTicket = usePermission("debt_tickets", "create");
  const createStop = useCreateStopDeliveryTicket();
  const closeStop = useCloseDebtTicket();
  const canOverridePaymentHistory = usePermission(
    "debt_tracking",
    "update_policy"
  );

  const [policyTarget, setPolicyTarget] = useState<DebtTrackingRow | null>(
    null
  );
  const [ticketTarget, setTicketTarget] = useState<{ row: DebtTrackingRow; ticket: NonNullable<DebtTrackingRow["openTicket"]> } | null>(null);
  const [creatingCustomerId, setCreatingCustomerId] = useState<number | null>(null);
  const [closingCustomerId, setClosingCustomerId] = useState<number | null>(null);

  const rows = data?.data ?? [];
  const pg = data?.pagination;

  const handleCloseStop = async (row: DebtTrackingRow) => {
    if (!row.openTicket) return;
    const result = await Swal.fire({
      title: "Kết thúc ngừng đi hàng?",
      text: "Kết thúc thủ công sẽ mở lại quyền tạo hóa đơn và đi hàng, không phụ thuộc số tiền đã thanh toán.",
      input: "textarea",
      inputPlaceholder: "Lý do kết thúc…",
      showCancelButton: true,
      confirmButtonText: "Kết thúc",
      cancelButtonText: "Hủy",
      inputValidator: (value) =>
        !value?.trim() ? "Vui lòng nhập lý do" : undefined,
    });
    if (!result.isConfirmed || !result.value) return;

    setClosingCustomerId(row.customerId);
    closeStop.mutate(
      { id: row.openTicket.ticketId, reason: result.value, finalStatus: "DONE" },
      { onSettled: () => setClosingCustomerId(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
        <Inbox className="w-12 h-12 mb-3" />
        <p className="text-sm">Không có khách hàng nào cần theo dõi công nợ</p>
        <p className="text-xs mt-1">
          Khách chỉ hiện ở đây khi đã bật hạn mức hoặc kỳ hạn công nợ và đang có
          dư nợ.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-600">
            <tr className="border-b">
              <th className="text-left px-3 py-2.5 font-medium">Khách hàng</th>
              <th className="text-left px-3 py-2.5 font-medium">
                Hình thức / Loại công nợ
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Lịch sử thanh toán
              </th>
              <th className="text-right px-3 py-2.5 font-medium">
                Nợ hiện tại
              </th>
              <th className="text-right px-3 py-2.5 font-medium">
                Hạn mức / Vượt
              </th>
              <th className="text-right px-3 py-2.5 font-medium">Cần thu</th>
              <th className="text-right px-3 py-2.5 font-medium">Quá hạn HĐ</th>
              <th className="text-left px-3 py-2.5 font-medium">
                Hạn gần nhất
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Thanh toán gần nhất
              </th>
              <th className="text-left px-3 py-2.5 font-medium">
                Trạng thái nợ
              </th>
              <th className="text-left px-3 py-2.5 font-medium">Phiếu</th>
              <th className="text-left px-3 py-2.5 font-medium">Ngừng đi hàng</th>
              <th className="text-left px-3 py-2.5 font-medium">Ghi chú</th>
              <th className="px-3 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr
                key={r.customerId}
                className={`transition-colors ${ROW_TINT[r.debtStatus]}`}>
                <td className="px-3 py-2 align-top">
                  <Link
                    href={`/khach-hang?Code=${encodeURIComponent(
                      r.code ?? r.name
                    )}`}
                    target="_blanks"
                    className="font-medium hover:text-brand hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-gray-400">
                    <CodeLink entity="customer" code={r.code} />
                    {r.contactNumber ? ` · ${r.contactNumber}` : ""}
                  </div>
                  {r.policy.salePic && (
                    <div className="text-xs text-gray-400">
                      Sale: {r.policy.salePic.name}
                    </div>
                  )}
                </td>

                <td className="px-3 py-2 align-top text-xs">
                  {r.policy.debtForm && (
                    <div className="text-gray-700">
                      {DEBT_FORM_LABELS[r.policy.debtForm]}
                    </div>
                  )}
                  <div className="text-gray-500">
                    {describeDebtPolicy(r.policy)}
                  </div>
                </td>

                <td className="px-3 py-2 align-top">
                  <PaymentHistoryCell
                    customerId={r.customerId}
                    value={r.policy.paymentHistory!}
                    canOverride={canOverridePaymentHistory}
                  />
                </td>

                <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                  {formatCurrency(r.totalDebt)}
                  {r.unallocatedAmount > 0 && (
                    <div
                      className="text-[11px] text-gray-400 font-normal"
                      title="Nợ cũ không gắn được hóa đơn nào nên chưa tính được hạn">
                      Nợ cũ: {formatCurrency(r.unallocatedAmount)}
                    </div>
                  )}
                </td>

                <td className="px-3 py-2 align-top text-right text-xs tabular-nums">
                  {r.creditLimit ? (
                    <>
                      <div>{formatCurrency(r.creditLimit)}</div>
                      {r.overLimitAmount > 0 ? (
                        <div className="text-red-600 font-medium">
                          +{formatCurrency(r.overLimitAmount)}
                        </div>
                      ) : null}
                      {r.creditUsageRatio !== null && (
                        <div
                          className={
                            r.creditUsageRatio >= 1
                              ? "text-red-600 font-medium"
                              : r.creditUsageRatio >= 0.8
                                ? "text-amber-600"
                                : "text-gray-400"
                          }>
                          {Math.round(r.creditUsageRatio * 100)}%
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                <td className="px-3 py-2 align-top text-right tabular-nums">
                  {r.requiredPaymentAmount > 0 ? (
                    <>
                      <div className="font-semibold text-red-700">
                        {formatCurrency(r.requiredPaymentAmount)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {r.requiredPaymentSource === "CREDIT_LIMIT"
                          ? "Theo hạn mức"
                          : r.requiredPaymentSource === "INVOICE"
                            ? "Theo hóa đơn"
                            : "Hai nguồn bằng nhau"}
                      </div>
                      {r.limitOverdueAmount > 0 &&
                        r.invoiceRequiredAmount > 0 && (
                          <div className="text-[11px] text-gray-400">
                            HM {formatCurrency(r.limitOverdueAmount)} · HĐ{" "}
                            {formatCurrency(r.invoiceRequiredAmount)}
                          </div>
                        )}
                    </>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                <td className="px-3 py-2 align-top text-right tabular-nums">
                  {r.overdueAmount > 0 ? (
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(r.overdueAmount)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                  {r.maxDaysOverdue > 0 && (
                    <div className="text-[11px] text-red-500">
                      {r.maxDaysOverdue} ngày
                    </div>
                  )}
                </td>

                <td className="px-3 py-2 align-top text-xs">
                  {fmtDate(r.nearestDueDate)}
                  {r.undeliveredAmount > 0 && (
                    <div
                      className="text-[11px] text-gray-400"
                      title="Phần nợ thuộc hóa đơn chưa báo đơn giao hàng nên chưa phát sinh hạn">
                      Chưa báo đơn: {formatCurrency(r.undeliveredAmount)}
                    </div>
                  )}
                  {r.dueAmount > 0 && (
                    <div className="text-[11px] font-medium text-orange-600">
                      Đến hạn: {formatCurrency(r.dueAmount)}
                    </div>
                  )}
                  {r.dueSoonAmount > 0 && (
                    <div className="text-[11px] text-amber-600">
                      Sắp hạn: {formatCurrency(r.dueSoonAmount)}
                    </div>
                  )}
                </td>

                <td className="px-3 py-2 align-top text-xs">
                  {r.lastPayment ? (
                    <>
                      <div className="tabular-nums font-medium text-green-700">
                        {formatCurrency(r.lastPayment.amount)}
                      </div>
                      <div className="text-gray-400">
                        {fmtDate(r.lastPayment.transDate)}
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-300">Chưa có</span>
                  )}
                  {r.paymentFrequency && (
                    <div
                      className={`inline-flex items-center gap-1 mt-0.5 ${
                        r.paymentFrequency.met
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                      title="Cam kết tần suất trả tiền trong tháng">
                      <Repeat className="w-3 h-3" />
                      {r.paymentFrequency.paymentsThisMonth}/
                      {r.paymentFrequency.required} lần
                    </div>
                  )}
                </td>

                <td className="px-3 py-2 align-top">
                  <DebtStatusBadge
                    status={r.debtStatus}
                    daysOverdue={r.maxDaysOverdue}
                  />
                </td>

                <td className="px-3 py-2 align-top text-xs">
                  {r.openTicket ? <button onClick={() => setTicketTarget({ row: r, ticket: r.openTicket! })} className="text-brand font-medium hover:underline">{r.openTicket.ticketCode}</button> : r.latestStopTicket ? <button onClick={() => setTicketTarget({ row: r, ticket: r.latestStopTicket! })} className="text-gray-500 font-medium hover:underline">{r.latestStopTicket.ticketCode}</button> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 align-top text-xs">
                   {r.openTicket?.ticketType === "STOP_DELIVERY" ? <button onClick={() => void handleCloseStop(r)} disabled={closingCustomerId === r.customerId} className="text-amber-700 font-medium hover:underline disabled:opacity-50">{closingCustomerId === r.customerId ? "Đang kết thúc…" : "Kết thúc"}</button> : canCreateTicket ? <button onClick={() => { setCreatingCustomerId(r.customerId); createStop.mutate({ customerId: r.customerId }, { onSettled: () => setCreatingCustomerId(null) }); }} disabled={creatingCustomerId === r.customerId} className="inline-flex items-center gap-1 text-brand font-medium hover:underline disabled:opacity-50"><Ticket className="w-3.5 h-3.5" />{creatingCustomerId === r.customerId ? "Đang tạo…" : "Tạo phiếu"}</button> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 align-top">
                   <DebtNoteCell customerId={r.customerId} value={r.note} canEdit={canNote} />
                </td>

                <td className="px-3 py-2 align-top">
                  {canEditPolicy && (
                    <button
                      onClick={() => setPolicyTarget(r)}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Thiết lập công nợ">
                      <Settings2 className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pg && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t bg-white text-sm">
          <div className="flex items-center gap-3 text-gray-500">
            <span>
              {(pg.page - 1) * pg.pageSize + 1}–
              {Math.min(pg.page * pg.pageSize, pg.total)} / {pg.total}
              {isFetching && (
                <Loader2 className="w-3 h-3 animate-spin inline ml-2" />
              )}
            </span>
            <label className="flex items-center gap-1.5 whitespace-nowrap">
              Hiển thị
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm text-gray-700 bg-white"
              >
                {[20, 30, 50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size} dòng/trang
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1">
            {pg.totalPages > 1 && (
              <>
                <button
                  disabled={pg.page <= 1}
                  onClick={() => onPageChange(pg.page - 1)}
                  className="p-1.5 border rounded disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2">
                  {pg.page} / {pg.totalPages}
                </span>
                <button
                  disabled={pg.page >= pg.totalPages}
                  onClick={() => onPageChange(pg.page + 1)}
                  className="p-1.5 border rounded disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {policyTarget && (
        <DebtPolicyModal
          customerId={policyTarget.customerId}
          customerName={policyTarget.name}
          onClose={() => setPolicyTarget(null)}
        />
      )}
      {ticketTarget && <StopDeliveryDetailModal row={ticketTarget.row} ticket={ticketTarget.ticket} onClose={() => setTicketTarget(null)} />}
    </div>
  );
}
