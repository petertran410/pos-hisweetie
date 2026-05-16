"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/lib/hooks/usePurchaseOrders";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Save,
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

const getStatusColor = (status: number) => {
  switch (status) {
    case PURCHASE_ORDER_STATUS.DRAFT:
      return "bg-gray-100 text-gray-700";
    case PURCHASE_ORDER_STATUS.COMPLETED:
      return "bg-green-100 text-green-700";
    case PURCHASE_ORDER_STATUS.CANCELLED:
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

export function PurchaseOrderDetailRow({
  purchaseOrderId,
  colSpan,
}: PurchaseOrderDetailRowProps) {
  const router = useRouter();
  const { data: purchaseOrder, isLoading } = usePurchaseOrder(purchaseOrderId);
  const { data: suppliersData } = useSuppliers({});
  const { data: users } = useUsersForFilter();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

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

  // Sticky width — giống OrderSupplierDetailRow
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
    if (!window.confirm("Bạn có chắc chắn muốn hủy phiếu nhập hàng này?"))
      return;
    try {
      await updatePurchaseOrder.mutateAsync({
        id: purchaseOrder.id,
        data: {
          supplierId: purchaseOrder.supplierId,
          items: purchaseOrder.items?.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0,
            description: item.description,
          })),
          isDraft: false,
          purchaseDate: purchaseOrder.purchaseDate,
        },
      });
      await updatePurchaseOrder.mutateAsync({
        id: purchaseOrder.id,
        data: { status: 2 },
      });
      toast.success("Đã hủy phiếu nhập hàng");
    } catch (error: any) {
      toast.error(error.message || "Không thể hủy phiếu nhập hàng");
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
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

  const selectedSupplier = suppliersData?.data?.find(
    (s: any) => s.id === editedSupplierId
  );
  const selectedUser = users?.find((u: any) => u.id === editedPurchaseById);

  const canCancel = purchaseOrder.status === PURCHASE_ORDER_STATUS.DRAFT;

  const TABS = [
    { value: "info", label: "Thông tin" },
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
                        {purchaseOrder.code}
                      </span>
                      <span className="text-gray-400">-</span>
                      {purchaseOrder.supplier ? (
                        <>
                          <Link
                            href={`/san-pham/nha-cung-cap?id=${purchaseOrder.supplier.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {purchaseOrder.supplier.name}
                          </Link>
                          <Link
                            href={`/san-pham/nha-cung-cap?id=${purchaseOrder.supplier.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(purchaseOrder.status)}`}>
                            {getStatusLabel(purchaseOrder.status)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-gray-800">
                          Chưa có nhà cung cấp
                        </span>
                      )}
                      {purchaseOrder.orderSupplier && (
                        <Link
                          href={`/san-pham/dat-hang-nhap/${purchaseOrder.orderSupplier.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}>
                          ({purchaseOrder.orderSupplier.code})
                        </Link>
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
                          <Link
                            href={`/san-pham/dat-hang-nhap/${purchaseOrder.orderSupplier.code}`}
                            className="text-sm text-blue-600 hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}>
                            {purchaseOrder.orderSupplier.code}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>

                      {canViewPrice && (
                        <>
                          <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                            <label className="text-sm text-gray-500">
                              Tổng tiền hàng:
                            </label>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(purchaseOrder.totalAmount)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                            <label className="text-sm text-gray-500">
                              Cần trả NCC:
                            </label>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(purchaseOrder.debtAmount)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                            <label className="text-sm text-gray-500">
                              Đã trả NCC:
                            </label>
                            <span className="text-sm font-medium text-gray-900">
                              {formatCurrency(purchaseOrder.paidAmount)}
                            </span>
                          </div>
                        </>
                      )}
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
                                Số lượng
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
                                    {Number(item.quantity)}
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
                                  colSpan={canViewPrice ? 6 : 3}
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
                      {canUpdatePO && (
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
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
                      {canUpdatePO && canCancel && (
                        <button
                          onClick={handleCancelPurchaseOrder}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
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
