"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCancelOrder,
  useOrder,
  useUpdateOrder,
} from "@/lib/hooks/useOrders";
import {
  ChevronDown,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Printer,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_NUMBER_TO_STRING,
} from "@/lib/types/order";
import { formatCurrency, formatDate } from "@/lib/utils";
import { INVOICE_STATUS } from "@/lib/types/invoice";
import { useAuthStore } from "@/lib/store/auth";
import { CancelOrderModal } from "./CancelOrderModal";
import { printDeliverySlip, printEntity } from "@/lib/utils/print";
import Link from "next/link";
import { DeliveryInfoCard } from "../shared/DeliveryInfoSection";
import { useCan } from "@/lib/hooks/useCan";
import { CodeLink } from "../shared/CodeLink";
import { LineTypeBadge, PromotionLineName } from "../shared/LineTypeBadge";
import Swal from "sweetalert2";
import { findAddressFromDelivery } from "@/lib/utils/customer-address";

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

interface OrderDetailRowProps {
  orderId: number;
  colSpan: number;
}

export function OrderDetailRow({ orderId, colSpan }: OrderDetailRowProps) {
  const router = useRouter();
  const { data: order, isLoading } = useOrder(orderId);
  console.log(order);
  const updateOrder = useUpdateOrder();
  const [selectedStatus, setSelectedStatus] = useState<number>(
    ORDER_STATUS.PENDING
  );
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const cancelOrder = useCancelOrder();
  const { user } = useAuthStore();

  const hasPermCancel = useCan("orders", "cancel");
  const hasPermUpdate = useCan("orders", "update");
  const hasPermPrint = useCan("orders", "print");
  const hasPermExport = useCan("orders", "export");

  const isAdmin = user?.roles?.some(
    (role: string) => role === "Admin" || role === "Super Admin"
  );

  const wrapperRef = useRef<HTMLDivElement>(null);

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
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    update();

    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };
    // KHÔNG dùng ResizeObserver trên scrollEl: ghi width làm reflow (bật/tắt
    // scrollbar dọc) → clientWidth dao động → observer chạy lại → lắc khi zoom.
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [order]);

  const canCancelOrder =
    order?.status === ORDER_STATUS.PENDING ||
    order?.status === ORDER_STATUS.CONFIRMED ||
    order?.status === ORDER_STATUS.PARTIALLY_INVOICED ||
    (order?.status === ORDER_STATUS.COMPLETED && isAdmin);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setDescription(order.description || "");
    }
  }, [order]);

  useEffect(() => {
    if (order?.description !== undefined) {
      setDescription(order.description ?? "");
    }
  }, [order?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCancelClick = () => {
    if (!order) return;

    // Kiểm tra có hóa đơn không
    if (order.invoices && order.invoices.some((inv) => inv.status !== 2)) {
      toast.error(
        "Đơn hàng có hóa đơn. Vui lòng hủy tất cả hóa đơn trước khi hủy đơn hàng"
      );
      return;
    }

    // Hiển thị modal
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (cancelPayments: boolean) => {
    if (!order) return;

    try {
      await cancelOrder.mutateAsync({
        id: order.id,
        cancelPayments,
      });
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

      await updateOrder.mutateAsync({
        id: order.id,
        data: updateData,
      });

      toast.success("Lưu đơn hàng thành công");
    } catch (error) {
      toast.error("Không thể lưu đơn hàng");
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!order) return;
    const result = await Swal.fire({
      title: "Kết thúc đơn hàng",
      text: `Bạn có chắc chắn muốn chuyển đơn ${order.code} sang Hoàn thành?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;
    try {
      setIsSaving(true);
      await updateOrder.mutateAsync({
        id: order.id,
        data: { orderStatus: "completed" },
      });
      toast.success("Đã chuyển đơn hàng sang Hoàn thành");
    } catch {
      toast.error("Không thể kết thúc đơn hàng");
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

  const handleExportFile = () => {
    if (!order) return;
    try {
      const header = [
        "Mã hàng",
        "Tên hàng",
        "Đơn vị tính",
        "Số lượng",
        "Đơn giá",
        "Giảm giá %",
        "Giảm giá",
        "Giá bán",
        "Thành tiền",
      ];

      const itemRows = (order.items ?? []).map((item: any) => [
        item.product?.code ?? item.productCode ?? "",
        item.product?.name ?? item.productName ?? "",
        item.product?.unit ?? "",
        Number(item.quantity) || 0,
        Number(item.price) || 0,
        Number(item.discountRatio ?? 0) || 0,
        Number(item.discount ?? 0) || 0,
        Number(item.appliedPrice) || 0,
        Number(item.totalPrice) || 0,
      ]);

      // Dòng tổng kết: label ở cột áp chót (index 7), giá trị ở cột cuối (index 8).
      const blank = ["", "", "", "", "", "", ""];
      const summaryRows = [
        [...blank, `Tổng tiền hàng (${order.items?.length ?? 0})`, Number(order.totalAmount) || 0],
        [...blank, "Giảm giá đơn hàng", Number(order.discount) || 0],
        [...blank, "Phí ship", 0],
        [...blank, "Tổng cộng", Number(order.grandTotal) || 0],
        [...blank, "Khách đã trả", Number(order.paidAmount) || 0],
        [...blank, "Khách cần trả", Number(order.debtAmount) || 0],
      ];

      const aoa = [header, ...itemRows, ...summaryRows];

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [
        { wch: 12 }, // Mã hàng
        { wch: 36 }, // Tên hàng
        { wch: 12 }, // Đơn vị tính
        { wch: 10 }, // Số lượng
        { wch: 12 }, // Đơn giá
        { wch: 10 }, // Giảm giá %
        { wch: 12 }, // Giảm giá
        { wch: 14 }, // Giá bán
        { wch: 14 }, // Thành tiền
      ];

      // Number format cho các cột tiền/số lượng.
      const range = XLSX.utils.decode_range(ws["!ref"] as string);
      const moneyCols = [3, 4, 5, 6, 7, 8];
      for (let r = 1; r <= range.e.r; r++) {
        for (const c of moneyCols) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (cell && typeof cell.v === "number") cell.z = "#,##0";
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ChiTietDatHang");

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
        now.getDate()
      )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      XLSX.writeFile(wb, `ChiTietDatHang_${order.code}_${stamp}.xlsx`);
    } catch (e: any) {
      toast.error(e?.message || "Xuất file thất bại");
    }
  };

  const handleUpdateDeliveryAddress = async (
    wardName: string,
    cityName: string
  ) => {
    if (!order?.delivery) return;
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        data: {
          delivery: {
            receiver: order.delivery.receiver || "",
            contactNumber: order.delivery.contactNumber || "",
            address: order.delivery.address || "",
            locationName: cityName,
            wardName,
            noteForDriver: order.delivery.noteForDriver,
          },
        },
      });
      toast.success("Đã cập nhật địa chỉ giao hàng");
    } catch {
      toast.error("Không thể cập nhật địa chỉ");
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

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand" />
            <span className="text-gray-600">
              Đang tải thông tin đơn hàng...
            </span>
          </div>
        </td>
      </tr>
    );
  }

  if (!order) {
    return (
      <tr className="bg-red-50">
        <td colSpan={colSpan} className="px-6 py-4 text-center text-red-600">
          Không tìm thấy thông tin đơn hàng
        </td>
      </tr>
    );
  }

  const invoicedQuantities: Record<number, number> = {};
  order.invoices?.forEach((inv) => {
    if (inv.status !== INVOICE_STATUS.CANCELLED) {
      inv.details?.forEach((detail: any) => {
        invoicedQuantities[detail.productId] =
          (invoicedQuantities[detail.productId] || 0) + Number(detail.quantity);
      });
    }
  });

  const isManualEditable =
    order.status === ORDER_STATUS.PENDING ||
    order.status === ORDER_STATUS.CONFIRMED;

  const hasDeliveryInvoice =
    order.invoices?.some((inv) => inv.status === INVOICE_STATUS.LOADING) ??
    false;

  const isFinalState =
    order.status === ORDER_STATUS.COMPLETED ||
    order.status === ORDER_STATUS.CANCELLED;

  const isStatusEditable = !isFinalState && !hasDeliveryInvoice;

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
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <div className="flex border-b pb-2 items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        <CodeLink
                          entity="order"
                          code={order.code}
                          className="text-lg font-bold text-brand hover:underline"
                        />
                      </span>
                      <span className="text-gray-400">-</span>
                      {order.customer?.code ? (
                        <>
                          <Link
                            href={`/khach-hang?Code=${order.customer.code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-brand hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            {order?.customer?.name}
                          </Link>
                          <Link
                            href={`/khach-hang?Code=${order.customer.code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-brand transition-colors"
                            onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusBadgeColor(order.status)}`}>
                            {ORDER_STATUS_LABELS[
                              order.status as keyof typeof ORDER_STATUS_LABELS
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
                      {order.branch?.name || "-"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Info grid — 3 cols */}
                    <div className="grid grid-cols-3 gap-x-8 pb-4 mb-4">
                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Người tạo:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {order.creator?.name || "-"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Người nhận đặt:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {order.creator?.name || "-"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Ngày đặt:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {formatDate(order.orderDate)}
                        </span>
                      </div>

                      {/* Trạng thái — dropdown */}
                      <div className="flex items-center gap-2">
                        <label className="block text-sm text-gray-500">
                          Trạng thái:
                        </label>
                        <div className="flex-1 min-w-0">
                          {!isStatusEditable ? (
                            <div className="px-2.5 py-1.5 border border-gray-200 rounded bg-gray-50">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusBadgeColor(
                                  order.status
                                )}`}>
                                {ORDER_STATUS_LABELS[
                                  order.status as keyof typeof ORDER_STATUS_LABELS
                                ] || "Không xác định"}
                              </span>
                            </div>
                          ) : (
                            <div ref={statusDropdownRef} className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowStatusDropdown((prev) => !prev)
                                }
                                className="w-[200px] px-2 py-1 border border-gray-200 rounded bg-white text-left flex items-center justify-between hover:border-brand transition-colors">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${getOrderStatusBadgeColor(
                                    isManualEditable
                                      ? selectedStatus
                                      : order.status
                                  )}`}>
                                  {isManualEditable
                                    ? ORDER_STATUS_LABELS[
                                        selectedStatus as keyof typeof ORDER_STATUS_LABELS
                                      ]
                                    : ORDER_STATUS_LABELS[
                                        order.status as keyof typeof ORDER_STATUS_LABELS
                                      ] || "Không xác định"}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-gray-400 transition-transform ${
                                    showStatusDropdown ? "rotate-180" : ""
                                  }`}
                                />
                              </button>

                              {showStatusDropdown && (
                                <div className="absolute z-20 mt-1 w-[200px] bg-white border rounded-lg shadow-lg overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStatus(ORDER_STATUS.PENDING);
                                      setShowStatusDropdown(false);
                                    }}
                                    className={`w-[200px] py-2 text-sm text-left flex items-center gap-2 hover:bg-gray-50 transition-colors
                                    }`}>
                                    <span className="w-1 h-1 rounded-full shrink-0" />
                                    <span className="font-medium">
                                      Phiếu tạm
                                    </span>
                                    {selectedStatus ===
                                      ORDER_STATUS.PENDING && (
                                      <span className="text-brand text-xs">
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStatus(ORDER_STATUS.CONFIRMED);
                                      setShowStatusDropdown(false);
                                    }}
                                    className={`w-[200px] py-2 text-sm flex gap-2 hover:bg-gray-50 transition-colors border-t
                                    }`}>
                                    <span className="w-1 h-1 rounded-full shrink-0" />
                                    <span className="font-medium">
                                      Đã xác nhận
                                    </span>
                                    {selectedStatus ===
                                      ORDER_STATUS.CONFIRMED && (
                                      <span className="text-brand text-xs">
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Bảng giá:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {order.priceBookName || "Bảng giá chung"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 mb-2 border-b pb-1">
                        <label className="block text-sm text-gray-500">
                          Chi nhánh xử lý:
                        </label>
                        <span className="block text-sm text-gray-900">
                          {order.branch?.name || "-"}
                        </span>
                      </div>
                    </div>

                    {order.delivery && (
                      <div className="space-y-2">
                        <DeliveryInfoCard
                          delivery={order.delivery}
                          customerAddresses={order.customer?.addresses}
                          selectedAddressId={
                            findAddressFromDelivery(
                              order.customer?.addresses,
                              order.delivery
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
                              <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700  tracking-wider">
                                STT
                              </th>
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
                                Giá bán
                              </th>
                              <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700  tracking-wider">
                                Thành tiền
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {order.items?.map((item: any, index: number) => {
                              console.log(item);
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
                                    {item.product?.code || item.productCode ? (
                                      <>
                                        <Link
                                          href={`/san-pham/danh-sach?Code=${item.product?.code || item.productCode}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm font-medium text-brand hover:underline"
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
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-gray-900">
                                          {item.product?.name ||
                                            item.productName}
                                        </p>
                                        <LineTypeBadge item={item} />
                                      </div>
                                      <PromotionLineName item={item} />
                                      {item.note && (
                                        <p className="text-sm text-gray-500 mt-1 italic">
                                          {item.note}
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-[10px] py-2 text-center">
                                    <span className="text-sm font-medium text-gray-900">
                                      {item.quantity}
                                      {invoicedQuantities[item.productId] >
                                        0 && (
                                         <span className="text-brand">
                                          {" "}
                                          | {invoicedQuantities[item.productId]}
                                        </span>
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-sm text-gray-900">
                                      {formatCurrency(Number(item.price))}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-sm text-gray-900">
                                      {item.discount
                                        ? formatCurrency(Number(item.discount))
                                        : "-"}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatCurrency(
                                        Number(item.appliedPrice)
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-[10px] py-2 text-right">
                                    <span className="text-sm font-semibold text-brand">
                                      {formatCurrency(Number(item.totalPrice))}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      {/* Ghi chú đơn hàng — bên trái */}
                      <div className="flex-1">
                        <label className="block text-md font-medium text-gray-500 mb-1.5">
                          Ghi chú đơn hàng:
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
                              Tổng tiền hàng ({order.items?.length || 0}):
                            </span>
                            <span className="font-semibold text-gray-900">
                              {formatCurrency(Number(order.totalAmount))}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-md">
                            <span className="text-gray-600">
                              Giảm giá đơn hàng:
                            </span>
                            <span className="font-semibold text-red-600">
                              {(() => {
                                const total = Number(order.totalAmount);
                                const amt = Number(order.discount);
                                // Giảm giá hiệu dụng: ưu tiên số tiền, fallback sang %.
                                const effective =
                                  amt > 0
                                    ? amt
                                    : (total *
                                        Number(order.discountRatio || 0)) /
                                      100;
                                if (effective <= 0)
                                  return <>- {formatCurrency(0)}</>;
                                const stored = Number(order.discountRatio) || 0;
                                const pct =
                                  stored > 0
                                    ? stored
                                    : total > 0
                                      ? Math.round(
                                          ((effective / total) * 100 +
                                            Number.EPSILON) *
                                            100
                                        ) / 100
                                      : 0;
                                return (
                                  <>
                                    - {formatCurrency(effective)}
                                    {pct > 0 && ` (${pct}%)`}
                                  </>
                                );
                              })()}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-md">
                            <span className="text-gray-600">Phí ship:</span>
                            <span className="font-semibold text-gray-900">
                              0
                            </span>
                          </div>

                          <div className="border-t border-gray-300 pt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-md font-bold text-gray-900">
                                Tổng cộng:
                              </span>
                              <span className="text-md font-bold text-brand">
                                {formatCurrency(Number(order.grandTotal))}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                            <span className="text-gray-600">Khách đã trả:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(Number(order.paidAmount))}
                            </span>
                          </div>

                          <div className="flex justify-between items-center rounded-b-lg border-t-2 border-red-200 pt-2">
                            <span className="text-lg font-bold text-gray-900">
                              Khách cần trả:
                            </span>
                            <span className="text-lg font-bold text-red-600">
                              {formatCurrency(Number(order.debtAmount))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        {canCancelOrder && hasPermCancel && (
                          <button
                            onClick={handleCancelClick}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Hủy
                          </button>
                        )}
                        <button
                          onClick={handleCopy}
                          title="Sao chép đơn hàng sang tab mới"
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                          <Copy className="w-3.5 h-3.5" />
                          Sao chép
                        </button>
                        <button
                          onClick={handleExportFile}
                          hidden={!hasPermExport}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Xuất file
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleProcessOrder}
                          hidden={
                            !hasPermUpdate ||
                            isSaving ||
                            (order.status !== ORDER_STATUS.PENDING &&
                              order.status !==
                                ORDER_STATUS.PARTIALLY_INVOICED &&
                              order.status !== ORDER_STATUS.CONFIRMED)
                          }
                          className="px-3 py-1.5 text-sm font-medium text-white bg-brand rounded-full hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                          Xử lý đơn hàng
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          hidden={!hasPermUpdate}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSaving ? "Đang lưu..." : "Lưu"}
                        </button>
                        <button
                          onClick={handleComplete}
                          disabled={isSaving}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          hidden={!hasPermUpdate || isFinalState}>
                          Kết thúc
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
            </div>
          </div>
        </td>
      </tr>
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        hasPayments={order?.payments && order.payments.length > 0}
        orderCode={order?.code || ""}
        totalPayments={order?.payments?.length || 0}
      />
    </>
  );
}
