"use client";

import { useState } from "react";
import { useOrderSupplier } from "@/lib/hooks/useOrderSuppliers";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

interface OrderSupplierDetailRowProps {
  orderSupplierId: number;
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

const getStatusLabel = (status: number) => {
  switch (status) {
    case 0:
      return "Phiếu tạm";
    case 1:
      return "Đã đặt hàng";
    case 2:
      return "Đã nhập một phần";
    case 3:
      return "Đã nhập hàng";
    case 4:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 0:
      return "bg-gray-100 text-gray-800";
    case 1:
      return "bg-blue-100 text-blue-800";
    case 2:
      return "bg-yellow-100 text-yellow-800";
    case 3:
      return "bg-green-100 text-green-800";
    case 4:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function OrderSupplierDetailRow({
  orderSupplierId,
  colSpan,
}: OrderSupplierDetailRowProps) {
  const { data: orderSupplier, isLoading } = useOrderSupplier(orderSupplierId);
  const [activeTab, setActiveTab] = useState("info");
  const [productCodeSearch, setProductCodeSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-6 bg-gray-50">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">Đang tải...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!orderSupplier) {
    return null;
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

  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-6 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
          <div className="p-6">
            <div className="flex gap-4 mb-4 border-b">
              <button
                onClick={() => setActiveTab("info")}
                className={`px-4 py-2 text-md font-medium ${
                  activeTab === "info"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}>
                Thông tin
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 text-md font-medium ${
                  activeTab === "history"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}>
                Lịch sử nhập hàng
              </button>
              <button
                onClick={() => setActiveTab("payment")}
                className={`px-4 py-2 text-md font-medium ${
                  activeTab === "payment"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600"
                }`}>
                Lịch sử thanh toán
              </button>
            </div>

            {activeTab === "info" && (
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold">{orderSupplier.code}</p>
                    <span
                      className={`px-3 py-1 rounded text-md font-medium ${getStatusColor(
                        orderSupplier.status
                      )}`}>
                      {getStatusLabel(orderSupplier.status)}
                    </span>
                  </div>
                  <span className="text-md text-gray-600">
                    {orderSupplier.branch?.name || "-"}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Người tạo:
                      </label>
                      <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                        {orderSupplier.creator?.name || "-"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Người đặt:
                      </label>
                      <span className="w-full px-3 py-2 text-md border rounded bg-white">
                        {orderSupplier.creator?.name || "-"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Ngày đặt:
                      </label>
                      <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                        {formatDateTime(orderSupplier.orderDate)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Dự kiến nhập:
                      </label>
                      <span className="w-full px-3 py-2 text-md border rounded bg-white">
                        -
                      </span>
                    </div>

                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Tên NCC:
                      </label>
                      <span className="w-full px-3 py-2 text-md border rounded bg-gray-50">
                        {orderSupplier.supplier?.name || "-"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-md font-medium text-gray-500 mb-1.5">
                        Mã nhập hàng:
                      </label>
                      <span className="w-full px-3 py-2 text-md border rounded bg-white">
                        {orderSupplier.purchaseOrderCodes
                          ? `${orderSupplier.purchaseOrderCodes.length} mã. Xem chi tiết`
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex-1">
                        <label className="block text-md font-medium text-gray-700 mb-1.5">
                          Mã hàng
                        </label>
                        <input
                          type="text"
                          placeholder="Tìm mã hàng"
                          value={productCodeSearch}
                          onChange={(e) => setProductCodeSearch(e.target.value)}
                          className="w-full border rounded px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-md font-medium text-gray-700 mb-1.5">
                          Tên hàng
                        </label>
                        <input
                          type="text"
                          placeholder="Tìm tên hàng"
                          value={productNameSearch}
                          onChange={(e) => setProductNameSearch(e.target.value)}
                          className="w-full border rounded px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
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
                              Giá nhập
                            </th>
                            <th className="px-4 py-3 text-right text-md font-semibold text-gray-700 uppercase tracking-wider">
                              Thành tiền
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredItems?.map((item: any, index: number) => (
                            <tr
                              key={index}
                              className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="text-md font-medium text-blue-600">
                                  {item.productCode}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="text-md font-medium text-gray-900">
                                    {item.productName}
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
                                    : "-"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-md font-medium text-gray-900">
                                  {formatMoney(Number(item.price))}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-md font-semibold text-blue-600">
                                  {formatMoney(
                                    Number(item.quantity) * Number(item.price) -
                                      Number(item.discount || 0)
                                  )}
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
                            Số lượng mặt hàng:
                          </span>
                          <span className="font-semibold text-gray-900">
                            {orderSupplier.items?.length || 0}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">
                            Tổng tiền hàng ({orderSupplier.totalQuantity || 0}
                            ):
                          </span>
                          <span className="font-semibold text-gray-900">
                            {formatMoney(Number(orderSupplier.total))}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-md">
                          <span className="text-gray-600">Giảm giá:</span>
                          <span className="font-semibold text-red-600">
                            {formatMoney(Number(orderSupplier.discount))}
                          </span>
                        </div>

                        <div className="border-t border-gray-300 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-md font-bold text-gray-900">
                              Cần trả NCC:
                            </span>
                            <span className="text-md font-bold text-blue-600">
                              {formatMoney(Number(orderSupplier.supplierDebt))}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-md pt-2 border-t border-gray-200">
                          <span className="text-gray-600">
                            Tiền đã trả NCC:
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatMoney(Number(orderSupplier.paidAmount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-md font-medium text-gray-500 mb-2">
                      Ghi chú:
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-md text-gray-900">
                        {orderSupplier.description || "Chưa có ghi chú"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.info("Sao chép")}
                        className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                        Sao chép
                      </button>
                      <button
                        onClick={() => toast.info("Xuất file")}
                        className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                        Xuất file
                      </button>
                      <button
                        onClick={() => toast.info("Gửi Email")}
                        className="px-4 py-2 text-md font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                        Gửi Email
                      </button>
                    </div>
                    <button className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="py-6">
                <p className="text-center text-gray-500">
                  Chưa có lịch sử nhập hàng
                </p>
              </div>
            )}

            {activeTab === "payment" && (
              <div className="py-6">
                <p className="text-center text-gray-500">
                  Chưa có lịch sử thanh toán
                </p>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
