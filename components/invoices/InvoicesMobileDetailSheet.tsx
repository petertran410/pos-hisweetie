"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoice, useUpdateInvoice } from "@/lib/hooks/useInvoices";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronDown,
  Copy,
  Loader2,
  MapPin,
  Printer,
  Tag,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from "@/lib/types/invoice";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCan } from "@/lib/hooks/useCan";
import { printDeliverySlip, printEntity } from "@/lib/utils/print";
import Swal from "sweetalert2";
import { CodeLink } from "../shared/CodeLink";
import { LineTypeBadge, PromotionLineName } from "../shared/LineTypeBadge";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getInvoiceStatusBadgeColor = (status: number) => {
  switch (status) {
    case INVOICE_STATUS.COMPLETED:
      return "bg-green-100 text-green-700";
    case INVOICE_STATUS.CANCELLED:
      return "bg-red-100 text-red-700";
    case INVOICE_STATUS.PROCESSING:
      return "bg-blue-100 text-blue-700";
    case INVOICE_STATUS.FAILED_DELIVERY:
      return "bg-yellow-100 text-yellow-700";
    case INVOICE_STATUS.PACKED:
      return "bg-orange-100 text-orange-700";
    case INVOICE_STATUS.LOADING:
      return "bg-purple-100 text-purple-700";
    case INVOICE_STATUS.DELIVERED:
      return "bg-teal-100 text-teal-700";
    case INVOICE_STATUS.RETURNED:
      return "bg-pink-100 text-pink-700";
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

const EDITABLE_STATUSES = [
  { value: INVOICE_STATUS.PROCESSING, label: "Đang xử lý" },
  { value: INVOICE_STATUS.PACKED, label: "Đóng hàng" },
  { value: INVOICE_STATUS.LOADING, label: "Đang giao hàng" },
  { value: INVOICE_STATUS.DELIVERED, label: "Giao thành công" },
  { value: INVOICE_STATUS.FAILED_DELIVERY, label: "Không giao được" },
  { value: INVOICE_STATUS.RETURNED, label: "Trả hàng" },
  { value: INVOICE_STATUS.COMPLETED, label: "Hoàn thành" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface InvoicesMobileDetailSheetProps {
  invoiceId: number;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function InvoicesMobileDetailSheet({
  invoiceId,
  onClose,
}: InvoicesMobileDetailSheetProps) {
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();

  const [selectedStatus, setSelectedStatus] = useState<number>(
    INVOICE_STATUS.PROCESSING
  );
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const hasPermCancel = useCan("invoices", "cancel");
  const hasPermUpdate = useCan("invoices", "update");
  const hasPermPrint = useCan("invoices", "print");

  // Sync state khi invoice load xong — giống OrdersMobileDetailSheet
  useEffect(() => {
    if (invoice) {
      setSelectedStatus(invoice.status);
      setDescription(invoice.description || "");
    }
  }, [invoice?.id]);

  // Close dropdown khi click ngoài — giống OrdersMobileDetailSheet
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

  // Lock body scroll — giống OrdersMobileDetailSheet
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ─── Logic flags — giống OrdersMobileDetailSheet ──────────────────────────
  const isFinalState =
    invoice?.status === INVOICE_STATUS.COMPLETED ||
    invoice?.status === INVOICE_STATUS.CANCELLED;

  const isStatusEditable = !isFinalState;

  const canCancelInvoice = !isFinalState;

  const showProcessButton = hasPermUpdate && !isSaving && !isFinalState;

  // ─── Handlers — giống OrdersMobileDetailSheet pattern ────────────────────
  const handleCancelClick = async () => {
    if (!invoice) return;
    const hasPayments = invoice.payments && invoice.payments.length > 0;

    if (hasPayments) {
      const result = await Swal.fire({
        title: "Xác nhận hủy hóa đơn",
        html: `
          <p>Hóa đơn này có <strong>${invoice.payments?.length || 0}</strong> phiếu thanh toán.</p>
          <p class="text-red-600 font-bold mt-2">Bạn có muốn hủy cả phiếu thanh toán không?</p>
        `,
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Có - Hủy phiếu thanh toán",
        denyButtonText: "Không - Giữ phiếu thanh toán",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#dc2626",
        denyButtonColor: "#059669",
        cancelButtonColor: "#6b7280",
      });
      if (result.isDismissed) return;
      const cancelPayments = result.isConfirmed;
      try {
        setIsSaving(true);
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: { status: INVOICE_STATUS.CANCELLED, cancelPayments },
        });
        toast.success(
          cancelPayments
            ? "Đã hủy hóa đơn và phiếu thanh toán"
            : "Đã hủy hóa đơn, giữ nguyên phiếu thanh toán"
        );
        onClose();
      } catch {
        toast.error("Không thể hủy hóa đơn");
      } finally {
        setIsSaving(false);
      }
    } else {
      const result = await Swal.fire({
        title: "Xác nhận hủy hóa đơn",
        text: "Bạn có chắc chắn muốn hủy hóa đơn này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
      });
      if (!result.isConfirmed) return;
      try {
        setIsSaving(true);
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: { status: INVOICE_STATUS.CANCELLED },
        });
        toast.success("Đã hủy hóa đơn thành công");
        onClose();
      } catch {
        toast.error("Không thể hủy hóa đơn");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (!invoice) return;
    try {
      setIsSaving(true);
      const updateData: any = { description };
      if (isStatusEditable) {
        updateData.status = selectedStatus;
      }
      await updateInvoice.mutateAsync({ id: invoice.id, data: updateData });
      toast.success("Lưu hóa đơn thành công");
    } catch {
      toast.error("Không thể lưu hóa đơn");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await printEntity("invoice", invoice.id);
      // Sau khi in hóa đơn xong (user đóng print dialog), tự động in phiếu giao hàng
      try {
        await printDeliverySlip("invoice", invoice.id);
      } catch (e: any) {
        toast.error(e?.message || "Không thể in phiếu giao hàng");
      }
    } catch (e: any) {
      toast.error(e?.message || "In thất bại");
    }
  };

  const handlePrintDelivery = async () => {
    if (!invoice) return;
    try {
      await printDeliverySlip("invoice", invoice.id);
    } catch (e: any) {
      toast.error(e?.message || "In phiếu giao hàng thất bại");
    }
  };

  const handleProcessInvoice = () => {
    if (!invoice) return;
    router.push(`/ban-hang?invoiceId=${invoice.id}&from=hoa-don`);
  };

  const handleCopy = () => {
    if (!invoice) return;
    router.push(`/ban-hang?copyInvoiceId=${invoice.id}`);
  };

  return (
    <>
      {/* ── Full-screen overlay ── */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-right duration-200">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 -ml-1 rounded-full hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          {isLoading || !invoice ? (
            <div className="h-6 w-40 bg-gray-100 rounded-lg animate-pulse" />
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-base font-bold text-gray-900 flex-shrink-0">
                <CodeLink entity="invoice" code={invoice.code} />
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getInvoiceStatusBadgeColor(invoice.status)}`}>
                {INVOICE_STATUS_LABELS[invoice.status] || "—"}
              </span>
            </div>
          )}

          {/* Print delivery icon — giống orders */}
          {invoice && hasPermPrint && invoice.delivery && (
            <button
              onClick={handlePrintDelivery}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all flex-shrink-0 ml-auto">
              <MapPin className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
              <span className="text-sm text-gray-400">
                Đang tải thông tin hóa đơn...
              </span>
            </div>
          ) : !invoice ? (
            <div className="py-20 text-center text-sm text-red-500">
              Không tìm thấy thông tin hóa đơn
            </div>
          ) : (
            <div className="px-4 py-4 space-y-4 pb-6">
              {/* ── Customer + Branch ── */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 text-base leading-tight">
                    {invoice.customer?.name || "Khách vãng lai"}
                  </p>
                  {invoice.branch && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Chi nhánh {invoice.branch.name}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Info grid — giống OrdersMobileDetailSheet ── */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {invoice.creator && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Người tạo
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {invoice.creator.name}
                    </span>
                  </div>
                )}

                {invoice.soldBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Người bán
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {invoice.soldBy.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Ngày bán
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {formatDate(invoice.purchaseDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Bảng giá
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {invoice.priceBookName || "Bảng giá chung"}
                  </span>
                </div>

                {invoice.branch && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Chi nhánh xử lý
                    </span>
                    <span className="text-sm font-medium text-gray-800 text-right max-w-[55%]">
                      {invoice.branch.name}
                    </span>
                  </div>
                )}

                {/* Trạng thái — dropdown inline nếu editable, giống OrdersMobileDetailSheet */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Trạng thái</span>
                  {isStatusEditable && hasPermUpdate ? (
                    <div className="relative" ref={statusDropdownRef}>
                      <button
                        onClick={() => setShowStatusDropdown((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${getInvoiceStatusBadgeColor(selectedStatus)}`}>
                        {INVOICE_STATUS_LABELS[selectedStatus] || "—"}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${showStatusDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                      {showStatusDropdown && (
                        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-10 min-w-[180px]">
                          {EDITABLE_STATUSES.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setSelectedStatus(opt.value);
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                                selectedStatus === opt.value
                                  ? "bg-brand-soft text-brand font-semibold"
                                  : "text-gray-700 hover:bg-gray-50"
                              }`}>
                              {opt.label}
                              {selectedStatus === opt.value && (
                                <span className="text-brand text-xs">✓</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${getInvoiceStatusBadgeColor(invoice.status)}`}>
                      {INVOICE_STATUS_LABELS[invoice.status] || "—"}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Thông tin giao hàng — giống OrdersMobileDetailSheet ── */}
              {invoice.delivery && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Thông tin giao hàng
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    {(invoice.delivery.receiver ||
                      invoice.delivery.contactNumber) && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">
                          {[
                            invoice.delivery.receiver,
                            invoice.delivery.contactNumber,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    )}
                    {(invoice.delivery.address ||
                      invoice.delivery.wardName) && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-800">
                          {[
                            invoice.delivery.address,
                            invoice.delivery.wardName,
                            invoice.delivery.locationName,
                            invoice.delivery.cityName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Danh sách sản phẩm — giống OrdersMobileDetailSheet ── */}
              {invoice.details && invoice.details.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                    Danh sách sản phẩm ({invoice.details.length})
                  </p>
                  <div className="space-y-2">
                    {invoice.details.map((detail: any, idx: number) => {
                      const conditionLabel = getConditionLabel(
                        detail.conditionType
                      );
                      return (
                        <div
                          key={idx}
                          className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                          {/* Row 1: code + condition badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-brand">
                              {detail.productCode || detail.product?.code ? (
                                <CodeLink
                                  entity="product"
                                  code={
                                    detail.productCode || detail.product?.code
                                  }
                                />
                              ) : (
                                "—"
                              )}
                            </span>
                            {conditionLabel && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${conditionLabel.className}`}>
                                {conditionLabel.text}
                              </span>
                            )}
                          </div>

                          {/* Row 2: product name */}
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-gray-900 leading-tight">
                              {detail.productName || detail.product?.name}
                            </p>
                            <LineTypeBadge item={detail} />
                          </div>
                          <PromotionLineName item={detail} />

                          {/* Row 3: note */}
                          {detail.note && (
                            <p className="text-xs text-gray-400 italic mt-0.5">
                              {detail.note}
                            </p>
                          )}

                          {/* Dashed separator */}
                          <div className="border-t border-dashed border-gray-200 my-2.5" />

                          {/* Row 4: SL × price | total — giống orders */}
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm text-gray-500">
                                SL:{" "}
                                <span className="font-bold text-gray-800">
                                  {detail.quantity}
                                </span>
                                {" × "}
                                <span className="text-gray-600">
                                  {formatCurrency(Number(detail.price))}
                                </span>
                              </span>
                              {Number(detail.discount) > 0 && (
                                <span className="text-xs text-red-500">
                                  Giảm: -
                                  {formatCurrency(Number(detail.discount))}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-brand ml-2 flex-shrink-0">
                              {formatCurrency(
                                Number(
                                  detail.totalPrice ??
                                    (Number(detail.price) -
                                      Number(detail.discount || 0)) *
                                      Number(detail.quantity)
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

              {/* ── Payment summary — giống OrdersMobileDetailSheet ── */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tổng hàng</span>
                  <span className="font-medium text-gray-800">
                    {formatCurrency(Number(invoice.totalAmount))}
                  </span>
                </div>

                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Chiết khấu
                      {(() => {
                        const total = Number(invoice.totalAmount);
                        const amt = Number(invoice.discount);
                        const stored = Number(invoice.discountRatio) || 0;
                        const pct =
                          stored > 0
                            ? stored
                            : total > 0
                              ? Math.round(
                                  ((amt / total) * 100 + Number.EPSILON) * 100
                                ) / 100
                              : 0;
                        return pct > 0 ? ` (${pct}%)` : null;
                      })()}
                    </span>
                    <span className="text-orange-500">
                      -{formatCurrency(Number(invoice.discount))}
                    </span>
                  </div>
                )}

                {/* Tổng cộng */}
                <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                  <span className="font-bold text-gray-900">Tổng cộng</span>
                  <span className="font-bold text-brand text-base">
                    {formatCurrency(Number(invoice.grandTotal))}
                  </span>
                </div>

                {/* Khách đã trả */}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">Khách đã trả</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(Number(invoice.paidAmount))}
                  </span>
                </div>

                {/* Khách cần trả — red border-2 giống orders */}
                <div className="border-t-2 border-red-200 pt-2.5 flex justify-between">
                  <span className="text-base font-bold text-gray-900">
                    Khách cần trả
                  </span>
                  <span className="text-base font-bold text-red-600">
                    {formatCurrency(Number(invoice.debtAmount))}
                  </span>
                </div>
              </div>

              {/* ── Ghi chú — giống OrdersMobileDetailSheet ── */}
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
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                  />
                </div>
              )}
              {!hasPermUpdate && invoice.description && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
                  <p className="text-xs text-amber-500 font-medium mb-1">
                    Ghi chú
                  </p>
                  <p className="text-sm text-amber-800">
                    {invoice.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action bar (sticky bottom) — giống OrdersMobileDetailSheet ── */}
        {invoice && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 flex items-center gap-2">
            {canCancelInvoice && hasPermCancel && (
              <button
                onClick={handleCancelClick}
                disabled={isSaving}
                className="px-3.5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0">
                Hủy
              </button>
            )}

            {showProcessButton && (
              <button
                onClick={handleProcessInvoice}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark active:scale-95 transition-all truncate">
                Xử lý hóa đơn
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
              title="Copy hóa đơn sang tab mới"
              className="p-2.5 text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
