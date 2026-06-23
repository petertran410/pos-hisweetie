"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
  useCancelPurchaseOrder,
} from "@/lib/hooks/usePurchaseOrders";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Copy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useCan } from "@/lib/hooks/useCan";
import {
  getStatusLabel,
  PURCHASE_ORDER_STATUS,
  PurchaseOrderPayment,
} from "@/lib/types/purchase-order";
import Link from "next/link";
import { CodeLink } from "../shared/CodeLink";

interface PurchaseOrderDetailRowProps {
  purchaseOrderId: number;
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

const getStatusColor = (status: number, statusValue?: string) => {
  // Ưu tiên map theo status number
  switch (status) {
    case PURCHASE_ORDER_STATUS.DRAFT:
      return "bg-gray-100 text-gray-700";
    case PURCHASE_ORDER_STATUS.COMPLETED:
      return "bg-green-100 text-green-700";
    case PURCHASE_ORDER_STATUS.CANCELLED:
      return "bg-red-100 text-red-700";
  }
  // Fallback theo statusValue string (data sync từ KiotViet)
  if (statusValue) {
    const v = statusValue.toLowerCase();
    if (v.includes("tạm")) return "bg-gray-100 text-gray-700";
    if (v.includes("hoàn") || v.includes("nhập"))
      return "bg-green-100 text-green-700";
    if (v.includes("hủy")) return "bg-red-100 text-red-700";
  }
  return "bg-gray-100 text-gray-700";
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

// Trả về label + className cho badge phân loại hàng. Pattern giống
// `getConditionLabel` trong InvoiceItemsList.tsx:173-188 nhưng chỉ hiển
// thị "Loại B" (không hiển thị "Bục rách" theo yêu cầu UX — phía nhập
// hàng dùng thuật ngữ thân thiện hơn). Hàng thường ("normal") trả về
// null → caller không render badge.
const getConditionLabel = (
  conditionType?: string
): { text: string; className: string } | null => {
  if (conditionType === "damaged") {
    return {
      text: "Loại B",
      className: "bg-red-50 text-red-600 border-red-200",
    };
  }
  return null;
};

export function PurchaseOrderDetailRow({
  purchaseOrderId,
  colSpan,
}: PurchaseOrderDetailRowProps) {
  const router = useRouter();
  const { data: purchaseOrder, isLoading } = usePurchaseOrder(purchaseOrderId);
  const { data: suppliersData } = useSuppliers({});
  const { data: users } = useUsersForFilter();
  const updatePurchaseOrder = useUpdatePurchaseOrder();
  const cancelPurchaseOrder = useCancelPurchaseOrder();

  const [activeTab, setActiveTab] = useState("info");
  const [productCodeSearch, setProductCodeSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");
  const [editedSupplierId, setEditedSupplierId] = useState<number>(0);
  const [editedPurchaseById, setEditedPurchaseById] = useState<number>(0);
  const [editedPurchaseDate, setEditedPurchaseDate] = useState<string>("");
  const [editedDescription, setEditedDescription] = useState<string>("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showPurchaseByDropdown, setShowPurchaseByDropdown] = useState(false);

  const canUpdatePO = useCan("purchase_orders", "update");
  const canViewPrice = useCan("purchase_orders", "view_price");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const purchaseByDropdownRef = useRef<HTMLDivElement>(null);

  // Sticky width: đo chiều rộng vùng cuộn rồi set cho wrapper. KHÔNG dùng
  // ResizeObserver trên scrollEl vì việc ghi width làm reflow (bật/tắt
  // scrollbar dọc) → clientWidth dao động → observer chạy lại → lắc liên tục
  // (rõ khi zoom). Lắng nghe window.resize (zoom cũng bắn) là đủ.
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
    let rafId = 0;
    const setWidth = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = `${scrollEl!.clientWidth}px`;
        if (el.style.width !== next) el.style.width = next;
      });
    };
    setWidth();
    window.addEventListener("resize", setWidth);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setWidth);
    };
  }, [purchaseOrder]);

  // Sync edited fields khi data load
  useEffect(() => {
    if (purchaseOrder) {
      setEditedSupplierId(purchaseOrder.supplierId);
      setEditedPurchaseById(purchaseOrder.purchaseById || 0);
      setEditedPurchaseDate(purchaseOrder.purchaseDate?.split("T")[0] ?? "");
      setEditedDescription(purchaseOrder.description || "");
    }
  }, [purchaseOrder?.id]);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(e.target as Node)
      )
        setShowSupplierDropdown(false);
      if (
        purchaseByDropdownRef.current &&
        !purchaseByDropdownRef.current.contains(e.target as Node)
      )
        setShowPurchaseByDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSave = async () => {
    if (!purchaseOrder) return;
    try {
      await updatePurchaseOrder.mutateAsync({
        id: purchaseOrder.id,
        data: {
          supplierId: editedSupplierId,
          purchaseById: editedPurchaseById || undefined,
          purchaseDate: editedPurchaseDate,
          description: editedDescription,
        },
      });
      toast.success("Lưu thông tin thành công");
    } catch (error: any) {
      toast.error(error.message || "Không thể lưu thông tin");
    }
  };

  const handleOpenPurchaseOrder = () => {
    router.push(`/san-pham/nhap-hang/${purchaseOrder?.id}`);
  };

  const handleCancelPurchaseOrder = async () => {
    if (!purchaseOrder) return;

    const hasPayments =
      purchaseOrder.payments &&
      purchaseOrder.payments.filter((p: any) => p.status !== 2).length > 0;

    let cancelPayments = false;
    if (hasPayments) {
      const confirmed = window.confirm(
        `Phiếu nhập hàng "${purchaseOrder.code}" có thanh toán. Bạn có muốn hủy luôn các phiếu thanh toán không?\n\n- OK: Hủy phiếu nhập + hủy thanh toán\n- Cancel: Không hủy`
      );
      if (!confirmed) return;
      cancelPayments = true;
    } else {
      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn hủy phiếu nhập hàng "${purchaseOrder.code}"?\nTồn kho sẽ được hoàn nguyên.`
      );
      if (!confirmed) return;
    }

    try {
      await cancelPurchaseOrder.mutateAsync({
        id: purchaseOrder.id,
        cancelPayments,
      });
    } catch {
      // error handled by hook
    }
  };

  const handleCopyPurchaseOrder = () => {
    if (!purchaseOrder) return;
    router.push(`/san-pham/nhap-hang/new?copyPurchaseOrderId=${purchaseOrder.id}`);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">
              Đang tải thông tin phiếu nhập hàng...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  // ── Not found ──
  if (!purchaseOrder) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin phiếu nhập hàng
        </td>
      </tr>
    );
  }

  const filteredItems = purchaseOrder.items?.filter((item: any) => {
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

  const totalQuantity =
    filteredItems?.reduce(
      (sum: number, item: any) => sum + Number(item.quantity),
      0
    ) || 0;
  const itemCount = filteredItems?.length || 0;

  const canCancel = purchaseOrder.status !== PURCHASE_ORDER_STATUS.CANCELLED;

  const TABS = [
    { value: "info", label: "Thông tin" },
    { value: "payment", label: "Lịch sử thanh toán" },
  ];

  return (
    <>
      <tr>
        <td
          colSpan={colSpan}
          className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
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
                          entity="purchase-order"
                          code={purchaseOrder.code}
                          className="text-lg font-bold text-brand hover:underline"
                        />
                      </span>
                      <span className="text-gray-400">-</span>
                      {purchaseOrder.supplier ? (
                        <>
                          <Link
                            href={`/san-pham/nha-cung-cap?id=${purchaseOrder.supplier.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-brand hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {purchaseOrder.supplier.name}
                          </Link>
                          <Link
                            href={`/san-pham/nha-cung-cap?id=${purchaseOrder.supplier.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-brand transition-colors"
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(purchaseOrder.status, purchaseOrder.statusValue)}`}>
                            {purchaseOrder.statusValue ||
                              getStatusLabel(purchaseOrder.status)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-gray-800">
                          Chưa có nhà cung cấp
                        </span>
                      )}
                      {purchaseOrder.orderSupplier && (
                        <CodeLink
                          entity="order-supplier"
                          code={purchaseOrder.orderSupplier.code}
                          label={`(${purchaseOrder.orderSupplier.code})`}
                          className="text-sm text-gray-500 hover:text-brand transition-colors"
                        />
                      )}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {purchaseOrder.branch?.name || "-"}
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
                            ? "border-brand text-brand"
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
                    <div className="grid grid-cols-3 gap-x-8 pb-2">
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Người tạo:
                        </label>
                        <span className="text-sm text-gray-900">
                          {purchaseOrder.creator?.name || "-"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Người nhập hàng:
                        </label>
                        <span className="text-sm text-gray-900">
                          {purchaseOrder.purchaseBy?.name || "-"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Ngày nhập:
                        </label>
                        <span className="text-sm text-gray-900">
                          {formatDateTime(purchaseOrder.purchaseDate)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Nhà cung cấp:
                        </label>
                        <span className="text-sm text-gray-900">
                          {purchaseOrder.supplier?.name || "-"}
                        </span>
                      </div>

                      {/* Phiếu đặt hàng nhập */}
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="text-sm text-gray-500">
                          Phiếu đặt hàng nhập:
                        </label>
                        {purchaseOrder.orderSupplier ? (
                          <CodeLink
                            entity="order-supplier"
                            code={purchaseOrder.orderSupplier.code}
                            className="text-sm text-brand hover:underline font-medium"
                          />
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </div>

                    {/* Ghi chú */}
                    <div>
                      <label className="text-sm text-gray-500 mb-1.5 block">
                        Ghi chú:
                      </label>
                      <textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        disabled={!canUpdatePO}
                        rows={2}
                        placeholder="Nhập ghi chú..."
                        className="w-full text-sm px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand disabled:bg-gray-50 disabled:text-gray-500"
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
                            className="text-xs border rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                          <input
                            type="text"
                            placeholder="Tìm tên hàng..."
                            value={productNameSearch}
                            onChange={(e) =>
                              setProductNameSearch(e.target.value)
                            }
                            className="text-xs border rounded-lg px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100 border-b border-gray-200">
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                STT
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Mã hàng
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Tên hàng
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Số lượng
                              </th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Loại
                              </th>
                              {canViewPrice && (
                                <>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Đơn giá
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Giảm giá
                                  </th>
                                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Thành tiền
                                  </th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {filteredItems?.length ? (
                              filteredItems.map((item: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2 text-center text-sm text-gray-700">
                                    {idx + 1}
                                  </td>
                                  <td className="px-3 py-2">
                                    <Link
                                      href={`/san-pham/danh-sach?Code=${item.productCode}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-brand hover:underline"
                                      onClick={(e) => e.stopPropagation()}>
                                      {item.productCode}
                                    </Link>
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-800">
                                    {item.productName}
                                  </td>
                                  <td className="px-3 py-2 text-center text-sm text-gray-700">
                                    {Number(item.quantity)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {(() => {
                                      const label = getConditionLabel(
                                        item.conditionType
                                      );
                                      if (!label) {
                                        return (
                                          <span className="text-xs text-gray-400">
                                            Tốt
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          className={`px-2 py-0.5 text-xs rounded-full border ${label.className}`}>
                                          {label.text}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  {canViewPrice && (
                                    <>
                                      <td className="px-3 py-2 text-right text-sm text-gray-700">
                                        {formatCurrency(item.price)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-sm text-gray-700">
                                        {formatCurrency(item.discount ?? 0)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                        {formatCurrency(item.totalPrice)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={canViewPrice ? 8 : 5}
                                  className="px-3 py-6 text-center text-sm text-gray-400">
                                  Không có sản phẩm
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {canViewPrice && (
                      <div className="flex justify-end">
                        <div className="w-96 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                              Tổng tiền hàng:
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(purchaseOrder.total)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Giảm giá:</span>
                            <span className="font-semibold text-red-600">
                              - {formatCurrency(purchaseOrder.discount)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-sm border-t border-gray-300 pt-3">
                            <span className="font-bold text-gray-900">
                              Tổng cộng:
                            </span>
                            <span className="font-bold text-brand">
                              {formatCurrency(purchaseOrder.totalAmount)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Đã trả NCC:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(purchaseOrder.paidAmount)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center border-t-2 border-red-200 pt-2">
                            <span className="text-base font-bold text-gray-900">
                              Cần trả NCC:
                            </span>
                            <span className="text-base font-bold text-red-600">
                              {formatCurrency(purchaseOrder.debtAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {canUpdatePO && (
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors">
                          <Save className="w-4 h-4" />
                          Lưu
                        </button>
                      )}
                      {canUpdatePO && (
                        <button
                          onClick={handleOpenPurchaseOrder}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <FileText className="w-4 h-4" />
                          Chỉnh sửa
                        </button>
                      )}
                      <button
                        onClick={handleCopyPurchaseOrder}
                        title="Sao chép phiếu nhập hàng"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép
                      </button>
                      {canUpdatePO && canCancel && (
                        <button
                          onClick={handleCancelPurchaseOrder}
                          disabled={cancelPurchaseOrder.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                          <XCircle className="w-3.5 h-3.5" />
                          Hủy phiếu
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Tab: Lịch sử thanh toán ── */}
                {activeTab === "payment" && (
                  <div>
                    {purchaseOrder.payments &&
                    purchaseOrder.payments.length > 0 ? (
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
                              {canViewPrice && (
                                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  Số tiền
                                </th>
                              )}
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                Ghi chú
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {purchaseOrder.payments.map(
                              (payment: PurchaseOrderPayment) => (
                                <tr
                                  key={payment.id}
                                  className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2 text-sm text-gray-600">
                                    {formatDateTime(payment.paymentDate)}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    {getPaymentMethodLabel(
                                      payment.paymentMethod
                                    )}
                                  </td>
                                  {canViewPrice && (
                                    <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                      {formatCurrency(payment.amount)}
                                    </td>
                                  )}
                                  <td className="px-3 py-2 text-sm text-gray-500">
                                    {payment.description || "-"}
                                  </td>
                                </tr>
                              )
                            )}
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
    </>
  );
}
