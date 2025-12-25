"use client";

import { useOrder } from "@/lib/hooks/useOrders";
import { tr } from "date-fns/locale";
import { Loader2, MapPin } from "lucide-react";

interface OrderDetailRowProps {
  orderId: number;
  colSpan: number;
}

const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN");
};

export function OrderDetailRow({ orderId, colSpan }: OrderDetailRowProps) {
  const { data: order, isLoading } = useOrder(orderId);

  const branchName = order?.branch?.name;

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

  return (
    <tr className="bg-blue-50">
      <td colSpan={colSpan} className="p-0">
        <div className="bg-blue-50 border-y-2 border-blue-200">
          <div className="sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1280px] 2xl:max-w-[1570px]">
            <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold gap-3">
                    Tên khách hàng: {order.customer?.name || ""}
                  </h3>
                  <p className="text-md">Mã đơn hàng: {order.code}</p>
                </div>
              </div>

              <div className="pr-6 pl-6 pb-6 space-y-6">
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
                      {formatDateTime(order.orderDate)}
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
                    <select
                      value={order.orderStatus}
                      className="w-full px-3 py-2 text-md border rounded bg-white font-medium">
                      <option value="pending">Phiếu tạm</option>
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="processing">Đang giao hàng</option>
                      <option value="completed">Hoàn thành</option>
                      <option value="cancelled">Hủy</option>
                    </select>
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
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md text-gray-900">
                                {formatMoney(Number(item.price))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md text-gray-900">
                                {item.discount
                                  ? formatMoney(Number(item.discount))
                                  : item.discountRati}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md font-medium text-gray-900">
                                {formatMoney(Number(item.price))}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-md font-bold text-blue-600">
                                {formatMoney(Number(item.totalPrice))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex gap-6">
                    <div className="flex-1">
                      <label className="block text-md font-medium text-gray-500 mb-2">
                        Ghi chú:
                      </label>
                      <textarea
                        className="w-full px-3 py-2 text-md border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                        placeholder="Nhập ghi chú cho đơn hàng..."
                        value={order.description || ""}
                        readOnly
                      />
                    </div>

                    <div className="w-80 bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">
                            Tổng tiền hàng ({order.items?.length || 0}):
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatMoney(Number(order.totalAmount))}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">
                            Giảm giá phiếu đặt:
                          </span>
                          <span className="font-semibold text-red-600">
                            -{formatMoney(Number(order.discount))}
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
                              {formatMoney(Number(order.grandTotal))}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Khách đã trả:</span>
                          <span className="font-semibold text-green-600">
                            {formatMoney(Number(order.paidAmount))}
                          </span>
                        </div>

                        <div className="flex justify-between items-center rounded-b-lg border-t-2 border-red-200 pt-2">
                          <span className="text-lg font-bold text-gray-900">
                            Khách cần trả:
                          </span>
                          <span className="text-lg font-bold text-red-600">
                            {formatMoney(Number(order.debtAmount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Hủy
                    </button>
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Sao chép
                    </button>
                    <button className="px-4 py-2 text-md font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">
                      Xử lý đơn hàng
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                      Lưu
                    </button>
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
