"use client";

import { usePurchaseOrder } from "@/lib/hooks/usePurchaseOrders";
import { useState } from "react";

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
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(num);
  };

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-gray-50 p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-md font-medium text-gray-500 mb-1.5">
                Mã phiếu:
              </label>
              <span className="w-full px-3 py-2 text-md border rounded bg-white block">
                {purchaseOrder.code}
              </span>
            </div>

            <div>
              <label className="block text-md font-medium text-gray-500 mb-1.5">
                Dự kiến nhập:
              </label>
              <span className="w-full px-3 py-2 text-md border rounded bg-white block">
                -
              </span>
            </div>

            <div>
              <label className="block text-md font-medium text-gray-500 mb-1.5">
                Tên NCC:
              </label>
              <span className="w-full px-3 py-2 text-md border rounded bg-gray-50 block">
                {purchaseOrder.supplier?.name || "-"}
              </span>
            </div>

            <div>
              <label className="block text-md font-medium text-gray-500 mb-1.5">
                Mã đặt hàng nhập:
              </label>
              <span className="w-full px-3 py-2 text-md border rounded bg-white block">
                {purchaseOrder.orderSupplier?.code || "-"}
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
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-md font-medium">
                      STT
                    </th>
                    <th className="px-4 py-2 text-left text-md font-medium">
                      Mã hàng
                    </th>
                    <th className="px-4 py-2 text-left text-md font-medium">
                      Tên hàng
                    </th>
                    <th className="px-4 py-2 text-right text-md font-medium">
                      Số lượng
                    </th>
                    <th className="px-4 py-2 text-right text-md font-medium">
                      Đơn giá
                    </th>
                    <th className="px-4 py-2 text-right text-md font-medium">
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredItems && filteredItems.length > 0 ? (
                    filteredItems.map((item: any, index: any) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2 text-md">{index + 1}</td>
                        <td className="px-4 py-2 text-md">
                          {item.productCode}
                        </td>
                        <td className="px-4 py-2 text-md">
                          {item.productName}
                        </td>
                        <td className="px-4 py-2 text-md text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-md text-right">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-2 text-md text-right font-medium">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500">
                        Không có sản phẩm nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-md">
                <span className="text-gray-600">Tổng tiền hàng:</span>
                <span className="font-medium">
                  {formatCurrency(purchaseOrder.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-md">
                <span className="text-gray-600">Giảm giá:</span>
                <span className="font-medium">
                  {formatCurrency(purchaseOrder.discount)}
                </span>
              </div>
              <div className="flex justify-between text-md border-t pt-2">
                <span className="text-gray-600 font-medium">Cần trả NCC:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(purchaseOrder.grandTotal)}
                </span>
              </div>
              <div className="flex justify-between text-md">
                <span className="text-gray-600">Đã trả NCC:</span>
                <span className="font-medium">
                  {formatCurrency(purchaseOrder.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-md border-t pt-2">
                <span className="text-gray-600 font-medium">Còn nợ:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(purchaseOrder.debtAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
