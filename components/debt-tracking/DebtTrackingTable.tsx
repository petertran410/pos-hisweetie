"use client";

import { useEffect, useRef, useState } from "react";
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
  MessageCircle,
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
import { DebtCollectionAttemptCell } from "./DebtCollectionAttemptCell";
import { DebtPolicyModal } from "./DebtPolicyModal";
import { StopDeliveryDetailModal } from "./StopDeliveryDetailModal";
import { useCreateStopDeliveryTicket } from "@/lib/hooks/useDebtTickets";
import { useCloseStopDeliveryTicket } from "@/lib/hooks/useDebtTickets";
import { useNotifySaleDebt } from "@/lib/hooks/useDebtTracking";
import { formatCurrency } from "@/lib/utils";
import CodeLink from "../shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";

const DEFAULT_COLUMNS: ColumnConfig<DebtTrackingRow>[] = [
  { key: "customer", label: "Khách hàng", visible: true, width: "240px", render: () => null },
  { key: "rule", label: "Hình thức / Loại công nợ", visible: true, width: "180px", render: () => null },
  { key: "paymentHistory", label: "Lịch sử thanh toán", visible: true, width: "175px", render: () => null },
  { key: "totalDebt", label: "Nợ hiện tại", visible: true, width: "140px", render: () => null },
  { key: "creditLimit", label: "Hạn mức / Vượt", visible: true, width: "145px", render: () => null },
  { key: "requiredPayment", label: "Cần thu", visible: true, width: "155px", render: () => null },
  { key: "overdueAmount", label: "Quá hạn HĐ", visible: true, width: "130px", render: () => null },
  { key: "nearestDueDate", label: "Hạn gần nhất", visible: true, width: "145px", render: () => null },
  { key: "lastPayment", label: "Thanh toán gần nhất", visible: true, width: "150px", render: () => null },
  { key: "accountantAttempts", label: "Kế toán đòi nợ", visible: true, width: "150px", render: () => null },
  { key: "notify", label: "Gửi tin nhắn", visible: true, width: "125px", render: () => null },
  { key: "salesAttempts", label: "Sale đòi nợ", visible: true, width: "135px", render: () => null },
  { key: "status", label: "Trạng thái nợ", visible: true, width: "125px", render: () => null },
  { key: "ticket", label: "Phiếu", visible: true, width: "115px", render: () => null },
  { key: "stopDelivery", label: "Ngừng đi hàng", visible: true, width: "135px", render: () => null },
  { key: "note", label: "Ghi chú", visible: true, width: "170px", render: () => null },
];

export function DebtTrackingTable({
  params,
  selectedCustomerIds,
  onSelectedCustomerIdsChange,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  params: DebtTrackingParams;
  selectedCustomerIds: number[];
  onSelectedCustomerIdsChange: (ids: number[]) => void;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { data, isLoading, isFetching } = useDebtTracking(params);
  const canEditPolicy = usePermission("debt_tracking", "update_policy");
  const canNote = true;
  // Quyền mới thuộc nhóm theo dõi công nợ; fallback quyền cũ để không làm
  // gián đoạn người dùng đã được cấp `debt_tickets:create`.
  const canCreateStopDeliveryByTracking = usePermission(
    "debt_tracking",
    "stop_delivery",
  );
  const canCreateStopDeliveryLegacy = usePermission("debt_tickets", "create");
  const canCreateStopDelivery =
    canCreateStopDeliveryByTracking || canCreateStopDeliveryLegacy;
  const canCloseStopDeliveryByTracking = usePermission(
    "debt_tracking",
    "close_stop_delivery",
  );
  const canCloseStopDeliveryLegacy = usePermission("debt_tickets", "cancel");
  const canCloseStopDelivery =
    canCloseStopDeliveryByTracking || canCloseStopDeliveryLegacy;
  const createStop = useCreateStopDeliveryTicket();
  const closeStop = useCloseStopDeliveryTicket();
  const notifySaleDebt = useNotifySaleDebt();
  const [notifyingCustomerId, setNotifyingCustomerId] = useState<number | null>(
    null,
  );
  const canOverridePaymentHistory = usePermission(
    "debt_tracking",
    "update_policy"
  );

  const [policyTarget, setPolicyTarget] = useState<DebtTrackingRow | null>(
    null
  );
  const [ticketTarget, setTicketTarget] = useState<{
    row: DebtTrackingRow;
    ticket: NonNullable<DebtTrackingRow["openTicket"]>;
  } | null>(null);
  const [creatingCustomerId, setCreatingCustomerId] = useState<number | null>(
    null
  );
  const [closingCustomerId, setClosingCustomerId] = useState<number | null>(
    null
  );
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [scrollbarMetrics, setScrollbarMetrics] = useState({
    visible: false,
    thumbWidth: 100,
    thumbLeft: 0,
  });
  const dragStateRef = useRef<{ startX: number; startScrollLeft: number } | null>(
    null,
  );

  const rows = data?.data ?? [];
  const pg = data?.pagination;
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility<DebtTrackingRow>(
    "debtTrackingTableColumns",
    DEFAULT_COLUMNS,
  );
  const isColumnVisible = (key: string) =>
    visibleColumns.some((column) => column.key === key);
  const columnClass = (key: string) => (isColumnVisible(key) ? "" : "hidden");
  const columnStyle = (key: string) => {
    const column = columns.find((item) => item.key === key);
    return column ? { width: column.width, minWidth: column.width } : undefined;
  };
  const selectableRows = rows;
  const allSelectableSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedCustomerIds.includes(row.customerId));

  const toggleCustomer = (customerId: number, checked: boolean) => {
    onSelectedCustomerIdsChange(
      checked
        ? [...new Set([...selectedCustomerIds, customerId])]
        : selectedCustomerIds.filter((id) => id !== customerId)
    );
  };

  useEffect(() => {
    const scrollElement = tableScrollRef.current;
    if (!scrollElement) return;

    const updateScrollbar = () => {
      const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
      if (maxScrollLeft <= 1) {
        setScrollbarMetrics({ visible: false, thumbWidth: 100, thumbLeft: 0 });
        return;
      }
      const thumbWidth = Math.max(
        12,
        (scrollElement.clientWidth / scrollElement.scrollWidth) * 100,
      );
      const thumbLeft =
        (scrollElement.scrollLeft / maxScrollLeft) * (100 - thumbWidth);
      setScrollbarMetrics({ visible: true, thumbWidth, thumbLeft });
    };

    updateScrollbar();
    scrollElement.addEventListener("scroll", updateScrollbar, {
      passive: true,
    });
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(scrollElement);
    if (scrollElement.firstElementChild) {
      observer.observe(scrollElement.firstElementChild);
    }
    return () => {
      scrollElement.removeEventListener("scroll", updateScrollbar);
      observer.disconnect();
    };
  }, [rows.length, visibleColumns.length]);

  const handleScrollbarTrackPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const scrollElement = tableScrollRef.current;
    if (!scrollElement) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    scrollElement.scrollLeft =
      ratio * (scrollElement.scrollWidth - scrollElement.clientWidth);
  };

  const handleScrollbarThumbPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const scrollElement = tableScrollRef.current;
    if (!scrollElement) return;
    event.stopPropagation();
    event.preventDefault();
    dragStateRef.current = {
      startX: event.clientX,
      startScrollLeft: scrollElement.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleScrollbarThumbPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const scrollElement = tableScrollRef.current;
    const dragState = dragStateRef.current;
    if (!scrollElement || !dragState) return;
    const trackWidth = event.currentTarget.parentElement?.clientWidth ?? 1;
    const maxScrollLeft = scrollElement.scrollWidth - scrollElement.clientWidth;
    const thumbWidthPx = (scrollbarMetrics.thumbWidth / 100) * trackWidth;
    const availableTrack = Math.max(1, trackWidth - thumbWidthPx);
    scrollElement.scrollLeft =
      dragState.startScrollLeft +
      ((event.clientX - dragState.startX) / availableTrack) * maxScrollLeft;
  };

  const handleScrollbarThumbPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
    if (!result.isConfirmed || !result.value || !canCloseStopDelivery) return;

    setClosingCustomerId(row.customerId);
    closeStop.mutate(
      {
        id: row.openTicket.ticketId,
        reason: result.value,
        finalStatus: "DONE",
      },
      { onSettled: () => setClosingCustomerId(null) }
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
      <div className="flex items-center justify-end border-b bg-white px-3 py-2">
        <ColumnToggle columns={columns} onToggle={toggleColumn} />
      </div>
      <div
        ref={tableScrollRef}
        id="debt-tracking-table-scroll"
        className="debt-table-scroll flex-1"
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs text-gray-600">
            <tr className="border-b">
              <th className="px-3 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelectableSelected}
                  disabled={selectableRows.length === 0}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onSelectedCustomerIdsChange([
                        ...new Set([
                          ...selectedCustomerIds,
                          ...selectableRows.map((row) => row.customerId),
                        ]),
                      ]);
                    } else {
                      const ids = new Set(
                        selectableRows.map((row) => row.customerId)
                      );
                      onSelectedCustomerIdsChange(
                        selectedCustomerIds.filter((id) => !ids.has(id))
                      );
                    }
                  }}
                  aria-label="Chọn tất cả khách có thể gửi Lark"
                />
                <span className="sr-only">
                  Chọn tất cả khách đang hiển thị để gửi nhắc công nợ
                </span>
              </th>
              <th className={`${columnClass("customer")} text-left px-3 py-2.5 font-medium`} style={columnStyle("customer")}>Khách hàng</th>
              <th className={`${columnClass("rule")} text-left px-3 py-2.5 font-medium`} style={columnStyle("rule")}>
                Hình thức / Loại công nợ
              </th>
              <th className={`${columnClass("paymentHistory")} text-left px-3 py-2.5 font-medium`} style={columnStyle("paymentHistory")}>
                Lịch sử thanh toán
              </th>
              <th className={`${columnClass("totalDebt")} text-right px-3 py-2.5 font-medium`} style={columnStyle("totalDebt")}>
                Nợ hiện tại
              </th>
              <th className={`${columnClass("creditLimit")} text-right px-3 py-2.5 font-medium`} style={columnStyle("creditLimit")}>
                Hạn mức / Vượt
              </th>
              <th className={`${columnClass("requiredPayment")} text-right px-3 py-2.5 font-medium`} style={columnStyle("requiredPayment")}>Cần thu</th>
              <th className={`${columnClass("overdueAmount")} text-right px-3 py-2.5 font-medium`} style={columnStyle("overdueAmount")}>Quá hạn HĐ</th>
              <th className={`${columnClass("nearestDueDate")} text-left px-3 py-2.5 font-medium`} style={columnStyle("nearestDueDate")}>
                Hạn gần nhất
              </th>
              <th className={`${columnClass("lastPayment")} text-left px-3 py-2.5 font-medium`} style={columnStyle("lastPayment")}>
                Thanh toán gần nhất
              </th>
              <th className={`${columnClass("accountantAttempts")} text-left px-3 py-2.5 font-medium`} style={columnStyle("accountantAttempts")}>
                Kế toán đòi nợ
              </th>
              <th className={`${columnClass("notify")} text-left px-3 py-2.5 font-medium`} style={columnStyle("notify")}>
                Gửi tin nhắn
              </th>
              <th className={`${columnClass("salesAttempts")} text-left px-3 py-2.5 font-medium`} style={columnStyle("salesAttempts")}>Sale đòi nợ</th>
              <th className={`${columnClass("status")} text-left px-3 py-2.5 font-medium`} style={columnStyle("status")}>
                Trạng thái nợ
              </th>
              <th className={`${columnClass("ticket")} text-left px-3 py-2.5 font-medium`} style={columnStyle("ticket")}>Phiếu</th>
              <th className={`${columnClass("stopDelivery")} text-left px-3 py-2.5 font-medium`} style={columnStyle("stopDelivery")}>
                Ngừng đi hàng
              </th>
              <th className={`${columnClass("note")} text-left px-3 py-2.5 font-medium`} style={columnStyle("note")}>Ghi chú</th>
              <th className="px-3 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr
                key={r.customerId}
                className={`transition-colors ${ROW_TINT[r.debtStatus]}`}>
                <td className="px-3 py-2 align-top text-center">
                  <input
                    type="checkbox"
                    checked={selectedCustomerIds.includes(r.customerId)}
                    onChange={(event) =>
                      toggleCustomer(r.customerId, event.target.checked)
                    }
                    title={
                      r.policy.salePic
                        ? r.policy.salePic.canNotify !== false
                          ? "Chọn để gửi nhắc công nợ"
                          : "Sale PIC chưa có tài khoản Lark"
                        : "Khách chưa có Sale PIC"
                    }
                    aria-label={`Chọn ${r.name}`}
                  />
                </td>
                <td className={`${columnClass("customer")} px-3 py-2 align-top`} style={columnStyle("customer")}>
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
                </td>

                <td className={`${columnClass("rule")} px-3 py-2 align-top text-xs`} style={columnStyle("rule")}>
                  {r.policy.debtForm && (
                    <div className="text-gray-700">
                      {DEBT_FORM_LABELS[r.policy.debtForm]}
                    </div>
                  )}
                  <div className="text-gray-500">
                    {describeDebtPolicy(r.policy)}
                  </div>
                </td>

                <td className={`${columnClass("paymentHistory")} px-3 py-2 align-top`} style={columnStyle("paymentHistory")}>
                  <PaymentHistoryCell
                    customerId={r.customerId}
                    value={r.policy.paymentHistory!}
                    canOverride={canOverridePaymentHistory}
                  />
                </td>

                <td className={`${columnClass("totalDebt")} px-3 py-2 align-top text-right tabular-nums font-medium`} style={columnStyle("totalDebt")}>
                  {formatCurrency(r.totalDebt)}
                  {r.unallocatedAmount > 0 && (
                    <div
                      className="text-[11px] text-gray-400 font-normal"
                      title="Nợ cũ không gắn được hóa đơn nào nên chưa tính được hạn">
                      Nợ cũ: {formatCurrency(r.unallocatedAmount)}
                    </div>
                  )}
                </td>

                <td className={`${columnClass("creditLimit")} px-3 py-2 align-top text-right text-xs tabular-nums`} style={columnStyle("creditLimit")}>
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

                <td className={`${columnClass("requiredPayment")} px-3 py-2 align-top text-right tabular-nums`} style={columnStyle("requiredPayment")}>
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

                <td className={`${columnClass("overdueAmount")} px-3 py-2 align-top text-right tabular-nums`} style={columnStyle("overdueAmount")}>
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

                <td className={`${columnClass("nearestDueDate")} px-3 py-2 align-top text-xs`} style={columnStyle("nearestDueDate")}>
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

                <td className={`${columnClass("lastPayment")} px-3 py-2 align-top text-xs`} style={columnStyle("lastPayment")}>
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
                    <>
                      <div
                        className={`inline-flex items-center gap-1 mt-0.5 ${
                          r.paymentFrequency.met
                            ? "text-green-600"
                            : r.paymentFrequency.overdueCount
                              ? "text-red-600"
                              : "text-amber-600"
                        }`}
                        title={
                          r.paymentFrequency.periodType === "WEEK"
                            ? "Cam kết tần suất trả tiền trong tuần hiện tại"
                            : "Cam kết tần suất trả tiền trong tháng hiện tại"
                        }>
                        <Repeat className="w-3 h-3" />
                        {r.paymentFrequency.paymentsThisPeriod ??
                          r.paymentFrequency.paymentsThisMonth}
                        /{r.paymentFrequency.required} lần/
                        {r.paymentFrequency.periodType === "WEEK"
                          ? "tuần"
                          : "tháng"}
                      </div>
                      {!!r.paymentFrequency.overdueCount && (
                        <div className="text-[11px] text-red-600">
                          Quá hạn {r.paymentFrequency.overdueCount} kỳ
                        </div>
                      )}
                      {r.paymentFrequency.nextScheduledDate && (
                        <div className="text-[11px] text-gray-400">
                          Kỳ tiếp:{" "}
                          {fmtDate(r.paymentFrequency.nextScheduledDate)}
                        </div>
                      )}
                    </>
                  )}
                </td>

                <td className={`${columnClass("accountantAttempts")} px-3 py-2 align-top`} style={columnStyle("accountantAttempts")}>
                  <DebtCollectionAttemptCell
                    customerId={r.customerId}
                    role="ACCOUNTANT"
                    attempts={r.accountantCollectionAttempts}
                  />
                </td>

                <td className={`${columnClass("notify")} px-3 py-2 align-top text-xs`} style={columnStyle("notify")}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifyingCustomerId(r.customerId);
                      notifySaleDebt.mutate([r.customerId], {
                        onSettled: () => setNotifyingCustomerId(null),
                      });
                    }}
                    disabled={notifyingCustomerId === r.customerId}
                    className="inline-flex items-center gap-1 text-brand font-medium hover:underline disabled:opacity-50"
                    title="Gửi nhắc công nợ riêng cho Sale PIC"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {notifyingCustomerId === r.customerId
                      ? "Đang gửi…"
                      : "Gửi"}
                  </button>
                </td>

                <td className={`${columnClass("salesAttempts")} px-3 py-2 align-top`} style={columnStyle("salesAttempts")}>
                  <DebtCollectionAttemptCell
                    customerId={r.customerId}
                    role="SALES"
                    attempts={r.salesCollectionAttempts}
                  />
                </td>

                <td className={`${columnClass("status")} px-3 py-2 align-top`} style={columnStyle("status")}>
                  <DebtStatusBadge
                    status={r.debtStatus}
                    daysOverdue={r.maxDaysOverdue}
                  />
                </td>

                <td className={`${columnClass("ticket")} px-3 py-2 align-top text-xs`} style={columnStyle("ticket")}>
                  {r.openTicket ? (
                    <button
                      onClick={() =>
                        setTicketTarget({ row: r, ticket: r.openTicket! })
                      }
                      className="text-brand font-medium hover:underline">
                      {r.openTicket.ticketCode}
                    </button>
                  ) : r.latestStopTicket ? (
                    <button
                      onClick={() =>
                        setTicketTarget({ row: r, ticket: r.latestStopTicket! })
                      }
                      className="text-gray-500 font-medium hover:underline">
                      {r.latestStopTicket.ticketCode}
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={`${columnClass("stopDelivery")} px-3 py-2 align-top text-xs`} style={columnStyle("stopDelivery")}>
                  {r.openTicket?.ticketType === "STOP_DELIVERY" ? (
                    canCloseStopDelivery ? (
                      <button
                        onClick={() => void handleCloseStop(r)}
                        disabled={closingCustomerId === r.customerId}
                        className="text-amber-700 font-medium hover:underline disabled:opacity-50">
                        {closingCustomerId === r.customerId
                          ? "Đang kết thúc…"
                          : "Kết thúc"}
                      </button>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )
                  ) : canCreateStopDelivery ? (
                    <button
                      onClick={() => {
                        setCreatingCustomerId(r.customerId);
                        createStop.mutate(
                          { customerId: r.customerId },
                          { onSettled: () => setCreatingCustomerId(null) }
                        );
                      }}
                      disabled={creatingCustomerId === r.customerId}
                      className="inline-flex items-center gap-1 text-brand font-medium hover:underline disabled:opacity-50">
                      <Ticket className="w-3.5 h-3.5" />
                      {creatingCustomerId === r.customerId
                        ? "Đang tạo…"
                        : "Tạo phiếu"}
                    </button>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={`${columnClass("note")} px-3 py-2 align-top`} style={columnStyle("note")}>
                  <DebtNoteCell
                    customerId={r.customerId}
                    value={r.note}
                    canEdit={canNote}
                  />
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
      {scrollbarMetrics.visible && (
        <div
          className="debt-table-custom-scrollbar"
          onPointerDown={handleScrollbarTrackPointerDown}
          role="scrollbar"
          aria-label="Cuộn ngang bảng công nợ"
          aria-controls="debt-tracking-table-scroll"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollbarMetrics.thumbLeft)}
        >
          <div
            className="debt-table-custom-scrollbar-thumb"
            style={{
              width: `${scrollbarMetrics.thumbWidth}%`,
              left: `${scrollbarMetrics.thumbLeft}%`,
            }}
            onPointerDown={handleScrollbarThumbPointerDown}
            onPointerMove={handleScrollbarThumbPointerMove}
            onPointerUp={handleScrollbarThumbPointerUp}
            onPointerCancel={handleScrollbarThumbPointerUp}
          />
        </div>
      )}

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
                className="border rounded px-2 py-1 text-sm text-gray-700 bg-white">
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
      {ticketTarget && (
        <StopDeliveryDetailModal
          row={ticketTarget.row}
          ticket={ticketTarget.ticket}
          onClose={() => setTicketTarget(null)}
        />
      )}
    </div>
  );
}
