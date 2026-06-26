"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useInvoice, useUpdateInvoice } from "@/lib/hooks/useInvoices";
import { ExternalLink, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  InvoiceDetail,
} from "@/lib/types/invoice";
import { InvoicePackingSlipsTab } from "@/components/invoices/InvoicePackingSlipsTab";
import { InvoicePaymentsTab } from "@/components/invoices/InvoicePaymentsTab";
import { formatCurrency, formatDate } from "@/lib/utils";
import { computeLineVat, computeInvoiceVat } from "@/lib/utils/vat";
import { printDeliverySlip } from "@/lib/utils/print";
import Link from "next/link";
import { DeliveryInfoCard } from "../shared/DeliveryInfoSection";
import { CodeLink } from "../shared/CodeLink";
import {
  InvoiceBuyerTaxInfo,
  InvoiceBuyerInfoValue,
} from "./InvoiceBuyerTaxInfo";
import { findAddressFromDelivery } from "@/lib/utils/customer-address";

interface HoaDonVatDetailRowProps {
  invoiceId: number;
  colSpan: number;
  buyerInfo: InvoiceBuyerInfoValue;
  onBuyerInfoChange: (next: InvoiceBuyerInfoValue) => void;
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

export function HoaDonVatDetailRow({
  invoiceId,
  colSpan,
  buyerInfo,
  onBuyerInfoChange,
}: HoaDonVatDetailRowProps) {
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const [description, setDescription] = useState("");
  const [activeTab, setActiveTab] = useState<
    "info" | "deliveries" | "payments"
  >("info");

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
  }, [invoice]);

  useEffect(() => {
    if (invoice) setDescription(invoice.description || "");
  }, [invoice]);

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

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
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
        className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
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
                        className="text-lg font-bold text-brand hover:underline"
                      />
                    </span>
                    <span className="text-gray-400">-</span>

                    {invoice.customer?.code ? (
                      <>
                        <Link
                          href={`/khach-hang?Code=${invoice.customer.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-semibold text-brand hover:underline"
                          onClick={(e) => e.stopPropagation()}>
                          {invoice?.customer?.name}
                        </Link>
                        <Link
                          href={`/khach-hang?Code=${invoice.customer.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-brand transition-colors"
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
                          ? "border-brand text-brand"
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
                        selectedAddressId={
                          findAddressFromDelivery(
                            invoice.customer?.addresses,
                            invoice.delivery
                          )?.id ?? null
                        }
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

                  {/* Thông tin xuất hóa đơn (chỉ hiển thị, không lưu) */}
                  <InvoiceBuyerTaxInfo
                    value={buyerInfo}
                    onChange={onBuyerInfoChange}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Danh sách sản phẩm (theo dữ liệu Misa)
                      </h4>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[1100px]">
                        <thead>
                          <tr className="bg-gray-100 border-b border-gray-200">
                            <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider">
                              STT
                            </th>
                            <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                              Mã hàng (Misa)
                            </th>
                            <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                              Tên hàng (Misa)
                            </th>
                            <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider">
                              Số lượng
                            </th>
                            {/* <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Đơn giá trước thuế
                            </th> */}
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Đơn giá sau thuế
                            </th>
                            <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider">
                              % VAT
                            </th>
                            {/* <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Giảm giá
                            </th> */}
                            {/* <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Thành tiền trước thuế
                            </th> */}
                            <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider">
                              Thành tiền sau thuế
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {invoice.details?.map(
                            (item: InvoiceDetail, index: number) => {
                              const vat = computeLineVat(
                                {
                                  quantity: item.quantity,
                                  price: item.price,
                                  discount: item.discount,
                                },
                                Number((item.product as any)?.vat ?? 8)
                              );
                              const misaCode =
                                (item.product as any)?.misa_code?.trim() || "";
                              const misaName =
                                (item.product as any)?.misa_name?.trim() || "";
                              const hasMisa = misaCode !== "";
                              return (
                                <tr
                                  key={index}
                                  className="hover:bg-gray-50 transition-colors">
                                  <td className="px-[10px] py-2 text-center">
                                    <span className="text-sm text-gray-900">
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2">
                                    {hasMisa ? (
                                      <span className="text-sm font-medium text-gray-900">
                                        {misaCode}
                                      </span>
                                    ) : (
                                      <span
                                        className="text-sm text-orange-600"
                                        title="Sản phẩm chưa map mã Misa">
                                        {item.product?.code || item.productCode}{" "}
                                        (chưa map Misa)
                                      </span>
                                    )}
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
                                  </td>
                                  <td className="px-[10px] py-2">
                                    <p className="text-sm font-medium text-gray-900">
                                      {misaName ||
                                        item.product?.name ||
                                        item.productName}
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
                                  {/* <td className="px-[10px] py-2 text-right">
                                    <span className="text-md text-gray-900">
                                      {formatCurrency(vat.unitPriceBeforeTax)}
                                    </span>
                                  </td> */}
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-md text-gray-900">
                                      {formatCurrency(vat.unitPriceAfterTax)}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-center">
                                    <span className="text-md text-gray-900">
                                      {vat.vatRate}%
                                    </span>
                                  </td>
                                  {/* <td className="px-[10px] py-2 text-right">
                                    <span className="text-md text-gray-900">
                                      {vat.discount
                                        ? formatCurrency(vat.discount)
                                        : "-"}
                                    </span>
                                  </td> */}
                                  {/* <td className="px-[10px] py-2 text-right">
                                    <span className="text-md text-gray-900">
                                      {formatCurrency(vat.amountBeforeTax)}
                                    </span>
                                  </td> */}
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-md font-semibold text-brand">
                                      {formatCurrency(vat.amountAfterTax)}
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
                        {(() => {
                          const vatSummary = computeInvoiceVat(
                            (invoice.details || []).map((d: any) => ({
                              quantity: d.quantity,
                              price: d.price,
                              discount: d.discount,
                              vatRate: Number((d.product as any)?.vat ?? 8),
                            }))
                          );
                          return (
                            <>
                              <div className="flex justify-between items-center text-md">
                                <span className="text-gray-600">
                                  Tổng tiền hàng ({invoice.details?.length || 0}
                                  ):
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(Number(invoice.totalAmount))}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-md">
                                <span className="text-gray-600">Giảm giá:</span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(Number(invoice.discount))}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                                <span className="text-gray-600">
                                  Tiền trước thuế:
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(vatSummary.totalPreTax)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-md">
                                <span className="text-gray-600">
                                  Thuế VAT:
                                </span>
                                <span className="font-semibold text-brand-dark">
                                  {formatCurrency(vatSummary.totalVat)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                                <span className="text-gray-600">
                                  Tổng sau thuế:
                                </span>
                                <span className="text-md font-bold text-brand">
                                  {formatCurrency(vatSummary.totalAfterTax)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                                <span className="text-gray-600">
                                  Tổng hóa đơn (gốc):
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {formatCurrency(Number(invoice.grandTotal))}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-md">
                                <span className="text-gray-600">
                                  Khách đã trả:
                                </span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(Number(invoice.paidAmount))}
                                </span>
                              </div>
                            </>
                          );
                        })()}
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
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
