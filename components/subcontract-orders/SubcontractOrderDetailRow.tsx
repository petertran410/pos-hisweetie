"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import {
  useCancelSubcontractOrder,
  useCancelSubcontractReceipt,
  useCreateSubcontractPayment,
  useRemoveSubcontractCost,
  useRemoveSubcontractPayment,
  useSubcontractOrder,
} from "@/lib/hooks/useSubcontractOrders";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  SUBCONTRACT_COST_TYPE_LABEL,
  SUBCONTRACT_STATUS,
  SUBCONTRACT_STATUS_COLOR,
  SUBCONTRACT_STATUS_TEXT,
  type SubcontractCost,
  type SubcontractOrder,
  type SubcontractPaymentInput,
} from "@/lib/types/subcontract-order";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import { CodeLink } from "../shared/CodeLink";
import { SupplierPaymentModal } from "../order-suppliers/SupplierPaymentModal";
import { SendMaterialsModal } from "./SendMaterialsModal";
import { ReceiveGoodsModal } from "./ReceiveGoodsModal";
import { CompleteOrderModal } from "./CompleteOrderModal";
import { ApplyCostModal } from "./ApplyCostModal";
import { CostLineModal } from "./CostLineModal";

interface SubcontractOrderDetailRowProps {
  orderId: number;
  colSpan: number;
}

type TabKey = "info" | "materials" | "receipts" | "costs" | "payments";
type ModalKey = "send" | "receive" | "complete" | "applyCost" | "payment";

const RESOURCE = "subcontract_orders";

const money = (v: number | null | undefined) =>
  v == null ? "-" : formatCurrency(Math.round(v));

const formatDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "-";

const PAYMENT_METHOD_TEXT: Record<string, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  card: "Thẻ",
};

export function SubcontractOrderDetailRow({
  orderId,
  colSpan,
}: SubcontractOrderDetailRowProps) {
  const { data: order, isLoading } = useSubcontractOrder(orderId);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<TabKey>("info");
  const [modal, setModal] = useState<ModalKey | null>(null);
  // undefined = đóng, null = thêm mới, object = sửa
  const [editingCost, setEditingCost] = useState<
    SubcontractCost | null | undefined
  >(undefined);

  const canUpdate = usePermission(RESOURCE, "update");
  const canReceive = usePermission(RESOURCE, "receive");
  const canComplete = usePermission(RESOURCE, "complete");
  const canCancel = usePermission(RESOURCE, "cancel");
  const canPay = usePermission(RESOURCE, "payment");
  const canApplyCost = usePermission(RESOURCE, "apply_cost");

  const cancelOrder = useCancelSubcontractOrder();
  const cancelReceipt = useCancelSubcontractReceipt();
  const removeCost = useRemoveSubcontractCost();
  const createPayment = useCreateSubcontractPayment();
  const removePayment = useRemoveSubcontractPayment();

  // Sticky width theo scroll container (giống ProductionDetailRow)
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const ox = getComputedStyle(scrollEl).overflowX;
      if (ox === "auto" || ox === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;
    const setWidth = () => {
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    setWidth();
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(setWidth);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [order]);

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">Đang tải lệnh gia công...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!order) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy lệnh gia công
        </td>
      </tr>
    );
  }

  const isDraft = order.status === SUBCONTRACT_STATUS.DRAFT;
  const isOpen =
    order.status === SUBCONTRACT_STATUS.PROCESSING ||
    order.status === SUBCONTRACT_STATUS.PARTIALLY_RECEIVED;
  const isCompleted = order.status === SUBCONTRACT_STATUS.COMPLETED;
  const isCancelled = order.status === SUBCONTRACT_STATUS.CANCELLED;
  const costApplied = !!order.costAppliedAt;
  const costsEditable = canUpdate && !isCancelled && !costApplied;
  const isForeign = order.currency !== "VND";

  const activePayments = order.payments.filter((p) => p.status !== 2);
  const activeReceipts = order.receipts.filter((r) => r.status === 1);

  const handleCancelOrder = async () => {
    const res = await Swal.fire({
      title: `Hủy lệnh ${order.code}?`,
      html: isDraft
        ? "Lệnh nháp sẽ chuyển sang Đã hủy."
        : `Nguyên liệu đã gửi sẽ được cộng lại vào tồn kho, thành phẩm đã nhập bị trừ ra và công nợ nhà máy của lệnh bị xóa.${
            activePayments.length > 0
              ? `<br/><b>${activePayments.length} phiếu chi của lệnh cũng sẽ bị hủy.</b>`
              : ""
          }`,
      input: "text",
      inputPlaceholder: "Lý do hủy (không bắt buộc)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hủy lệnh",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (!res.isConfirmed) return;
    cancelOrder.mutate({
      id: order.id,
      data: {
        reason: res.value || undefined,
        cancelPayments: activePayments.length > 0,
      },
    });
  };

  const confirmThen = async (
    title: string,
    text: string,
    action: () => void,
  ) => {
    const res = await Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed) action();
  };

  // Trả vượt số còn nợ (vd đặt cọc trước khi nhận hàng) → backend trả 409,
  // hỏi lại rồi gửi kèm confirmExceed.
  const submitPayment = (data: SubcontractPaymentInput) => {
    createPayment.mutate(
      { id: order.id, data },
      {
        onError: async (error: Error & { status?: number }) => {
          if (error?.status !== 409 || data.confirmExceed) {
            toast.error(error?.message || "Không thể thanh toán");
            return;
          }
          const res = await Swal.fire({
            title: "Trả vượt số còn nợ?",
            text: `${error.message}. Phần vượt sẽ được ghi nhận là trả trước cho nhà máy.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Vẫn thanh toán",
            cancelButtonText: "Đóng",
          });
          if (res.isConfirmed) submitPayment({ ...data, confirmExceed: true });
        },
      },
    );
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: "info", label: "Thông tin" },
    { key: "materials", label: `Nguyên liệu (${order.materials.length})` },
    { key: "receipts", label: `Đợt nhập (${activeReceipts.length})` },
    { key: "costs", label: `Chi phí khác (${order.costs.length})` },
    { key: "payments", label: `Thanh toán (${activePayments.length})` },
  ];

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="flex flex-wrap items-center gap-2 pb-3">
                <CodeLink
                  entity="subcontract-order"
                  code={order.code}
                  className="text-md font-bold text-brand hover:underline"
                />
                <span className="text-gray-300">-</span>
                <span className="text-md text-gray-700">
                  {order.productName}
                </span>
                <CodeLink entity="product" code={order.productCode} />
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    SUBCONTRACT_STATUS_COLOR[order.status]
                  }`}>
                  {SUBCONTRACT_STATUS_TEXT[order.status]}
                </span>
                {order.costPending && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                    Chưa áp giá vốn
                  </span>
                )}
                {costApplied && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700">
                    Đã áp giá vốn {money(order.appliedUnitCost)}
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b mb-4">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tab === t.key
                        ? "border-brand text-brand"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "info" && <InfoTab order={order} />}

              {tab === "materials" && (
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Nguyên liệu</th>
                      <th className="px-3 py-2 text-right">Định mức</th>
                      <th className="px-3 py-2 text-right">Đã gửi</th>
                      <th className="px-3 py-2 text-right">Trả về</th>
                      <th className="px-3 py-2 text-right">
                        {isCompleted ? "Tiêu hao" : "Còn tại nhà máy"}
                      </th>
                      <th className="px-3 py-2 text-right">Giá vốn</th>
                      <th className="px-3 py-2 text-right">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.materials.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-6 text-center text-gray-400">
                          Lệnh chưa có nguyên liệu
                        </td>
                      </tr>
                    )}
                    {order.materials.map((m) => {
                      const used = isDraft
                        ? m.plannedQuantity
                        : m.sentQuantity - m.returnedQuantity;
                      return (
                        <tr key={m.id} className="border-t">
                          <td className="px-3 py-2">
                            <div>{m.productName}</div>
                            <CodeLink entity="product" code={m.productCode} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatNumber(m.plannedQuantity)} {m.unit || ""}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isDraft ? "-" : formatNumber(m.sentQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {isCompleted
                              ? formatNumber(m.returnedQuantity)
                              : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {isCompleted
                              ? formatNumber(m.consumedQuantity)
                              : isOpen
                                ? formatNumber(m.atFactoryQuantity)
                                : "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {money(m.unitCost)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {m.unitCost == null
                              ? "-"
                              : money(used * m.unitCost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab === "receipts" && (
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Mã đợt</th>
                      <th className="px-3 py-2">Ngày nhận</th>
                      <th className="px-3 py-2 text-right">SL đạt</th>
                      <th className="px-3 py-2 text-right">SL lỗi</th>
                      <th className="px-3 py-2 text-right">Đơn giá</th>
                      <th className="px-3 py-2 text-right">Phí gia công</th>
                      <th className="px-3 py-2">Người nhập</th>
                      <th className="px-3 py-2">Ghi chú</th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {order.receipts.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-6 text-center text-gray-400">
                          Chưa nhập đợt thành phẩm nào
                        </td>
                      </tr>
                    )}
                    {order.receipts.map((r) => {
                      const cancelled = r.status === 2;
                      return (
                        <tr
                          key={r.id}
                          className={`border-t ${
                            cancelled ? "text-gray-400 line-through" : ""
                          }`}>
                          <td className="px-3 py-2">{r.code}</td>
                          <td className="px-3 py-2">
                            {formatDay(r.receivedDate)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatNumber(r.goodQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatNumber(r.defectQuantity)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatNumber(r.unitPrice)}
                            {isForeign ? ` ${order.currency}` : ""}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {money(r.amount)}
                          </td>
                          <td className="px-3 py-2">{r.createdByName}</td>
                          <td className="px-3 py-2">{r.note || ""}</td>
                          <td className="px-3 py-2">
                            {canReceive &&
                              !cancelled &&
                              order.status ===
                                SUBCONTRACT_STATUS.PARTIALLY_RECEIVED && (
                                <button
                                  title="Hủy đợt nhập"
                                  onClick={() =>
                                    confirmThen(
                                      `Hủy đợt nhập ${r.code}?`,
                                      "Thành phẩm của đợt này sẽ bị trừ khỏi tồn kho và phí gia công bị trừ khỏi công nợ nhà máy.",
                                      () =>
                                        cancelReceipt.mutate({
                                          id: order.id,
                                          receiptId: r.id,
                                        }),
                                    )
                                  }
                                  className="text-gray-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab === "costs" && (
                <div className="space-y-2">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-3 py-2">Loại</th>
                        <th className="px-3 py-2">Diễn giải</th>
                        <th className="px-3 py-2">Ngày</th>
                        <th className="px-3 py-2">Trả cho</th>
                        <th className="px-3 py-2 text-right">Số tiền</th>
                        <th className="px-3 py-2 w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {order.costs.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-6 text-center text-gray-400">
                            Chưa có chi phí nào (vận chuyển, thuế, bao bì…)
                          </td>
                        </tr>
                      )}
                      {order.costs.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="px-3 py-2">
                            {SUBCONTRACT_COST_TYPE_LABEL[c.type] ?? c.type}
                          </td>
                          <td className="px-3 py-2">
                            {c.name}
                            {c.note && (
                              <div className="text-xs text-gray-400">
                                {c.note}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">{formatDay(c.costDate)}</td>
                          <td className="px-3 py-2">
                            {c.isFactoryPayable ? "Nhà máy" : "Bên thứ ba"}
                          </td>
                          <td
                            className={`px-3 py-2 text-right ${
                              c.amount < 0 ? "text-green-600" : ""
                            }`}>
                            {money(c.amount)}
                          </td>
                          <td className="px-3 py-2">
                            {costsEditable && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  title="Sửa"
                                  onClick={() => setEditingCost(c)}
                                  className="text-gray-400 hover:text-brand">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  title="Xóa"
                                  onClick={() =>
                                    confirmThen(
                                      "Xóa dòng chi phí này?",
                                      c.name,
                                      () =>
                                        removeCost.mutate({
                                          id: order.id,
                                          costId: c.id,
                                        }),
                                    )
                                  }
                                  className="text-gray-400 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {costsEditable && (
                    <button
                      onClick={() => setEditingCost(null)}
                      className="text-sm text-brand hover:underline font-medium">
                      + Thêm chi phí
                    </button>
                  )}
                </div>
              )}

              {tab === "payments" && (
                <table className="w-full text-sm border">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">Mã phiếu chi</th>
                      <th className="px-3 py-2">Thời gian</th>
                      <th className="px-3 py-2">Phương thức</th>
                      <th className="px-3 py-2 text-right">Số tiền</th>
                      <th className="px-3 py-2">Trạng thái</th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-6 text-center text-gray-400">
                          Chưa có thanh toán nào
                        </td>
                      </tr>
                    )}
                    {order.payments.map((p) => {
                      const cancelled = p.status === 2;
                      return (
                        <tr
                          key={p.id}
                          className={`border-t ${
                            cancelled ? "text-gray-400" : ""
                          }`}>
                          <td className="px-3 py-2">
                            <CodeLink entity="cashflow" code={p.code} />
                          </td>
                          <td className="px-3 py-2">
                            {formatDate(p.paymentDate)}
                          </td>
                          <td className="px-3 py-2">
                            {PAYMENT_METHOD_TEXT[p.paymentMethod] ??
                              p.paymentMethod}
                            {p.account &&
                              ` — ${p.account.bankName} ${p.account.accountNumber}`}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {money(p.amount)}
                            {p.foreignAmount != null && (
                              <div className="text-xs text-gray-400">
                                {formatNumber(p.foreignAmount)} {order.currency}{" "}
                                × {formatNumber(p.exchangeRate)}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {cancelled ? "Đã hủy" : "Đã thanh toán"}
                          </td>
                          <td className="px-3 py-2">
                            {canPay && !cancelled && (
                              <button
                                title="Hủy thanh toán"
                                onClick={() =>
                                  confirmThen(
                                    `Hủy thanh toán ${p.code}?`,
                                    "Phiếu chi tương ứng trong sổ quỹ cũng bị hủy.",
                                    () =>
                                      removePayment.mutate({
                                        id: order.id,
                                        paymentId: p.id,
                                      }),
                                  )
                                }
                                className="text-gray-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Footer */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                {canCancel && !isCancelled && !costApplied && (
                  <button
                    onClick={handleCancelOrder}
                    disabled={cancelOrder.isPending}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors mr-auto">
                    Hủy lệnh
                  </button>
                )}
                {canUpdate && (isDraft || isOpen) && (
                  <Link
                    href={`/san-pham/gia-cong/${order.id}`}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                    {isDraft ? "Chỉnh sửa" : "Sửa điều khoản"}
                  </Link>
                )}
                {canPay && (isOpen || isCompleted) && (
                  <button
                    onClick={() => setModal("payment")}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                    Thanh toán nhà máy
                  </button>
                )}
                {canUpdate && isDraft && (
                  <ActionButton onClick={() => setModal("send")}>
                    Gửi nguyên liệu
                  </ActionButton>
                )}
                {canReceive && isOpen && (
                  <ActionButton onClick={() => setModal("receive")}>
                    Nhập thành phẩm
                  </ActionButton>
                )}
                {canComplete && isOpen && order.goodQuantity > 0 && (
                  <ActionButton onClick={() => setModal("complete")}>
                    Hoàn thành &amp; quyết toán
                  </ActionButton>
                )}
                {canApplyCost && order.costPending && (
                  <ActionButton onClick={() => setModal("applyCost")}>
                    Áp giá vốn
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </div>

        {modal === "send" && (
          <SendMaterialsModal order={order} onClose={() => setModal(null)} />
        )}
        {modal === "receive" && (
          <ReceiveGoodsModal order={order} onClose={() => setModal(null)} />
        )}
        {modal === "complete" && (
          <CompleteOrderModal
            order={order}
            onClose={() => setModal(null)}
            // Quyết toán xong thì hỏi luôn bước áp giá vốn.
            onCompleted={() => canApplyCost && setModal("applyCost")}
          />
        )}
        {modal === "applyCost" && (
          <ApplyCostModal order={order} onClose={() => setModal(null)} />
        )}
        {editingCost !== undefined && (
          <CostLineModal
            orderId={order.id}
            cost={editingCost}
            onClose={() => setEditingCost(undefined)}
          />
        )}
        <SupplierPaymentModal
          isOpen={modal === "payment"}
          onClose={() => setModal(null)}
          totalAmount={order.payableAmount}
          previouslyPaid={order.paidAmount}
          currency={order.currency}
          isImportMode={isForeign}
          defaultExchangeRate={isForeign ? order.exchangeRate : undefined}
          foreignTotalAmount={
            isForeign
              ? activeReceipts.reduce((s, r) => s + (r.foreignAmount ?? 0), 0)
              : undefined
          }
          previouslyPaidForeign={
            isForeign
              ? activePayments.reduce((s, p) => s + (p.foreignAmount ?? 0), 0)
              : undefined
          }
          onConfirm={(amount, method, accountId, exchangeRate, foreignAmount) =>
            submitPayment({
              amount,
              paymentMethod: method,
              accountId,
              exchangeRate,
              foreignAmount,
            })
          }
        />
      </td>
    </tr>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors">
      {children}
    </button>
  );
}

function InfoItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col border-b pb-1.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className="text-sm text-gray-800">{children}</span>
    </div>
  );
}

function InfoTab({ order }: { order: SubcontractOrder }) {
  const isForeign = order.currency !== "VND";
  const isCompleted = order.status === SUBCONTRACT_STATUS.COMPLETED;
  const canViewCost = order.estimatedTotalCost != null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 content-start">
        <InfoItem label="Nhà máy">{order.factory?.name || "-"}</InfoItem>
        <InfoItem label="Nhà cung cấp (công nợ)">
          {order.supplier?.name || "-"}
        </InfoItem>
        <InfoItem label="Người tạo">{order.createdByName || "-"}</InfoItem>
        <InfoItem label="Kho xuất nguyên liệu">{order.branchName}</InfoItem>
        <InfoItem label="Kho nhận thành phẩm">
          {order.receiveBranchName}
        </InfoItem>
        <InfoItem label="Công thức">{order.formulaName || "-"}</InfoItem>
        <InfoItem label="SL kế hoạch">
          {formatNumber(order.plannedQuantity)} {order.product?.unit || ""}
        </InfoItem>
        <InfoItem label="Đã nhận (đạt / lỗi)">
          {formatNumber(order.goodQuantity)} /{" "}
          {formatNumber(order.defectQuantity)}
        </InfoItem>
        <InfoItem label="Đơn giá gia công">
          {formatNumber(order.processingUnitPrice)} {order.currency}
          {isForeign && ` (tỷ giá ${formatNumber(order.exchangeRate)})`}
        </InfoItem>
        <InfoItem label="Ngày lập">{formatDay(order.orderDate)}</InfoItem>
        <InfoItem label="Ngày gửi nguyên liệu">
          {formatDay(order.sentDate)}
        </InfoItem>
        <InfoItem label={isCompleted ? "Ngày hoàn thành" : "Dự kiến xong"}>
          {formatDay(isCompleted ? order.completedDate : order.expectedDate)}
        </InfoItem>
        <InfoItem label="Hao hụt cho phép">
          {order.lossAllowancePercent}%
        </InfoItem>
        <InfoItem label="Hao hụt thực tế">
          {order.lossPercent == null ? (
            "-"
          ) : (
            <span className={order.lossExceeded ? "text-red-600" : ""}>
              {order.lossPercent > 0 ? "+" : ""}
              {order.lossPercent}%{order.lossExceeded ? " (vượt định mức)" : ""}
            </span>
          )}
        </InfoItem>
        {order.note && (
          <div className="col-span-full">
            <span className="text-sm font-medium text-gray-500">Ghi chú</span>
            <p className="px-3 py-2 text-sm border rounded bg-gray-50 text-gray-700 mt-1">
              {order.note}
            </p>
          </div>
        )}
        {order.cancelReason && (
          <div className="col-span-full text-sm text-red-600">
            Lý do hủy: {order.cancelReason}
          </div>
        )}
      </div>

      {/* Chi phí & công nợ */}
      <div className="space-y-3">
        {canViewCost && (
          <div className="rounded border divide-y text-sm">
            <SummaryRow
              label={isCompleted ? "Nguyên liệu tiêu hao" : "Nguyên liệu"}
              value={
                isCompleted
                  ? money(order.materialCost)
                  : money(
                      (order.estimatedTotalCost ?? 0) -
                        order.otherCost -
                        order.plannedQuantity *
                          order.processingUnitPrice *
                          (order.exchangeRate || 1),
                    )
              }
            />
            <SummaryRow
              label={isCompleted ? "Phí gia công" : "Phí gia công (kế hoạch)"}
              value={
                isCompleted
                  ? money(order.processingCost)
                  : money(
                      order.plannedQuantity *
                        order.processingUnitPrice *
                        (order.exchangeRate || 1),
                    )
              }
            />
            <SummaryRow label="Chi phí khác" value={money(order.otherCost)} />
            <SummaryRow
              bold
              label={isCompleted ? "Tổng giá thành" : "Tổng dự kiến"}
              value={money(
                isCompleted ? order.totalCost : order.estimatedTotalCost,
              )}
            />
            <div className="flex items-center justify-between px-3 py-2 bg-brand-soft">
              <span className="font-medium">
                {isCompleted ? "Giá thành / đv" : "Giá thành dự kiến / đv"}
              </span>
              <span className="text-base font-bold text-brand">
                {isCompleted
                  ? money(order.unitCost)
                  : `~${money(order.estimatedUnitCost)}`}
              </span>
            </div>
          </div>
        )}

        <div className="rounded border divide-y text-sm">
          <SummaryRow
            label="Phải trả nhà máy"
            value={money(order.payableAmount)}
          />
          <SummaryRow label="Đã trả" value={money(order.paidAmount)} />
          <SummaryRow
            bold
            label={order.remainingAmount < 0 ? "Trả trước" : "Còn nợ"}
            value={money(Math.abs(order.remainingAmount))}
            valueClass={order.remainingAmount > 0 ? "text-red-600" : ""}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  valueClass = "",
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        bold ? "font-semibold" : ""
      }`}>
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
