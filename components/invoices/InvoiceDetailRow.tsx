// components/invoices/InvoiceDetailRow.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoice, useUpdateInvoice } from "@/lib/hooks/useInvoices";
import { Copy, ExternalLink, Loader2, MapPin, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  InvoiceDetail,
} from "@/lib/types/invoice";
import Swal from "sweetalert2";
import { InvoicePackingSlipsTab } from "./InvoicePackingSlipsTab";
import { InvoicePaymentsTab } from "./InvoicePaymentsTab";
import { formatCurrency, formatDate } from "@/lib/utils";
import { printDeliverySlip, printEntity } from "@/lib/utils/print";
import Link from "next/link";
import { DeliveryInfoCard } from "../shared/DeliveryInfoSection";
import { CodeLink } from "../shared/CodeLink";
import { useCan, useIsAdmin } from "@/lib/hooks/useCan";

interface InvoiceDetailRowProps {
  invoiceId: number;
  colSpan: number;
}

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

export function InvoiceDetailRow({
  invoiceId,
  colSpan,
}: InvoiceDetailRowProps) {
  const router = useRouter();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<
    "info" | "deliveries" | "payments"
  >("info");

  const hasPermCancel = useCan("invoices", "cancel");
  const hasPermUpdate = useCan("invoices", "update");
  const hasPermPrint = useCan("invoices", "print");
  const isAdmin = useIsAdmin();

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky wrapper theo chiều ngang scroll (clone từ OrderDetailRow)
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
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    setWidth();
    const ro = new ResizeObserver(setWidth);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [invoice]);

  useEffect(() => {
    if (invoice) setDescription(invoice.description || "");
  }, [invoice]);

  const handleCancel = async () => {
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
      if (result.isConfirmed) {
        try {
          setIsSaving(true);
          await updateInvoice.mutateAsync({
            id: invoice.id,
            data: { status: INVOICE_STATUS.CANCELLED },
          });
          toast.success("Đã hủy hóa đơn thành công");
        } catch {
          toast.error("Không thể hủy hóa đơn");
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!invoice) return;
    try {
      setIsSaving(true);
      await updateInvoice.mutateAsync({
        id: invoice.id,
        data: { description },
      });
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

  const handleUpdateDeliveryAddress = async (
    wardName: string,
    cityName: string
  ) => {
    if (!invoice?.delivery) return;
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        data: {
          delivery: {
            receiver: invoice.delivery.receiver || "",
            contactNumber: invoice.delivery.contactNumber || "",
            address: invoice.delivery.address || "",
            locationName: cityName,
            wardName,
            noteForDriver: invoice.delivery.noteForDriver,
          },
        },
      });
      toast.success("Đã cập nhật địa chỉ giao hàng");
    } catch {
      toast.error("Không thể cập nhật địa chỉ");
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

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">Đang tải thông tin hóa đơn...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!invoice) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin hóa đơn
        </td>
      </tr>
    );
  }

  const isFinalState =
    invoice.status === INVOICE_STATUS.COMPLETED ||
    invoice.status === INVOICE_STATUS.CANCELLED ||
    invoice.status === INVOICE_STATUS.DELIVERED;

  // Admin/Super Admin được bỏ qua điều kiện ẩn theo trạng thái hóa đơn
  const canCancel = !isFinalState || isAdmin;
  const canProcess = !isFinalState || isAdmin;

  const getConditionLabel = (conditionType?: string) => {
    switch (conditionType) {
      case "damaged":
        return {
          text: "Bục rách",
          className: "bg-red-50 text-red-600 border-red-200",
        };
      case "near_expiry":
        return {
          text: "Cận date",
          className: "bg-amber-50 text-amber-600 border-amber-200",
        };
      default:
        return null;
    }
  };

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-blue-500 p-0 bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="border-b border-gray-200 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      <CodeLink
                        entity="invoice"
                        code={invoice.code}
                        className="text-lg font-bold text-blue-600 hover:underline"
                      />
                    </span>
                    <span className="text-gray-400">-</span>

                    {invoice.customer?.code ? (
                      <>
                        <Link
                          href={`/khach-hang?Code=${invoice.customer.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}>
                          {invoice?.customer?.name}
                        </Link>
                        <Link
                          href={`/khach-hang?Code=${invoice.customer.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <span
                          className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getInvoiceStatusBadgeColor(invoice.status)}`}>
                          {INVOICE_STATUS_LABELS[
                            invoice.status as keyof typeof INVOICE_STATUS_LABELS
                          ] || "Không xác định"}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-semibold text-gray-800">
                        Khách vãng lai
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {invoice.branch?.name || "-"}
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-gray-100">
                  {[
                    { key: "info", label: "Thông tin" },
                    { key: "deliveries", label: "Lịch sử giao hàng" },
                    { key: "payments", label: "Lịch sử thanh toán" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key as any)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === t.key
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              {activeTab === "info" && (
                <div className="space-y-4">
                  {/* Info grid 3 cols */}
                  <div className="grid grid-cols-3 gap-x-8 border-gray-200 pb-2 mb-2">
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Người tạo:
                      </label>
                      <span className="block text-sm text-gray-900">
                        {invoice.creator?.name || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Người bán:
                      </label>
                      <span className="block text-sm text-gray-900">
                        {invoice.soldBy?.name || invoice.creator?.name || "-"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Ngày bán:
                      </label>
                      <span className="block text-sm text-gray-900">
                        {formatDate(invoice.purchaseDate)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500 pr-1.5">
                        Bảng giá:
                      </label>
                      <span className="block text-sm text-gray-900">
                        {invoice.priceBookName || "Bảng giá chung"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                      <label className="block text-sm text-gray-500">
                        Chi nhánh:
                      </label>
                      <span className="block text-sm text-gray-900">
                        {invoice.branch?.name || "-"}
                      </span>
                    </div>
                    {/* <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500 whitespace-nowrap shrink-0">
                        Kênh bán:
                      </label>
                      <span className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 truncate">
                        {invoice.saleChannelId || "Khác"}
                      </span>
                    </div> */}
                  </div>

                  {/* Delivery info */}
                  {invoice.delivery && (
                    <div className="space-y-2">
                      <DeliveryInfoCard
                        delivery={invoice.delivery}
                        customerAddresses={invoice.customer?.addresses}
                        onUpdateToNewAddress={handleUpdateDeliveryAddress}
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handlePrintDelivery}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                          <Printer className="w-3.5 h-3.5" />
                          In phiếu giao hàng
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Danh sách sản phẩm
                      </h4>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700  tracking-wider">
                              Mã hàng
                            </th>
                            <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700  tracking-wider">
                              Tên hàng
                            </th>
                            <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700  tracking-wider">
                              Số lượng
                            </th>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700  tracking-wider">
                              Đơn giá
                            </th>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700  tracking-wider">
                              Giảm giá
                            </th>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700  tracking-wider">
                              Thành tiền
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoice.details?.map(
                            (item: InvoiceDetail, index: number) => {
                              console.log(item);
                              return (
                                <tr
                                  key={index}
                                  className="hover:bg-gray-50 transition-colors">
                                  <td className="px-[10px] py-2">
                                    {item.product?.code || item.productCode ? (
                                      <>
                                        <Link
                                          href={`/san-pham/danh-sach?Code=${item.product?.code || item.productCode}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm font-medium text-blue-600 hover:underline"
                                          onClick={(e) => e.stopPropagation()}>
                                          {item.product?.code ||
                                            item.productCode}
                                        </Link>

                                        {(() => {
                                          const label = getConditionLabel(
                                            item.conditionType
                                          );
                                          if (!label) return null;
                                          return (
                                            <span
                                              className={`px-1.5 ml-1 py-0.5 text-xs rounded-full border ${label.className}`}>
                                              {label.text}
                                            </span>
                                          );
                                        })()}
                                      </>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                  <td className="px-[10px] py-2">
                                    <p className="text-sm font-medium text-gray-900">
                                      {item.product?.name || item.productName}
                                    </p>
                                    {item.note && (
                                      <p className="text-sm text-gray-500 mt-1 italic">
                                        {item.note}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-[10px] py-2 text-center">
                                    <span className="text-sm font-medium text-gray-900">
                                      {item.quantity}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-md text-gray-900">
                                      {formatCurrency(Number(item.price))}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-md text-gray-900">
                                      {item.discount
                                        ? formatCurrency(Number(item.discount))
                                        : "-"}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-md font-semibold text-blue-600">
                                      {formatCurrency(Number(item.totalPrice))}
                                    </span>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary w-96 */}
                  <div className="flex gap-6">
                    {/* Ghi chú */}
                    <div className="flex-1">
                      <label className="block text-sm text-gray-500 mb-1.5">
                        Ghi chú hóa đơn:
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) =>
                          setDescription(e.target.value.slice(0, 1000))
                        }
                        maxLength={1000}
                        className="w-full px-3 py-2 text-md border rounded bg-white resize-none"
                        rows={4}
                        placeholder="Nhập ghi chú..."
                      />
                    </div>

                    <div className="w-96">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">
                            Tổng tiền hàng ({invoice.details?.length || 0}):
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(Number(invoice.totalAmount))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">Giảm giá:</span>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(Number(invoice.discount))}
                            {(() => {
                              const discountAmt = Number(invoice.discount);
                              const total = Number(invoice.totalAmount);
                              if (discountAmt <= 0 || total <= 0) return null;
                              // Ưu tiên % đã lưu; fallback tính từ số tiền (HĐ cũ / HĐ từ đơn).
                              const stored = Number(invoice.discountRatio) || 0;
                              const pct =
                                stored > 0
                                  ? stored
                                  : Math.round(
                                      ((discountAmt / total) * 100 +
                                        Number.EPSILON) *
                                        100
                                    ) / 100;
                              return (
                                <span className="text-red-600 ml-1">
                                  ({pct}%)
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Tổng cộng:</span>
                          <span className="text-md font-bold text-blue-600">
                            {formatCurrency(Number(invoice.grandTotal))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">Trả hàng:</span>
                          <span className="font-semibold text-orange-600">
                            -
                            {formatCurrency(
                              Number((invoice as any).returnOrderAmount)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Còn lại:</span>
                          <span className="text-md font-bold text-blue-600">
                            {formatCurrency(
                              Number(invoice.grandTotal) -
                                Number((invoice as any).returnOrderAmount)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">Khách đã trả:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(Number(invoice.paidAmount))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center rounded-b-lg border-t-2 border-red-200 pt-2">
                          <span className="text-lg font-bold text-gray-900">
                            Khách còn nợ:
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {formatCurrency(
                              Number((invoice as any).returnOrderAmount || 0) >
                                0
                                ? Number(invoice.grandTotal) -
                                    Number((invoice as any).returnOrderAmount) -
                                    Number(invoice.paidAmount)
                                : Number(invoice.debtAmount)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "deliveries" && (
                <InvoicePackingSlipsTab invoiceId={invoice.id} />
              )}
              {activeTab === "payments" && (
                <InvoicePaymentsTab invoiceId={invoice.id} />
              )}

              {/* Action footer */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {canCancel && hasPermCancel && (
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? "Đang xử lý..." : "Hủy"}
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    title="Sao chép hóa đơn sang tab mới"
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép
                  </button>
                </div>
                <div className="flex gap-2">
                  {canProcess && hasPermUpdate && (
                    <button
                      onClick={handleProcessInvoice}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      Xử lý hóa đơn
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    hidden={!hasPermUpdate}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSaving ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button
                    onClick={handlePrint}
                    hidden={!hasPermPrint}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    <Printer className="w-3.5 h-3.5" />
                    In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
