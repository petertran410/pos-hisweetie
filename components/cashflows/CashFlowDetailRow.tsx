"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  useCashFlow,
  useRelatedInvoicePayments,
  useCancelCashFlow,
} from "@/lib/hooks/useCashflows";
import { ExternalLink, Loader2, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { printEntity } from "@/lib/utils/print";
import Swal from "sweetalert2";
import { useAuthStore } from "@/lib/store/auth";
import Link from "next/link";
import { EditCashFlowModal } from "./EditCashFlowModal";

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
      return isReceipt ? "Đã thu" : "Đã chi";
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sticky wrapper theo chiều ngang scroll
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

  const handleCancel = async () => {
    if (!cashFlow) return;
    const result = await Swal.fire({
      title: `Xác nhận hủy ${cashFlow.isReceipt ? "phiếu thu" : "phiếu chi"}`,
      text: `Bạn có chắc muốn hủy ${cashFlow.code}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Xác nhận hủy",
      cancelButtonText: "Đóng",
    });
    if (!result.isConfirmed) return;
    try {
      await cancelCashFlow.mutateAsync(cashFlow.id);
      toast.success(`Đã hủy ${cashFlow.code}`);
    } catch {
      toast.error("Hủy phiếu thất bại");
    }
  };

  const handlePrint = async () => {
    if (!cashFlow) return;
    setIsPrinting(true);
    try {
      await printEntity("cashflows", cashFlow.id);
    } catch (err: any) {
      toast.error(err?.message || "In thất bại");
    } finally {
      setIsPrinting(false);
    }
  };

  // Derived values
  const partnerName =
    cashFlow?.customer?.name ||
    cashFlow?.supplier?.name ||
    cashFlow?.partnerName ||
    null;

  const partnerCode =
    cashFlow?.partnerType === "C" ? cashFlow?.customer?.code : null;

  const hasInvoicePayments =
    Array.isArray(invoicePayments) && invoicePayments.length > 0;

  const isCancelled = cashFlow?.status === 2;

  const isAdmin = user?.roles?.some(
    (r: string) => r === "Admin" || r === "Super Admin"
  );
  const canCancel = !isCancelled && isAdmin;

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        </td>
      </tr>
    );
  }

  if (!cashFlow) return null;

  return (
    <>
      <tr className="border-b-2 border-blue-400">
        <td colSpan={colSpan} className="p-0 bg-gray-50">
          <div ref={wrapperRef} className="overflow-hidden">
            <div className="bg-white border border-gray-200 overflow-hidden">
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 pt-3 border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {cashFlow.code}
                  </span>
                  <span className="text-gray-400">-</span>
                  {/* Title + status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {partnerName ? (
                      <>
                        {partnerCode ? (
                          <Link
                            href={`/khach-hang?Code=${partnerCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {partnerName}
                          </Link>
                        ) : (
                          <span className="text-lg font-semibold text-gray-800">
                            {partnerName}
                          </span>
                        )}
                        {partnerCode && (
                          <Link
                            href={`/khach-hang?Code=${partnerCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </>
                    ) : (
                      <span className="text-lg font-semibold text-gray-800">
                        Không xác định
                      </span>
                    )}

                    <span
                      className={`ml-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(cashFlow.status)}`}>
                      {getStatusText(cashFlow.status, cashFlow.isReceipt)}
                    </span>
                  </div>
                </div>

                {/* Right: mã phiếu + chi nhánh */}
                <span className="text-sm text-gray-600 font-medium">
                  {cashFlow.branchName || cashFlow.branch?.name || "-"}
                </span>
              </div>

              {/* ── Tabs ── */}
              <div className="flex gap-1 px-6 border-b border-gray-100">
                {[
                  { key: "info", label: "Thông tin" },
                  {
                    key: "invoices",
                    label: `Hóa đơn liên quan${invoicePayments?.length ? ` (${invoicePayments.length})` : ""}`,
                  },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Content ── */}
              <div className="px-6 py-3 space-y-2">
                {/* Tab: Thông tin */}
                {activeTab === "info" && (
                  <>
                    {/* Row 1: Người thu/chi | Thời gian | Chi nhánh | Loại phiếu */}
                    <div className="grid grid-cols-4 gap-x-8 border-gray-200 pb-2">
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          {cashFlow.isReceipt ? "Người thu:" : "Người chi:"}
                        </label>
                        <span className="block text-sm text-gray-900">
                          {cashFlow.creatorName ||
                            cashFlow.creator?.name ||
                            "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Thời gian:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {formatDateTime(cashFlow.transDate)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Chi nhánh:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {cashFlow.branchName || cashFlow.branch?.name || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Loại phiếu:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {cashFlow.isReceipt ? "Phiếu thu" : "Phiếu chi"}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Số tiền | Loại thu/chi | Phương thức | Tài khoản NH */}
                    <div className="grid grid-cols-4 gap-x-8 border-gray-200 pb-2 mb-2">
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Số tiền:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {cashFlow.isReceipt ? "+" : "-"}
                          {formatCurrency(Number(cashFlow.amount))}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          {cashFlow.isReceipt ? "Loại thu:" : "Loại chi:"}
                        </label>
                        <span className="block text-sm text-gray-900">
                          {cashFlow.cashFlowGroupName ||
                            cashFlow.cashFlowGroup?.name ||
                            "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Phương thức:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {getMethodText(cashFlow.method)}
                        </span>
                      </div>
                      {cashFlow.account ? (
                        <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                          <label className="block text-sm text-gray-500">
                            Tài khoản ngân hàng:
                          </label>
                          <span className="block text-sm text-gray-900">
                            {cashFlow.account.bankName} -{" "}
                            {cashFlow.account.accountNumber}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>

                    {/* Row 3: Đối tượng */}
                    {partnerName && (
                      <div className="grid grid-cols-4 gap-6">
                        <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                          <label className="block text-sm text-gray-500">
                            {cashFlow.isReceipt
                              ? "Đối tượng nộp:"
                              : "Đối tượng nhận:"}
                          </label>
                          <span className="block text-sm text-gray-900">
                            {partnerName}
                          </span>
                        </div>
                        {(cashFlow.customer?.contactNumber ||
                          cashFlow.supplier?.contactNumber ||
                          cashFlow.contactNumber) && (
                          <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                            <label className="block text-sm text-gray-500">
                              Số điện thoại:
                            </label>
                            <span className="block text-sm text-gray-900">
                              {cashFlow.customer?.contactNumber ||
                                cashFlow.supplier?.contactNumber ||
                                cashFlow.contactNumber}
                            </span>
                          </div>
                        )}
                        {cashFlow.address && (
                          <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                            <label className="block text-sm text-gray-500">
                              Địa chỉ:
                            </label>
                            <span className="block text-sm text-gray-900">
                              {cashFlow.customer?.invoiceAddress} -{" "}
                              {cashFlow.customer?.invoiceCityName} -{" "}
                              {cashFlow.customer?.invoiceWardName}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ghi chú */}
                    <div>
                      <label className="block text-sm text-gray-500">
                        Ghi chú:
                      </label>
                      <div className="w-full px-3 py-2 text-md border rounded bg-gray-50 min-h-[60px]">
                        <p className="text-md text-gray-900">
                          {cashFlow.description || "Chưa có ghi chú"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Tab: Hóa đơn liên quan */}
                {activeTab === "invoices" &&
                  (hasInvoicePayments ? (
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
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <p className="text-sm">Không có hóa đơn liên quan</p>
                    </div>
                  ))}

                {/* ── Footer actions ── */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200">
                  <div className="flex gap-2">
                    {canCancel && (
                      <button
                        onClick={handleCancel}
                        disabled={cancelCashFlow.isPending}
                        className="px-4 py-2 text-md font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {cancelCashFlow.isPending ? "Đang xử lý..." : "Hủy"}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {/* THÊM NÚT CHỈNH SỬA */}
                    {!isCancelled && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2">
                        <Pencil className="w-4 h-4" />
                        Chỉnh sửa
                      </button>
                    )}
                    <button
                      onClick={handlePrint}
                      disabled={isPrinting || isCancelled}
                      className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      <Printer className="w-4 h-4" />
                      {isPrinting ? "Đang in..." : "In"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
      {/* Edit Modal */}
      {showEditModal && cashFlow && (
        <EditCashFlowModal
          cashFlow={cashFlow}
          invoicePayments={invoicePayments || []}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onCancelCashFlow={() => {
            setShowEditModal(false);
            handleCancel();
          }}
        />
      )}
    </>
  );
}
