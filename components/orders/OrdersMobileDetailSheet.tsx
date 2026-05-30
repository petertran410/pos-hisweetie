"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCancelOrder,
  useOrder,
  useUpdateOrder,
} from "@/lib/hooks/useOrders";
import {
  X,
  Loader2,
  Printer,
  MapPin,
  ChevronDown,
  User,
  Building2,
  Calendar,
  Tag,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_NUMBER_TO_STRING,
} from "@/lib/types/order";
import { INVOICE_STATUS } from "@/lib/types/invoice";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth";
import { useCan } from "@/lib/hooks/useCan";
import { CancelOrderModal } from "./CancelOrderModal";
import { printDeliverySlip, printEntity } from "@/lib/utils/print";

// ─── Helpers (giống OrderDetailRow) ──────────────────────────────────────────
const getOrderStatusBadgeColor = (status: number) => {
  switch (status) {
    case ORDER_STATUS.PENDING:
      return "bg-yellow-100 text-yellow-700";
    case ORDER_STATUS.CONFIRMED:
      return "bg-teal-100 text-teal-700";
    case ORDER_STATUS.PARTIALLY_INVOICED:
      return "bg-teal-100 text-teal-700";
    case ORDER_STATUS.COMPLETED:
      return "bg-green-100 text-green-700";
    case ORDER_STATUS.CANCELLED:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getConditionLabel = (conditionType?: string) => {
  switch (conditionType) {
    case "damaged":
      return {
        text: "Bục rách",
        className: "bg-red-50 text-red-600 border border-red-200",
      };
    case "near_expiry":
      return {
        text: "Cận date",
        className: "bg-amber-50 text-amber-600 border border-amber-200",
      };
    default:
      return null;
  }
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface OrdersMobileDetailSheetProps {
  orderId: number;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function OrdersMobileDetailSheet({
  orderId,
  onClose,
}: OrdersMobileDetailSheetProps) {
  const router = useRouter();
  const { data: order, isLoading } = useOrder(orderId);
  const updateOrder = useUpdateOrder();
  const cancelOrder = useCancelOrder();
  const { user } = useAuthStore();

  const [selectedStatus, setSelectedStatus] = useState<number>(
    ORDER_STATUS.PENDING
  );
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const hasPermCancel = useCan("orders", "cancel");
  const hasPermUpdate = useCan("orders", "update");
  const hasPermPrint = useCan("orders", "print");

  const isAdmin = user?.roles?.some(
    (role: string) => role === "Admin" || role === "Super Admin"
  );

  // Sync state khi order load xong — giống OrderDetailRow
  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setDescription(order.description || "");
    }
  }, [order?.id]);

  // Close status dropdown khi click ngoài
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ─── Logic flags (giống OrderDetailRow) ──────────────────────────────────
  const isManualEditable =
    order?.status === ORDER_STATUS.PENDING ||
    order?.status === ORDER_STATUS.CONFIRMED;

  const hasDeliveryInvoice =
    order?.invoices?.some((inv) => inv.status === INVOICE_STATUS.LOADING) ??
    false;

  const isFinalState =
    order?.status === ORDER_STATUS.COMPLETED ||
    order?.status === ORDER_STATUS.CANCELLED;

  const isStatusEditable = !isFinalState && !hasDeliveryInvoice;

  const canCancelOrder =
    order?.status === ORDER_STATUS.PENDING ||
    order?.status === ORDER_STATUS.CONFIRMED ||
    order?.status === ORDER_STATUS.PARTIALLY_INVOICED ||
    (order?.status === ORDER_STATUS.COMPLETED && isAdmin);

  const showProcessButton =
    hasPermUpdate &&
    !isSaving &&
    (order?.status === ORDER_STATUS.PENDING ||
      order?.status === ORDER_STATUS.PARTIALLY_INVOICED ||
      order?.status === ORDER_STATUS.CONFIRMED);

  // ─── Handlers (giống OrderDetailRow) ─────────────────────────────────────
  const handleCancelClick = () => {
    if (!order) return;
    if (order.invoices && order.invoices.some((inv) => inv.status !== 2)) {
      toast.error(
        "Đơn hàng có hóa đơn. Vui lòng hủy tất cả hóa đơn trước khi hủy đơn hàng"
      );
      return;
    }
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (cancelPayments: boolean) => {
    if (!order) return;
    try {
      await cancelOrder.mutateAsync({ id: order.id, cancelPayments });
    } catch (error: any) {
      throw new Error("Có lỗi khi hủy đơn hàng", error);
    }
  };

  const handleSave = async () => {
    if (!order) return;
    try {
      setIsSaving(true);
      const updateData: any = { description };
      if (isStatusEditable) {
        const statusString = ORDER_STATUS_NUMBER_TO_STRING[selectedStatus];
        if (!statusString) {
          toast.error("Trạng thái không hợp lệ");
          return;
        }
        updateData.orderStatus = statusString;
      }
      await updateOrder.mutateAsync({ id: order.id, data: updateData });
      toast.success("Lưu đơn hàng thành công");
    } catch {
      toast.error("Không thể lưu đơn hàng");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    try {
      await printEntity("order", order.id);
    } catch (e: any) {
      toast.error(e?.message || "In thất bại");
    }
  };

  const handlePrintDelivery = async () => {
    if (!order) return;
    try {
      await printDeliverySlip("order", order.id);
    } catch (e: any) {
      toast.error(e?.message || "In phiếu giao hàng thất bại");
    }
  };

  const handleProcessOrder = () => {
    if (!order) return;
    router.push(`/ban-hang?orderId=${order.id}&from=dat-hang`);
  };

  const handleCopy = () => {
    if (!order) return;
    router.push(`/ban-hang?copyOrderId=${order.id}`);
  };

  // ─── invoicedQuantities (giống OrderDetailRow) ───────────────────────────
  const invoicedQuantities: Record<number, number> = {};
  order?.invoices?.forEach((inv) => {
    if (inv.status !== 5) {
      inv.details?.forEach((detail: any) => {
        invoicedQuantities[detail.productId] =
          (invoicedQuantities[detail.productId] || 0) + Number(detail.quantity);
      });
    }
  });

  return (
    <>
      {/* ── Full-screen overlay ── */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-200">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          {/* Back arrow */}
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          {/* Code + status */}
          {isLoading || !order ? (
            <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base font-bold text-gray-900 flex-shrink-0">
                {order.code}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getOrderStatusBadgeColor(order.status)}`}>
                {ORDER_STATUS_LABELS[
                  order.status as keyof typeof ORDER_STATUS_LABELS
                ] || "—"}
              </span>
            </div>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-sm text-gray-400">
                Đang tải thông tin đơn hàng...
              </span>
            </div>
          ) : !order ? (
            <div className="py-20 text-center text-sm text-red-500">
              Không tìm thấy thông tin đơn hàng
            </div>
          ) : (
            <div className="px-4 py-4 space-y-4 pb-6">
              {/* ── Customer + Branch ── */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-base leading-tight">
                    {order.customer?.name || "Khách vãng lai"}
                  </p>
                  {order.branch && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Chi nhánh {order.branch.name}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Info grid ── */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {order.creator && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Người tạo
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {order.creator.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Ngày đặt
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatDate(order.orderDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Bảng giá
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {order.priceBookName || "Bảng giá chung"}
                  </span>
                </div>

                {order.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Chi nhánh xử lý
                    </span>
                    <span className="text-sm font-medium text-gray-800 text-right max-w-[55%]">
                      {order.branch.name}
                    </span>
                  </div>
                )}

                {/* Trạng thái — dropdown nếu editable */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Trạng thái</span>
                  {isManualEditable && isStatusEditable ? (
                    <div className="relative" ref={statusDropdownRef}>
                      <button
                        onClick={() => setShowStatusDropdown((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${getOrderStatusBadgeColor(selectedStatus)}`}>
                        {
                          ORDER_STATUS_LABELS[
                            selectedStatus as keyof typeof ORDER_STATUS_LABELS
                          ]
                        }
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${showStatusDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                      {showStatusDropdown && (
                        <div className="absolute z-30 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                          {[
                            { value: ORDER_STATUS.PENDING, label: "Phiếu tạm" },
                            {
                              value: ORDER_STATUS.CONFIRMED,
                              label: "Đã xác nhận",
                            },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setSelectedStatus(opt.value);
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                                selectedStatus === opt.value
                                  ? "text-blue-600 font-semibold"
                                  : "text-gray-700"
                              }`}>
                              {opt.label}
                              {selectedStatus === opt.value && (
                                <span className="text-blue-500 text-xs">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getOrderStatusBadgeColor(order.status)}`}>
                      {ORDER_STATUS_LABELS[
                        order.status as keyof typeof ORDER_STATUS_LABELS
                      ] || "—"}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Thông tin giao hàng ── */}
              {order.delivery && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Thông tin giao hàng
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    {(order.delivery.receiver ||
                      order.delivery.contactNumber) && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">
                          {[
                            order.delivery.receiver,
                            order.delivery.contactNumber,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    )}
                    {(order.delivery.address ||
                      order.delivery.wardName ||
                      order.delivery.locationName) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 leading-relaxed">
                          {[
                            order.delivery.address,
                            order.delivery.wardName,
                            order.delivery.locationName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    {order.delivery.noteForDriver && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        <p className="text-xs text-amber-500 font-medium mb-0.5">
                          Ghi chú
                        </p>
                        <p className="text-sm text-amber-800">
                          {order.delivery.noteForDriver}
                        </p>
                      </div>
                    )}
                    {hasPermPrint && (
                      <button
                        onClick={handlePrintDelivery}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors w-full justify-center">
                        <Printer className="w-4 h-4" />
                        In phiếu giao hàng
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Danh sách sản phẩm ── */}
              {order.items && order.items.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                    Danh sách sản phẩm ({order.items.length})
                  </p>

                  {/* Mỗi item là 1 card riêng — không dùng divide-y */}
                  <div className="space-y-2">
                    {order.items.map((item: any, idx: number) => {
                      const conditionLabel = getConditionLabel(
                        item.conditionType
                      );
                      const invoicedQty =
                        invoicedQuantities[item.productId] || 0;
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                          {/* Row 1: code (blue) + condition badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-blue-600">
                              {item.product?.code || item.productCode || "—"}
                            </span>
                            {conditionLabel && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${conditionLabel.className}`}>
                                {conditionLabel.text}
                              </span>
                            )}
                          </div>

                          {/* Row 2: product name */}
                          <p className="text-sm text-gray-900 leading-tight">
                            {item.product?.name || item.productName}
                          </p>

                          {/* Row 3: note — plain italic text */}
                          {item.note && (
                            <p className="text-xs text-gray-400 italic mt-0.5">
                              {item.note}
                            </p>
                          )}

                          {/* Dashed separator */}
                          <div className="border-t border-dashed border-gray-200 my-2.5" />

                          {/* Row 4: SL × price | (chiết khấu nếu có) | total blue */}
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm text-gray-500">
                                SL:{" "}
                                <span className="font-bold text-gray-800">
                                  {item.quantity}
                                </span>
                                {invoicedQty > 0 && (
                                  <span className="text-blue-600">
                                    {" "}
                                    | {invoicedQty}
                                  </span>
                                )}
                                {" × "}
                                <span className="text-gray-600">
                                  {formatCurrency(Number(item.price))}
                                </span>
                              </span>
                              {Number(item.discount) > 0 && (
                                <span className="text-xs text-red-500">
                                  Giảm: -{formatCurrency(Number(item.discount))}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-blue-600 ml-2 flex-shrink-0">
                              {formatCurrency(
                                Number(
                                  item.totalPrice ??
                                    Number(item.price) * Number(item.quantity)
                                )
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Tổng kết ── */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                {/* Tổng tiền hàng */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Tổng tiền hàng ({order.items?.length || 0})
                  </span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(Number(order.totalAmount))}
                  </span>
                </div>

                {/* Giảm giá — luôn hiện, match desktop */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Giảm giá đơn hàng
                    {Number(order.discountRatio) > 0 &&
                      ` (${order.discountRatio}%)`}
                  </span>
                  <span className="font-medium text-red-500">
                    -
                    {formatCurrency(
                      Number(order.discount) +
                        (Number(order.totalAmount) *
                          Number(order.discountRatio || 0)) /
                          100
                    )}
                  </span>
                </div>

                {/* Phí ship — hardcode 0, match desktop */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phí ship</span>
                  <span className="font-medium text-gray-800">0</span>
                </div>

                {/* Tổng cộng */}
                <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                  <span className="font-bold text-gray-900">Tổng cộng</span>
                  <span className="font-bold text-blue-600 text-base">
                    {formatCurrency(Number(order.grandTotal))}
                  </span>
                </div>

                {/* Khách đã trả */}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">Khách đã trả</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(Number(order.paidAmount))}
                  </span>
                </div>

                {/* Khách cần trả — match desktop: red, large, red border */}
                <div className="border-t-2 border-red-200 pt-2.5 flex justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Khách cần trả
                  </span>
                  <span className="text-base font-bold text-red-600">
                    {formatCurrency(Number(order.debtAmount))}
                  </span>
                </div>
              </div>

              {/* ── Ghi chú ── */}
              {hasPermUpdate && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Ghi chú
                  </p>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Nhập ghi chú..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}
              {!hasPermUpdate && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
                  <p className="text-xs text-amber-500 font-medium mb-1">
                    Ghi chú
                  </p>
                  <p className="text-sm text-amber-800">{order.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action bar (sticky bottom) ── */}
        {order && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 flex items-center gap-2">
            {canCancelOrder && hasPermCancel && (
              <button
                onClick={handleCancelClick}
                disabled={isSaving}
                className="px-3.5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
                Hủy
              </button>
            )}

            {showProcessButton && (
              <button
                onClick={handleProcessOrder}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95 transition-all truncate">
                Xử lý đơn hàng
              </button>
            )}

            {hasPermUpdate && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3.5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Lưu"
                )}
              </button>
            )}

            {hasPermPrint && (
              <button
                onClick={handlePrint}
                className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0">
                <Printer className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleCopy}
              title="Copy đơn hàng sang tab mới"
              className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Cancel modal ── */}
      {order && (
        <CancelOrderModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
          hasPayments={order.payments && order.payments.length > 0}
          orderCode={order.code}
          totalPayments={order.payments?.length || 0}
        />
      )}
    </>
  );
}
