// components/cashflows/CashFlowDetailRow.tsx
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  useCashFlow,
  useRelatedInvoicePayments,
  useCancelCashFlow,
} from "@/lib/hooks/useCashflows";
import { Loader2, Printer, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import Swal from "sweetalert2";
import { useAuthStore } from "@/lib/store/auth";

interface CashFlowDetailRowProps {
  cashFlowId: number;
  colSpan: number;
}

const getStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return "bg-green-100 text-green-700";
    case 2:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusText = (status: number, isReceipt: boolean) => {
  switch (status) {
    case 0:
      return isReceipt ? "Đã thanh toán" : "Đã chi";
    case 2:
      return "Đã hủy";
    default:
      return "Đang xử lý";
  }
};

const getMethodText = (method: string) => {
  const map: Record<string, string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    ewallet: "Ví điện tử",
    card: "Thẻ",
  };
  return map[method] || method || "-";
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("vi-VN");
};

export function CashFlowDetailRow({
  cashFlowId,
  colSpan,
}: CashFlowDetailRowProps) {
  const { data: cashFlow, isLoading } = useCashFlow(cashFlowId);
  const { data: invoicePayments } = useRelatedInvoicePayments(cashFlowId);
  const cancelCashFlow = useCancelCashFlow();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"info" | "invoices">("info");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky wrapper theo chiều ngang scroll (giống InvoiceDetailRow)
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
    const onScroll = () => {
      el.style.transform = `translateX(${scrollEl!.scrollLeft}px)`;
    };
    scrollEl.addEventListener("scroll", onScroll);
    return () => {
      ro.disconnect();
      scrollEl?.removeEventListener("scroll", onScroll);
    };
  }, [cashFlow]);

  const handleDelete = async () => {
    if (!cashFlow) return;

    const result = await Swal.fire({
      title: `Xác nhận hủy ${cashFlow.isReceipt ? "phiếu thu" : "phiếu chi"}`,
      html: `Bạn có chắc chắn muốn hủy <b>${cashFlow.code}</b>?<br/>Thao tác này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Hủy phiếu",
      cancelButtonText: "Đóng",
    });

    if (result.isConfirmed) {
      try {
        await cancelCashFlow.mutateAsync(cashFlowId);
      } catch (error: any) {
        toast.error(error.message || "Có lỗi xảy ra");
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Đang tải...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!cashFlow) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-6 py-8 text-center text-red-500">
          Không tìm thấy phiếu thu/chi
        </td>
      </tr>
    );
  }

  const hasInvoicePayments = invoicePayments && invoicePayments.length > 0;
  const tabs = [
    { key: "info" as const, label: "Thông tin" },
    ...(hasInvoicePayments
      ? [
          {
            key: "invoices" as const,
            label: `Hóa đơn liên quan (${invoicePayments.length})`,
          },
        ]
      : []),
  ];

  const isCancelled = cashFlow.status === 2;

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div ref={wrapperRef} className="px-6 py-6 bg-gray-50">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              {/* ── Header ── */}
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-extrabold text-gray-800">
                      {cashFlow.isReceipt ? "Phiếu thu" : "Phiếu chi"}{" "}
                      <span className="text-lg font-thin">{cashFlow.code}</span>
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cashFlow.status)}`}>
                      {getStatusText(cashFlow.status, cashFlow.isReceipt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="In">
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Tabs ── */}
              {tabs.length > 1 && (
                <div className="flex gap-4 border-b border-gray-200 mb-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`pb-2 text-md font-medium border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Tab: Thông tin ── */}
              {activeTab === "info" && (
                <div className="space-y-6">
                  {/* Row 1: Người tạo, Người thu/chi, Thời gian, Chi nhánh */}
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Người tạo
                      </label>
                      <span className="text-md text-gray-900 font-medium">
                        {cashFlow.creatorName || cashFlow.creator?.name || "-"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        {cashFlow.isReceipt ? "Người thu" : "Người chi"}
                      </label>
                      <span className="text-md text-gray-900 font-medium">
                        {cashFlow.creatorName || cashFlow.creator?.name || "-"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Thời gian
                      </label>
                      <span className="text-md text-gray-900">
                        {formatDateTime(cashFlow.transDate)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Chi nhánh
                      </label>
                      <span className="text-md text-gray-900">
                        {cashFlow.branchName || cashFlow.branch?.name || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Số tiền, Loại thu/chi, Phương thức, Tài khoản NH */}
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Số tiền
                      </label>
                      <span
                        className={`text-lg font-semibold ${
                          cashFlow.isReceipt ? "text-green-600" : "text-red-600"
                        }`}>
                        {cashFlow.isReceipt ? "+" : "-"}
                        {formatCurrency(Number(cashFlow.amount))}
                      </span>
                    </div>
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        {cashFlow.isReceipt ? "Loại thu" : "Loại chi"}
                      </label>
                      <span className="text-md text-gray-900">
                        {cashFlow.cashFlowGroupName ||
                          cashFlow.cashFlowGroup?.name ||
                          "-"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Phương thức thanh toán
                      </label>
                      <span className="text-md text-gray-900">
                        {getMethodText(cashFlow.method)}
                      </span>
                    </div>
                    {cashFlow.account && (
                      <div>
                        <label className="block text-md font-medium text-gray-500 mb-1.5">
                          Tài khoản ngân hàng
                        </label>
                        <span className="text-md text-gray-900">
                          {cashFlow.account.bankName} -{" "}
                          {cashFlow.account.accountNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Đối tượng nộp/nhận */}
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-2">
                      {cashFlow.isReceipt ? "Người nộp" : "Người nhận"}
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-md text-gray-900">
                        {cashFlow.partnerName && `${cashFlow.partnerName}`}
                        {cashFlow.partnerType === "C" &&
                          cashFlow.customer?.code &&
                          ` - ${cashFlow.customer.code}`}
                        {cashFlow.partnerType === "S" &&
                          cashFlow.supplier?.code &&
                          ` - ${cashFlow.supplier.code}`}
                        {cashFlow.contactNumber &&
                          ` - ${cashFlow.contactNumber}`}
                        {!cashFlow.partnerName &&
                          !cashFlow.customer?.code &&
                          !cashFlow.supplier?.code &&
                          !cashFlow.contactNumber &&
                          "-"}
                      </p>
                      {(cashFlow.address || cashFlow.wardName) && (
                        <p className="text-md text-gray-600 mt-1">
                          {[
                            cashFlow.address,
                            cashFlow.wardName,
                            cashFlow.customer?.cityName,
                            cashFlow.customer?.districtName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-2">
                      Ghi chú
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-md text-gray-900">
                        {cashFlow.description || "Chưa có ghi chú"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Hóa đơn liên quan ── */}
              {activeTab === "invoices" && hasInvoicePayments && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                          Mã hóa đơn
                        </th>
                        <th className="px-4 py-3 text-left text-md font-semibold text-gray-700">
                          Thời gian
                        </th>
                        <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                          Giá trị hóa đơn
                        </th>
                        <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                          Đã thu trước
                        </th>
                        <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                          Giá trị thu
                        </th>
                        <th className="px-4 py-3 text-right text-md font-semibold text-gray-700">
                          Còn cần thu
                        </th>
                        <th className="px-4 py-3 text-center text-md font-semibold text-gray-700">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoicePayments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="text-md font-medium text-blue-600">
                              {payment.invoice?.code}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-md text-gray-900">
                            {formatDateTime(payment.paymentDate)}
                          </td>
                          <td className="px-4 py-3 text-right text-md text-gray-900">
                            {formatCurrency(
                              Number(payment.invoice?.grandTotal || 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-md text-gray-900">
                            {formatCurrency(
                              Number(payment.invoice?.paidAmount || 0) -
                                Number(payment.amount)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-md font-medium text-green-600">
                            {formatCurrency(Number(payment.amount))}
                          </td>
                          <td className="px-4 py-3 text-right text-md text-gray-900">
                            {formatCurrency(
                              Number(payment.invoice?.debtAmount || 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                payment.invoice?.status === 1
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                              {payment.invoice?.status === 1
                                ? "Hoàn thành"
                                : "Đang xử lý"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Action footer ── */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {!isCancelled && (
                    <button
                      onClick={handleDelete}
                      className="px-4 py-2 text-md font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Hủy phiếu
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {!isCancelled && (
                    <button
                      onClick={() =>
                        toast.info("Chức năng chỉnh sửa đang được phát triển")
                      }
                      className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Chỉnh sửa
                    </button>
                  )}
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
                    <Printer className="w-4 h-4" />
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
