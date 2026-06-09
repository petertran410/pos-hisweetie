"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { CodeLink } from "../shared/CodeLink";
import { useCan } from "@/lib/hooks/useCan";

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
  const { data: relatedPayments } = useRelatedInvoicePayments(cashFlowId);
  const invoicePayments: any[] = relatedPayments?.invoicePayments || [];
  const orderPayments: any[] = relatedPayments?.orderPayments || [];
  const debtOffsets: any[] = relatedPayments?.debtOffsets || [];
  const purchaseOrderPayments: any[] =
    relatedPayments?.purchaseOrderPayments || [];
  const orderSupplierPayments: any[] =
    relatedPayments?.orderSupplierPayments || [];
  const activeDebtOffsets = debtOffsets.filter((d: any) => d.status !== 5);
  const debtOffsetTotal = activeDebtOffsets.reduce(
    (sum: number, d: any) => sum + Number(d.refundAmount),
    0
  );

  const canUpdateCashFlow = useCan("cash_flows", "update");
  const canDeleteCashFlow = useCan("cash_flows", "delete");
  const canPrintCashFlow = useCan("cash_flows", "print");

  const mergedInvoices = useMemo(() => {
    const map = new Map<
      number,
      {
        invoiceId: number;
        invoiceCode: string;
        grandTotal: number;
        paidAmount: number;
        debtAmount: number;
        status: number;
        latestDate: string;
        payments: any[];
        offsets: any[];
      }
    >();

    for (const p of invoicePayments) {
      const invId = p.invoice?.id;
      if (!invId) continue;
      if (!map.has(invId)) {
        map.set(invId, {
          invoiceId: invId,
          invoiceCode: p.invoice.code,
          grandTotal: Number(p.invoice.grandTotal || 0),
          paidAmount: Number(p.invoice.paidAmount || 0),
          debtAmount: Number(p.invoice.debtAmount || 0),
          status: p.invoice.status,
          latestDate: p.paymentDate,
          payments: [],
          offsets: [],
        });
      }
      map.get(invId)!.payments.push(p);
    }

    for (const o of debtOffsets) {
      const invId = o.invoice?.id;
      if (!invId) continue;
      if (!map.has(invId)) {
        map.set(invId, {
          invoiceId: invId,
          invoiceCode: o.invoice.code,
          grandTotal: Number(o.invoice.grandTotal || 0),
          paidAmount: Number(o.invoice.paidAmount || 0),
          debtAmount: Number(o.invoice.debtAmount || 0),
          status: o.invoice.status,
          latestDate: o.refundConfirmedAt,
          payments: [],
          offsets: [],
        });
      }
      map.get(invId)!.offsets.push(o);
    }

    return Array.from(map.values());
  }, [invoicePayments, debtOffsets]);
  const hasInvoicePayments =
    invoicePayments.length > 0 ||
    orderPayments.length > 0 ||
    debtOffsets.length > 0 ||
    purchaseOrderPayments.length > 0 ||
    orderSupplierPayments.length > 0;
  const cancelCashFlow = useCancelCashFlow();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"info" | "invoices">("info");
  const [isPrinting, setIsPrinting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [visibleTooltipId, setVisibleTooltipId] = useState<string | null>(null);

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
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--dt-text-muted)" }} />
          </div>
        </td>
      </tr>
    );
  }

  if (!cashFlow) return null;

  return (
    <>
      <tr style={{ borderBottom: "2px solid var(--dt-primary)" }}>
        <td colSpan={colSpan} className="p-0" style={{ background: "var(--dt-bg-soft)" }}>
          <div ref={wrapperRef} className="overflow-hidden">
            <div
              className="bg-white border overflow-hidden"
              style={{ borderColor: "var(--dt-border)" }}>
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">
                    <CodeLink
                      entity="cashflow"
                      code={cashFlow.code}
                      className="text-lg font-bold hover:underline"
                    />
                  </span>
                  <span style={{ color: "var(--dt-text-muted)" }}>-</span>
                  {/* Title + status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {partnerName ? (
                      <>
                        {partnerCode ? (
                          <Link
                            href={`/khach-hang?Code=${partnerCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold hover:underline"
                            style={{ color: "var(--dt-primary)" }}
                            onClick={(e) => e.stopPropagation()}>
                            {partnerName}
                          </Link>
                        ) : (
                          <span className="text-lg font-semibold" style={{ color: "var(--dt-text)" }}>
                            {partnerName}
                          </span>
                        )}
                        {partnerCode && (
                          <Link
                            href={`/khach-hang?Code=${partnerCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-colors"
                            style={{ color: "var(--dt-text-muted)" }}
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                      </>
                    ) : (
                      <span className="text-lg font-semibold" style={{ color: "var(--dt-text)" }}>
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
                <span className="text-sm font-medium" style={{ color: "var(--dt-text-secondary)" }}>
                  {cashFlow.branchName || cashFlow.branch?.name || "-"}
                </span>
              </div>

              {/* ── Tabs ── */}
              <div className="flex gap-1 px-6 border-b" style={{ borderColor: "var(--dt-border)" }}>
                {[
                  { key: "info", label: "Thông tin" },
                  {
                    key: "invoices",
                    label: "Mã phiếu liên quan",
                  },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
                    style={
                      activeTab === t.key
                        ? { borderColor: "var(--dt-primary)", color: "var(--dt-primary)" }
                        : { borderColor: "transparent", color: "var(--dt-text-muted)" }
                    }>
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
                    <div className="grid grid-cols-4 gap-x-5">
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          {cashFlow.isReceipt ? "Người thu:" : "Người chi:"}
                        </label>
                        <span className="dt-field-value">
                          {cashFlow.collectorName ||
                            cashFlow.collector?.name ||
                            cashFlow.creatorName ||
                            cashFlow.creator?.name ||
                            "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          Thời gian:
                        </label>
                        <span className="dt-field-value">
                          {formatDateTime(cashFlow.transDate)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          Chi nhánh:
                        </label>
                        <span className="dt-field-value">
                          {cashFlow.branchName || cashFlow.branch?.name || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          Loại phiếu:
                        </label>
                        <span className="dt-field-value">
                          {cashFlow.isReceipt ? "Phiếu thu" : "Phiếu chi"}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Số tiền | Loại thu/chi | Phương thức | Tài khoản NH */}
                    <div className="grid grid-cols-4 gap-x-5">
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          Số tiền:
                        </label>
                        <span className="dt-field-value">
                          {cashFlow.isReceipt ? "+" : "-"}
                          {formatCurrency(Number(cashFlow.amount))}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          {cashFlow.isReceipt ? "Loại thu:" : "Loại chi:"}
                        </label>
                        <span className="dt-field-value">
                          {cashFlow.cashFlowGroupName ||
                            cashFlow.cashFlowGroup?.name ||
                            "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                        <label className="dt-field-label">
                          Phương thức:
                        </label>
                        <span className="dt-field-value">
                          {getMethodText(cashFlow.method)}
                        </span>
                      </div>
                      {cashFlow.account ? (
                        <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                          <label className="dt-field-label">
                            Tài khoản ngân hàng:
                          </label>
                          <span className="dt-field-value">
                            {cashFlow.account.bankCode} -{" "}
                            {cashFlow.account.accountNumber}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}
                    </div>

                    {/* Mã tham chiếu Sepay (chỉ hiện khi có) */}
                    {cashFlow.sepayReferenceCode && (
                      <div className="grid grid-cols-4 gap-x-5">
                        <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                          <label className="dt-field-label">
                            Mã tham chiếu:
                          </label>
                          <span className="dt-field-value">
                            {cashFlow.sepayReferenceCode}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Row 3: Đối tượng */}
                    {partnerName && (
                      <div className="grid grid-cols-4 gap-5">
                        <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                          <label className="dt-field-label">
                            {cashFlow.isReceipt
                              ? "Đối tượng nộp:"
                              : "Đối tượng nhận:"}
                          </label>
                          <span className="dt-field-value">
                            {partnerName}
                          </span>
                        </div>
                        {(cashFlow.customer?.contactNumber ||
                          cashFlow.supplier?.contactNumber ||
                          cashFlow.contactNumber) && (
                          <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                            <label className="dt-field-label">
                              Số điện thoại:
                            </label>
                            <span className="dt-field-value">
                              {cashFlow.customer?.contactNumber ||
                                cashFlow.supplier?.contactNumber ||
                                cashFlow.contactNumber}
                            </span>
                          </div>
                        )}
                        {cashFlow.address && (
                          <div className="flex flex-col gap-2 mb-2 dt-field-divider">
                            <label className="dt-field-label">
                              Địa chỉ:
                            </label>
                            <span className="dt-field-value">
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
                      <label className="dt-field-label">
                        Ghi chú:
                      </label>
                      <div
                        className="w-full px-3 py-2 text-md border rounded min-h-[60px]"
                        style={{ background: "var(--dt-bg-soft)", borderColor: "var(--dt-border)" }}>
                        <p className="text-md" style={{ color: "var(--dt-text)" }}>
                          {cashFlow.description || "Chưa có ghi chú"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "invoices" && (
                  <div className="space-y-4">
                    {!hasInvoicePayments ? (
                      <div className="flex items-center justify-center py-10 text-sm" style={{ color: "var(--dt-text-muted)" }}>
                        Không có hóa đơn hay đơn hàng liên quan
                      </div>
                    ) : (
                      <>
                        {mergedInvoices.length > 0 && (
                          <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--dt-border)" }}>
                            <table className="w-full">
                              <thead style={{ background: "var(--dt-bg-soft)", borderBottom: "1px solid var(--dt-border)" }}>
                                <tr>
                                  <th className="px-4 py-3 text-left text-md font-semibold dt-th w-[120px]">
                                    Hóa đơn
                                  </th>
                                  <th className="px-4 py-3 text-left text-md font-semibold dt-th w-[160px]">
                                    Thời gian
                                  </th>
                                  <th className="px-4 py-3 text-right text-md font-semibold dt-th w-[120px]">
                                    Giá trị HĐ
                                  </th>
                                  <th className="px-4 py-3 text-right text-md font-semibold dt-th w-[120px]">
                                    Đã thu trước
                                  </th>
                                  <th className="px-4 py-3 text-right text-md font-semibold dt-th w-[120px]">
                                    Giá trị
                                  </th>
                                  <th className="px-4 py-3 text-right text-md font-semibold dt-th w-[120px]">
                                    Còn cần thu
                                  </th>
                                  <th className="px-4 py-3 text-center text-md font-semibold dt-th w-[100px]">
                                    Trạng thái
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white dt-divide">
                                {mergedInvoices.map((row) => {
                                  const totalPayment = row.payments.reduce(
                                    (s: number, p: any) => s + Number(p.amount),
                                    0
                                  );
                                  const totalOffset = row.offsets.reduce(
                                    (s: number, o: any) =>
                                      s + Number(o.refundAmount),
                                    0
                                  );
                                  const hasPayments = row.payments.length > 0;
                                  const hasOffsets = row.offsets.length > 0;
                                  const paymentCodes = row.payments
                                    .map((p: any) => p.code)
                                    .join(", ");
                                  const offsetCodes = row.offsets
                                    .map((o: any) => o.code)
                                    .join(", ");

                                  // "Đã thu trước": nếu có CTN → hiện CTN amount, không → paidAmount - totalPayment
                                  const daThutruoc = hasOffsets
                                    ? totalOffset
                                    : row.paidAmount - totalPayment;

                                  return (
                                    <tr
                                      key={`merged-${row.invoiceId}`}
                                      className="dt-row">
                                      {/* Hóa đơn */}
                                      <td className="px-4 py-3">
                                        <Link
                                          className="text-md hover:underline" style={{ color: "var(--dt-primary)" }}
                                          href={`/don-hang/hoa-don?Code=${row.invoiceCode}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}>
                                          {row.invoiceCode}
                                        </Link>
                                      </td>

                                      {/* Thời gian */}
                                      <td className="px-4 py-3 text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatDateTime(row.latestDate)}
                                      </td>

                                      {/* Giá trị HĐ */}
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(row.grandTotal)}
                                      </td>

                                      {/* Đã thu trước — nếu có CTN thì hover/click hiện mã CTN */}
                                      <td className="px-4 py-3 text-right text-md">
                                        {hasOffsets ? (
                                          <div className="relative inline-block">
                                            <span
                                              className="cursor-pointer font-medium text-green-600 hover:underline decoration-dotted"
                                              title={offsetCodes}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleTooltipId(
                                                  visibleTooltipId ===
                                                    `ctn-${row.invoiceId}`
                                                    ? null
                                                    : `ctn-${row.invoiceId}`
                                                );
                                              }}>
                                              {formatCurrency(daThutruoc)}
                                            </span>
                                            {visibleTooltipId ===
                                              `ctn-${row.invoiceId}` && (
                                              <div className="absolute z-10 bottom-full right-0 mb-1 px-2.5 py-1.5 text-white text-xs rounded shadow-lg whitespace-nowrap" style={{ background: "var(--dt-primary-dark)" }}>
                                                {offsetCodes}
                                                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: "var(--dt-primary-dark)" }} />
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span style={{ color: "var(--dt-text)" }}>
                                            {formatCurrency(daThutruoc)}
                                          </span>
                                        )}
                                      </td>

                                      {/* Giá trị — nếu có TTHD thì hover/click hiện mã TTHD */}
                                      <td className="px-4 py-3 text-right text-md">
                                        {hasPayments ? (
                                          <div className="relative inline-block">
                                            <span
                                              className="cursor-pointer font-medium text-green-600 hover:underline decoration-dotted"
                                              title={paymentCodes}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setVisibleTooltipId(
                                                  visibleTooltipId ===
                                                    `ip-${row.invoiceId}`
                                                    ? null
                                                    : `ip-${row.invoiceId}`
                                                );
                                              }}>
                                              {formatCurrency(totalPayment)}
                                            </span>
                                            {visibleTooltipId ===
                                              `ip-${row.invoiceId}` && (
                                              <div className="absolute z-10 bottom-full right-0 mb-1 px-2.5 py-1.5 text-white text-xs rounded shadow-lg whitespace-nowrap" style={{ background: "var(--dt-primary-dark)" }}>
                                                {paymentCodes}
                                                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" style={{ borderTopColor: "var(--dt-primary-dark)" }} />
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <span style={{ color: "var(--dt-text-muted)" }}>
                                            -
                                          </span>
                                        )}
                                      </td>

                                      {/* Còn cần thu */}
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(row.debtAmount)}
                                      </td>

                                      {/* Trạng thái */}
                                      <td className="px-4 py-3 text-center">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            row.status === 1
                                              ? "bg-green-100 text-green-700"
                                              : "bg-yellow-100 text-yellow-700"
                                          }`}>
                                          {row.status === 1
                                            ? "Hoàn thành"
                                            : "Đang xử lý"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Bảng đơn hàng liên quan */}
                        {orderPayments.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: "var(--dt-text-secondary)" }}>
                              Đơn hàng liên quan
                            </p>
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--dt-border)" }}>
                              <table className="w-full">
                                <thead style={{ background: "var(--dt-bg-soft)", borderBottom: "1px solid var(--dt-border)" }}>
                                  <tr>
                                    <th className="px-4 py-3 text-left text-md font-semibold dt-th">
                                      Mã đơn hàng
                                    </th>
                                    <th className="px-4 py-3 text-left text-md font-semibold dt-th">
                                      Thời gian
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Giá trị ĐH
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Đã thu trước
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Giá trị thu
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Còn cần thu
                                    </th>
                                    <th className="px-4 py-3 text-center text-md font-semibold dt-th">
                                      Trạng thái
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dt-divide">
                                  {orderPayments.map((payment: any) => (
                                    <tr
                                      key={payment.id}
                                      className="dt-row">
                                      <td className="px-4 py-3">
                                        <Link
                                          className="text-md font-medium hover:underline" style={{ color: "var(--dt-primary)" }}
                                          href={`/don-hang/dat-hang?Code=${payment.order?.code}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}>
                                          {payment.order?.code}
                                        </Link>
                                      </td>
                                      <td className="px-4 py-3 text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatDateTime(payment.paymentDate)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(payment.order?.grandTotal || 0)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.order?.paidAmount || 0
                                          ) - Number(payment.amount)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md font-medium text-green-600">
                                        {formatCurrency(Number(payment.amount))}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(payment.order?.debtAmount || 0)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            payment.order?.orderStatus ===
                                            "completed"
                                              ? "bg-green-100 text-green-700"
                                              : payment.order?.orderStatus ===
                                                  "cancelled"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-700"
                                          }`}>
                                          {payment.order?.orderStatus ===
                                          "completed"
                                            ? "Hoàn thành"
                                            : payment.order?.orderStatus ===
                                                "cancelled"
                                              ? "Đã hủy"
                                              : "Đang xử lý"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Bảng phiếu nhập hàng (PN) liên quan — đối xứng
                            "Hóa đơn liên quan" của KH. */}
                        {purchaseOrderPayments.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: "var(--dt-text-secondary)" }}>
                              Phiếu nhập hàng liên quan
                            </p>
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--dt-border)" }}>
                              <table className="w-full">
                                <thead style={{ background: "var(--dt-bg-soft)", borderBottom: "1px solid var(--dt-border)" }}>
                                  <tr>
                                    <th className="px-4 py-3 text-left text-md font-semibold dt-th">
                                      Mã phiếu nhập
                                    </th>
                                    <th className="px-4 py-3 text-left text-md font-semibold dt-th">
                                      Thời gian
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Giá trị PN
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Đã trả trước
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Giá trị chi
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Còn cần trả
                                    </th>
                                    <th className="px-4 py-3 text-center text-md font-semibold dt-th">
                                      Trạng thái
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dt-divide">
                                  {purchaseOrderPayments.map((payment: any) => (
                                    <tr
                                      key={payment.id}
                                      className="dt-row">
                                      <td className="px-4 py-3">
                                        <Link
                                          className="text-md font-medium hover:underline" style={{ color: "var(--dt-primary)" }}
                                          href={`/san-pham/nhap-hang?Code=${payment.purchaseOrder?.code}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}>
                                          {payment.purchaseOrder?.code}
                                        </Link>
                                      </td>
                                      <td className="px-4 py-3 text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatDateTime(payment.paymentDate)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.purchaseOrder?.subTotal ||
                                              payment.purchaseOrder?.total ||
                                              0
                                          )
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.purchaseOrder?.paidAmount ||
                                              0
                                          ) - Number(payment.amount)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md font-medium text-red-600">
                                        {formatCurrency(Number(payment.amount))}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.purchaseOrder?.debtAmount ||
                                              0
                                          )
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            payment.purchaseOrder?.status === 1
                                              ? "bg-green-100 text-green-700"
                                              : payment.purchaseOrder
                                                    ?.status === 2
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-700"
                                          }`}>
                                          {payment.purchaseOrder?.statusValue ||
                                            (payment.purchaseOrder?.status === 1
                                              ? "Đã nhập hàng"
                                              : payment.purchaseOrder
                                                    ?.status === 2
                                                ? "Đã hủy"
                                                : "Phiếu tạm")}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Bảng phiếu đặt hàng nhập (PDN) liên quan — đối xứng
                            "Đơn hàng liên quan" của KH. */}
                        {orderSupplierPayments.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: "var(--dt-text-secondary)" }}>
                              Phiếu đặt hàng nhập liên quan
                            </p>
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--dt-border)" }}>
                              <table className="w-full">
                                <thead style={{ background: "var(--dt-bg-soft)", borderBottom: "1px solid var(--dt-border)" }}>
                                  <tr>
                                    <th className="px-4 py-3 text-left text-md font-semibold dt-th">
                                      Mã PDN
                                    </th>
                                    <th className="px-4 py-3 text-left text-md font-semibold dt-th">
                                      Thời gian
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Giá trị PDN
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Đã trả trước
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Giá trị chi
                                    </th>
                                    <th className="px-4 py-3 text-right text-md font-semibold dt-th">
                                      Còn cần trả
                                    </th>
                                    <th className="px-4 py-3 text-center text-md font-semibold dt-th">
                                      Trạng thái
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dt-divide">
                                  {orderSupplierPayments.map((payment: any) => (
                                    <tr
                                      key={payment.id}
                                      className="dt-row">
                                      <td className="px-4 py-3">
                                        <Link
                                          className="text-md font-medium hover:underline" style={{ color: "var(--dt-primary)" }}
                                          href={`/san-pham/dat-hang-nhap?Code=${payment.orderSupplier?.code}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}>
                                          {payment.orderSupplier?.code}
                                        </Link>
                                      </td>
                                      <td className="px-4 py-3 text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatDateTime(payment.paymentDate)}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.orderSupplier?.subTotal ||
                                              payment.orderSupplier?.total ||
                                              0
                                          )
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.orderSupplier?.paidAmount ||
                                              0
                                          ) - Number(payment.amount)
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md font-medium text-red-600">
                                        {formatCurrency(Number(payment.amount))}
                                      </td>
                                      <td className="px-4 py-3 text-right text-md" style={{ color: "var(--dt-text)" }}>
                                        {formatCurrency(
                                          Number(
                                            payment.orderSupplier
                                              ?.supplierDebt || 0
                                          )
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-medium ${
                                            payment.orderSupplier?.status === 3
                                              ? "bg-green-100 text-green-700"
                                              : payment.orderSupplier
                                                    ?.status === 4
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-700"
                                          }`}>
                                          {payment.orderSupplier?.statusValue ||
                                            "Chưa xác định"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Footer actions ── */}
                <div
                  className="flex items-center justify-between pt-4 mt-2 border-t"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <div className="flex gap-2">
                    {canCancel && canDeleteCashFlow && (
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
                    {!isCancelled && canUpdateCashFlow && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="dt-btn-ghost px-4 py-2 text-md font-medium rounded flex items-center gap-2">
                        <Pencil className="w-4 h-4" />
                        Chỉnh sửa
                      </button>
                    )}
                    {canPrintCashFlow && (
                      <button
                        onClick={handlePrint}
                        disabled={isPrinting || isCancelled}
                        className="dt-btn-ghost px-4 py-2 text-md font-medium rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Printer className="w-4 h-4" />
                        {isPrinting ? "Đang in..." : "In"}
                      </button>
                    )}
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
