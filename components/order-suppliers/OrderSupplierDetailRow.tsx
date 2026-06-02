"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useOrderSupplier,
  useUpdateOrderSupplier,
  useOrderSupplierPayments,
  useCancelOrderSupplier,
} from "@/lib/hooks/useOrderSuppliers";
import { ExternalLink, FileText, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useCan } from "@/lib/hooks/useCan";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";
import { CancelOrderSupplierModal } from "./CancelOrderSupplierModal";

interface OrderSupplierDetailRowProps {
  orderSupplierId: number;
  colSpan: number;
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status: number) => {
  switch (status) {
    case 0:
      return "Phiếu tạm";
    case 1:
      return "Đã xác nhận NCC";
    case 2:
      return "Đã nhập một phần";
    case 3:
      return "Hoàn thành";
    case 4:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return "bg-gray-100 text-gray-700";
    case 1:
      return "bg-blue-100 text-blue-700";
    case 2:
      return "bg-yellow-100 text-yellow-700";
    case 3:
      return "bg-green-100 text-green-700";
    case 4:
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case "cash":
      return "Tiền mặt";
    case "transfer":
      return "Chuyển khoản";
    default:
      return method;
  }
};

const getPurchaseOrderStatusLabel = (status: number) => {
  switch (status) {
    case 0:
      return { label: "Phiếu tạm", cls: "bg-gray-100 text-gray-700" };
    case 1:
      return { label: "Hoàn thành", cls: "bg-green-100 text-green-700" };
    case 2:
      return { label: "Đã hủy", cls: "bg-red-100 text-red-700" };
    default:
      return { label: "Không xác định", cls: "bg-gray-100 text-gray-700" };
  }
};

export function OrderSupplierDetailRow({
  orderSupplierId,
  colSpan,
}: OrderSupplierDetailRowProps) {
  const router = useRouter();
  const { data: orderSupplier, isLoading } = useOrderSupplier(orderSupplierId);
  const updateOrderSupplier = useUpdateOrderSupplier();
  const cancelOrderSupplier = useCancelOrderSupplier();
  const { data: payments } = useOrderSupplierPayments(orderSupplierId);

  const [activeTab, setActiveTab] = useState("info");
  const [productCodeSearch, setProductCodeSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const canUpdateOS = useCan("order_suppliers", "update");
  const canCreatePO = useCan("purchase_orders", "create");

  // Sticky width — giống OrderDetailRow
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
    const update = () => {
      el.style.width = `${scrollEl!.clientWidth}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [orderSupplier]);

  // Sync notes khi data load
  useEffect(() => {
    if (orderSupplier?.description !== undefined) {
      setNotes(orderSupplier.description ?? "");
    }
  }, [orderSupplier?.id]);

  const handleCancelClick = () => {
    if (!orderSupplier) return;

    // Block khi còn PN active — đối xứng "Đơn hàng có hóa đơn" phía bán
    const hasActivePN = (orderSupplier.purchaseOrders || []).some(
      (po: any) => po.status !== 2
    );
    if (hasActivePN) {
      toast.error(
        "Phiếu đặt hàng nhập đã có phiếu nhập. Vui lòng hủy tất cả phiếu nhập trước khi hủy phiếu đặt hàng nhập"
      );
      return;
    }

    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (cancelPayments: boolean) => {
    if (!orderSupplier) return;
    try {
      await cancelOrderSupplier.mutateAsync({
        id: orderSupplierId,
        cancelPayments,
      });
    } catch (error: any) {
      // toast đã hiển thị trong hook onError
    }
  };

  const handleSave = async () => {
    if (!orderSupplier) return;
    try {
      setIsSaving(true);
      await updateOrderSupplier.mutateAsync({
        id: orderSupplierId,
        data: { description: notes },
      });
      toast.success("Lưu ghi chú thành công");
    } catch (error: any) {
      toast.error(error.message || "Không thể lưu ghi chú");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenForm = () =>
    router.push(`/san-pham/dat-hang-nhap/${orderSupplierId}`);
  const handleCreatePurchaseOrder = () =>
    router.push(`/san-pham/nhap-hang/new?orderSupplierId=${orderSupplierId}`);

  // ── Loading ──
  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu đặt hàng nhập...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  // ── Not found ──
  if (!orderSupplier) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu đặt hàng nhập
        </td>
      </tr>
    );
  }

  const filteredItems = orderSupplier.items?.filter((item: any) => {
    const matchCode = productCodeSearch
      ? item.productCode
          ?.toLowerCase()
          .includes(productCodeSearch.toLowerCase())
      : true;
    const matchName = productNameSearch
      ? item.productName
          ?.toLowerCase()
          .includes(productNameSearch.toLowerCase())
      : true;
    return matchCode && matchName;
  });

  const canCancel = orderSupplier.status === 0 || orderSupplier.status === 1;

  const receivedQuantities: Record<number, number> = {};
  orderSupplier.purchaseOrders?.forEach((po: any) => {
    po.items?.forEach((item: any) => {
      receivedQuantities[item.productId] =
        (receivedQuantities[item.productId] || 0) + Number(item.quantity);
    });
  });

  const TABS = [
    { value: "info", label: "Thông tin" },
    { value: "history", label: "Lịch sử nhập hàng" },
    { value: "payment", label: "Lịch sử thanh toán" },
  ];

  return (
    <>
      <tr>
        <td
          colSpan={colSpan}
          className="border-b-2 border-l-2 border-r-2 border-blue-500 bg-gray-50">
          <div
            ref={wrapperRef}
            className="sticky left-0 bg-gray-50"
            style={{ width: 0 }}>
            <div className="bg-white border border-gray-200 overflow-hidden">
              <div className="p-4">
                {/* ── Header ── */}
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <div className="flex border-b pb-2 items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        <CodeLink
                          entity="order-supplier"
                          code={orderSupplier.code}
                          className="text-lg font-bold text-blue-600 hover:underline"
                        />
                      </span>
                      <span className="text-gray-400">-</span>
                      {orderSupplier.supplier ? (
                        <>
                          <Link
                            href={`/san-pham/nha-cung-cap?id=${orderSupplier.supplier.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {orderSupplier.supplier.name}
                          </Link>
                          <Link
                            href={`/san-pham/nha-cung-cap?id=${orderSupplier.supplier.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(orderSupplier.status)}`}>
                            {getStatusLabel(orderSupplier.status)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-gray-800">
                          Chưa có nhà cung cấp
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {orderSupplier.branch?.name || "-"}
                    </span>
                  </div>

                  {/* ── Tabs ── */}
                  <div className="flex items-center gap-1">
                    {TABS.map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                          activeTab === tab.value
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Tab: Thông tin ── */}
                {activeTab === "info" && (
                  <div className="space-y-4">
                    {/* Info grid */}
                    <div className="grid grid-cols-3 gap-x-8 pb-4 mb-2">
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Người tạo:
                        </label>
                        <span className="text-sm text-gray-900">
                          {orderSupplier.creator?.name || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Người nhận đặt:
                        </label>
                        <span className="text-sm text-gray-900">
                          {orderSupplier.user?.name || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Ngày đặt:
                        </label>
                        <span className="text-sm text-gray-900">
                          {formatDateTime(orderSupplier.orderDate)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Ngày tạo:
                        </label>
                        <span className="text-sm text-gray-900">
                          {formatDateTime(orderSupplier.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Tổng tiền hàng:
                        </label>
                        <span className="text-sm text-gray-900 font-medium">
                          {formatCurrency(orderSupplier.total)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Cần trả NCC:
                        </label>
                        <span className="text-sm text-gray-900 font-medium">
                          {formatCurrency(orderSupplier.supplierDebt)}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-sm text-gray-500 mb-1.5 block">
                        Ghi chú:
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={!canUpdateOS}
                        rows={2}
                        placeholder="Nhập ghi chú..."
                        className="w-full text-sm px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    {/* Products table */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Danh sách sản phẩm
                          <span className="ml-2 text-gray-400 font-normal">
                            ({filteredItems?.length ?? 0} mặt hàng)
                          </span>
                        </h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Tìm mã hàng..."
                            value={productCodeSearch}
                            onChange={(e) =>
                              setProductCodeSearch(e.target.value)
                            }
                            className="text-xs border rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <input
                            type="text"
                            placeholder="Tìm tên hàng..."
                            value={productNameSearch}
                            onChange={(e) =>
                              setProductNameSearch(e.target.value)
                            }
                            className="text-xs border rounded-lg px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Mã hàng
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Tên hàng
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                SL đặt
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Đã nhập
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Đơn giá
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Giảm giá
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Thành tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {filteredItems?.length ? (
                              filteredItems.map((item: any, idx: number) => {
                                const received =
                                  receivedQuantities[item.productId] ?? 0;
                                const ordered = Number(item.quantity);
                                const isFullyReceived = received >= ordered;
                                return (
                                  <tr
                                    key={idx}
                                    className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 py-2">
                                      <Link
                                        href={`/san-pham/danh-sach?Code=${item.productCode}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-blue-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}>
                                        {item.productCode}
                                      </Link>
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-800">
                                      {item.productName}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm text-gray-700">
                                      {ordered}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <span
                                        className={`text-sm font-medium ${isFullyReceived ? "text-green-600" : received > 0 ? "text-yellow-600" : "text-gray-400"}`}>
                                        {received}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-700">
                                      {formatCurrency(item.price)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-700">
                                      {formatCurrency(item.discount ?? 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                      {formatCurrency(item.subTotal)}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-3 py-6 text-center text-sm text-gray-400">
                                  Không có sản phẩm
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {canUpdateOS && (
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          <Save className="w-4 h-4" />
                          {isSaving ? "Đang lưu..." : "Lưu ghi chú"}
                        </button>
                      )}
                      {canUpdateOS && (
                        <button
                          onClick={handleOpenForm}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <FileText className="w-4 h-4" />
                          Chỉnh sửa
                        </button>
                      )}
                      {canCreatePO &&
                        orderSupplier.status !== 3 &&
                        orderSupplier.status !== 4 && (
                          <button
                            onClick={handleCreatePurchaseOrder}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                            <FileText className="w-4 h-4" />
                            Tạo phiếu nhập hàng
                          </button>
                        )}
                      {canUpdateOS && canCancel && (
                        <button
                          onClick={handleCancelClick}
                          disabled={isSaving || cancelOrderSupplier.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                          Hủy phiếu
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Tab: Lịch sử nhập hàng ── */}
                {activeTab === "history" && (
                  <div>
                    {orderSupplier.purchaseOrders?.length ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Mã phiếu
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Thời gian
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Người tạo
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Tổng tiền
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Trạng thái
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {orderSupplier.purchaseOrders.map((po: any) => {
                              const st = getPurchaseOrderStatusLabel(
                                po.status ?? 1
                              );
                              return (
                                <tr
                                  key={po.id}
                                  className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2">
                                    <Link
                                      href={`/san-pham/nhap-hang?Code=${po.code}`}
                                      className="text-sm font-medium text-blue-600 hover:underline"
                                      onClick={(e) => e.stopPropagation()}>
                                      {po.code}
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-600">
                                    {formatDateTime(po.purchaseDate)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-600">
                                    {po.creator?.name ||
                                      po.createdByName ||
                                      "-"}
                                  </td>
                                  <td className="px-3 py-2 text-right text-sm text-gray-700">
                                    {formatCurrency(po.total ?? 0)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                                      {st.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-400 py-8">
                        Chưa có lịch sử nhập hàng
                      </p>
                    )}
                  </div>
                )}

                {/* ── Tab: Lịch sử thanh toán ── */}
                {activeTab === "payment" && (
                  <div>
                    {payments && payments.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Thời gian
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Phương thức
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Số tiền
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Ghi chú
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {payments.map((payment: any) => (
                              <tr
                                key={payment.id}
                                className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2 text-sm text-gray-600">
                                  {formatDateTime(
                                    payment.paymentDate || payment.createdAt
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-700">
                                  {getPaymentMethodLabel(payment.method)}
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(payment.amount)}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                  {payment.note || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                     ) : (
                      <p className="text-center text-sm text-gray-400 py-8">
                        Chưa có lịch sử thanh toán
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>

      <CancelOrderSupplierModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        hasPayments={(orderSupplier?.payments || []).some(
          (p: any) => p.status !== 2
        )}
        orderSupplierCode={orderSupplier?.code || ""}
        totalPayments={
          (orderSupplier?.payments || []).filter((p: any) => p.status !== 2)
            .length
        }
      />
    </>
  );
}
