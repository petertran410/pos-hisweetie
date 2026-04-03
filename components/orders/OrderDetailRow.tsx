"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrder, useUpdateOrder } from "@/lib/hooks/useOrders";
import { ChevronDown, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_NUMBER_TO_STRING,
} from "@/lib/types/order";
import { formatCurrency, formatDate } from "@/lib/utils";

const getOrderStatusBadgeColor = (status: number) => {
  switch (status) {
    case ORDER_STATUS.PENDING:
      return "bg-yellow-100 text-yellow-700";
    case ORDER_STATUS.CONFIRMED:
      return "bg-teal-100 text-teal-700";
    case ORDER_STATUS.PARTIALLY_INVOICED:
      return "bg-teal-100 text-teal-700";
    case ORDER_STATUS.PROCESSING:
      return "bg-blue-100 text-blue-700";
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
  const updateOrder = useUpdateOrder();
  const [selectedStatus, setSelectedStatus] = useState<number>(
    ORDER_STATUS.PENDING
  );
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status);
      setDescription(order.description || "");
    }
  }, [order]);

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

  const handleCancel = async () => {
    if (!order) return;

    if (order.invoices && order.invoices.some((inv) => inv.status !== 2)) {
      toast.error(
        "Đơn hàng có hóa đơn, vui lòng hủy hóa đơn trước khi hủy đơn hàng"
      );
      return;
    }

    if (confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) {
      try {
        setIsSaving(true);
        await updateOrder.mutateAsync({
          id: order.id,
          data: { orderStatus: "cancelled" },
        });
        toast.success("Đã hủy đơn hàng thành công");
      } catch (error) {
        toast.error("Không thể hủy đơn hàng");
      } finally {
        setIsSaving(false);
      }
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

  const handleProcessOrder = () => {
    if (!order) return;
    router.push(`/ban-hang?orderId=${order.id}`);
  };

  if (isLoading) {
    return (
      <tr className="bg-blue-50">
        <td colSpan={colSpan} className="px-6 py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
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
    if (inv.status !== 5) {
      inv.details?.forEach((detail: any) => {
        invoicedQuantities[detail.productId] =
          (invoicedQuantities[detail.productId] || 0) + Number(detail.quantity);
      });
    }
  });

  const isManualEditable =
    order.status === ORDER_STATUS.PENDING ||
    order.status === ORDER_STATUS.CONFIRMED;

  const isStatusEditable = order.status !== ORDER_STATUS.PROCESSING;

  return (
    <tr>
      <td colSpan={colSpan} className="py-2 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1540px]">
          <div className="p-6">
            <div className="border-b border-gray-200 pb-4 mb-6 ">
              <div className="flex items-center mb-3 content-center gap-2 text-xl">
                <p className="font-bold">{order.code}</p>
                {"-"}
                <h3 className="">{order.customer?.name || "Khách vãng lai"}</h3>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-6">
                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người tạo:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {order.creator?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Người nhận đặt:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      {order.creator?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ngày đặt:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                      {formatDate(order.orderDate)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Chi nhánh xử lý:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      {order.branch?.name || "-"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Bảng giá:
                    </label>
                    <span className="w-full px-3 py-2 text-md border rounded bg-white">
                      Bảng giá chung
                    </span>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Trạng thái:
                    </label>
                    {!isStatusEditable ? (
                      <div className="w-full px-3 py-2 border rounded bg-gray-50">
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${getOrderStatusBadgeColor(
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
                          onClick={() => setShowStatusDropdown((prev) => !prev)}
                          className="w-full px-3 py-2 border rounded bg-white text-left flex items-center justify-between hover:border-blue-400 transition-colors">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${getOrderStatusBadgeColor(
                              isManualEditable ? selectedStatus : order.status
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
                          <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStatus(ORDER_STATUS.PENDING);
                                setShowStatusDropdown(false);
                              }}
                              className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                                selectedStatus === ORDER_STATUS.PENDING
                                  ? "bg-yellow-50"
                                  : ""
                              }`}>
                              <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                              <span className="font-medium">Phiếu tạm</span>
                              {selectedStatus === ORDER_STATUS.PENDING && (
                                <span className="ml-auto text-blue-500 text-xs">
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
                              className={`w-full px-4 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-gray-50 transition-colors border-t ${
                                selectedStatus === ORDER_STATUS.CONFIRMED
                                  ? "bg-teal-50"
                                  : ""
                              }`}>
                              <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                              <span className="font-medium">Đã xác nhận</span>
                              {selectedStatus === ORDER_STATUS.CONFIRMED && (
                                <span className="ml-auto text-blue-500 text-xs">
                                  ✓
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-4">
                    <label className="block text-md font-medium text-gray-500 mb-1.5">
                      Ghi chú:
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      // disabled={!isManualEditable}
                      className={`w-full px-3 py-2 text-md border rounded resize-none ${
                        isManualEditable ? "bg-white" : "bg-gray-50"
                      }`}
                      rows={2}
                      placeholder="Nhập ghi chú đơn hàng"
                    />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <label className="block text-md font-medium text-gray-700 mb-1">
                        Tự giao đến:
                      </label>
                      <p className="text-md text-gray-900 font-medium">
                        {order.delivery?.address ||
                          order.customer?.address ||
                          "-"}
                      </p>
                      <p className="text-md text-gray-600 mt-1">
                        {[
                          order.delivery?.wardName || order.customer?.wardName,
                          order.delivery?.locationName ||
                            order.customer?.cityName,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-700">
                      Danh sách sản phẩm
                    </h4>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="px-4 py-3 text-left text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Mã hàng
                          </th>
                          <th className="px-4 py-3 text-left text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Tên hàng
                          </th>
                          <th className="px-4 py-3 text-center text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Số lượng
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Đơn giá
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Giảm giá
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Giá bán
                          </th>
                          <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                            Thành tiền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {order.items?.map((item: any, index: number) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-md font-medium text-blue-600">
                                {item.product?.code || item.productCode}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-md font-medium text-gray-900">
                                  {item.product?.name || item.productName}
                                </p>
                                {item.note && (
                                  <p className="text-md text-gray-500 mt-1 italic">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-md font-medium text-gray-900">
                                {item.quantity}
                                {invoicedQuantities[item.productId] > 0 && (
                                  <span className="text-blue-600">
                                    {" "}
                                    | {invoicedQuantities[item.productId]}
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md text-gray-900">
                                {formatCurrency(Number(item.price))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md text-gray-900">
                                {item.discount
                                  ? formatCurrency(Number(item.discount))
                                  : "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md font-medium text-gray-900">
                                {formatCurrency(Number(item.appliedPrice))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md font-semibold text-blue-600">
                                {formatCurrency(Number(item.totalPrice))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-6">
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
                          -{" "}
                          {formatCurrency(
                            Number(order.discount) +
                              (Number(order.totalAmount) *
                                Number(order.discountRatio || 0)) /
                                100
                          )}
                          {Number(order.discountRatio) > 0 &&
                            ` (${order.discountRatio}%)`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-md">
                        <span className="text-gray-600">Phí ship:</span>
                        <span className="font-semibold text-gray-900">0</span>
                      </div>

                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-md font-bold text-gray-900">
                            Tổng cộng:
                          </span>
                          <span className="text-md font-bold text-blue-600">
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
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? "Đang lưu..." : "Lưu"}
                    </button>
                    <button
                      onClick={handleProcessOrder}
                      hidden={isSaving || order.status !== ORDER_STATUS.PENDING}
                      className="px-4 py-2 text-md font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      Xử lý đơn hàng
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Kết thúc
                    </button>
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      In
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
