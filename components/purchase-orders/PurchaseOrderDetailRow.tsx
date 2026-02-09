"use client";

import { usePurchaseOrder } from "@/lib/hooks/usePurchaseOrders";
import { useState } from "react";
import { Calendar, MoreHorizontal } from "lucide-react";

interface PurchaseOrderDetailRowProps {
  purchaseOrderId: number;
  colSpan: number;
}

export function PurchaseOrderDetailRow({
  purchaseOrderId,
  colSpan,
}: PurchaseOrderDetailRowProps) {
  const { data: purchaseOrder, isLoading } = usePurchaseOrder(purchaseOrderId);
  const [productCodeSearch, setProductCodeSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <div className="text-center text-gray-500">Đang tải...</div>
        </td>
      </tr>
    );
  }

  if (!purchaseOrder) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <div className="text-center text-red-500">
            Không tìm thấy phiếu nhập hàng
          </div>
        </td>
      </tr>
    );
  }

  const filteredItems = purchaseOrder.items?.filter((item: any) => {
    const matchCode = productCodeSearch
      ? item.productCode.toLowerCase().includes(productCodeSearch.toLowerCase())
      : true;
    const matchName = productNameSearch
      ? item.productName.toLowerCase().includes(productNameSearch.toLowerCase())
      : true;
    return matchCode && matchName;
  });

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("vi-VN").format(num);
  };

  const getStatusBadge = (status: number) => {
    if (status === 0) {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm rounded">
          Phiếu tạm
        </span>
      );
    } else if (status === 1) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-600 text-sm rounded">
          Đã nhập hàng
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded">
          Đã hủy
        </span>
      );
    }
  };

  const totalQuantity =
    filteredItems?.reduce(
      (sum: number, item: any) => sum + Number(item.quantity),
      0
    ) || 0;

  const itemCount = filteredItems?.length || 0;

  return (
    <tr>
      <td colSpan={colSpan} className="py-2 bg-gray-50">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sm:max-w-[640px] md:max-w-[768px] lg:max-w-[830px] xl:max-w-[1090px] 2xl:max-w-[1520px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold">{purchaseOrder.code}</h3>
                {getStatusBadge(purchaseOrder.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{purchaseOrder.branch?.name || "-"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Người tạo:
                </label>
                <input
                  type="text"
                  value={purchaseOrder.creator?.name || "admin"}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Người nhập:
                </label>
                <select className="w-full px-3 py-2 border rounded bg-white">
                  <option>{purchaseOrder.purchaseBy?.name || "admin"}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ngày nhập:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={new Date(purchaseOrder.purchaseDate).toLocaleString(
                      "vi-VN"
                    )}
                    className="w-full px-3 py-2 border rounded bg-white pr-10"
                  />
                  <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên NCC:
                </label>
                <input
                  type="text"
                  value={purchaseOrder.supplier?.name || "Chưa có"}
                  disabled
                  className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <input
                  type="text"
                  placeholder="Tìm mã hàng"
                  value={productCodeSearch}
                  onChange={(e) => setProductCodeSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Tìm tên hàng"
                  value={productNameSearch}
                  onChange={(e) => setProductNameSearch(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-6 mb-6">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Mã hàng
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Tên hàng
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Số lượng
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Đơn giá
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Giảm giá
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Giá nhập
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredItems && filteredItems.length > 0 ? (
                      filteredItems.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-3 text-sm">
                            {item.productCode}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(item.discount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500">
                          Không có sản phẩm nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50 h-fit">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Số lượng mặt hàng</span>
                    <span className="font-medium">{itemCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Tổng tiền hàng ({totalQuantity})
                    </span>
                    <span className="font-medium">
                      {formatCurrency(purchaseOrder.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      Giảm giá
                      <span className="text-xs text-gray-400">ⓘ</span>
                    </span>
                    <span className="font-medium">
                      {formatCurrency(purchaseOrder.discount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t">
                    <span className="text-gray-700 font-medium">
                      Cần trả NCC
                    </span>
                    <span className="font-bold">
                      {formatCurrency(purchaseOrder.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tiền đã trả NCC</span>
                    <span className="font-medium">
                      {formatCurrency(purchaseOrder.paidAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <textarea
                placeholder="Ghi chú"
                value={purchaseOrder.description || ""}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                Hủy
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                Sao chép
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                Xuất file
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                Gửi Email
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Mở phiếu
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                Lưu
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                In tem mã
              </button>
              <button className="px-4 py-2 border rounded hover:bg-gray-50">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
