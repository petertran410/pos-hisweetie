"use client";

import { useOrderSupplier } from "@/lib/hooks/useOrderSuppliers";
import { formatCurrency } from "@/lib/utils";

interface OrderSupplierDetailRowProps {
  orderSupplierId: number;
  colSpan: number;
}

export function OrderSupplierDetailRow({
  orderSupplierId,
  colSpan,
}: OrderSupplierDetailRowProps) {
  const { data: orderSupplier, isLoading } = useOrderSupplier(orderSupplierId);

  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-6 bg-gray-50">
          <div className="text-center text-gray-500">Đang tải...</div>
        </td>
      </tr>
    );
  }

  if (!orderSupplier) {
    return null;
  }

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="bg-white border-t border-b p-6">
          <div className="flex gap-4 mb-4">
            <button className="px-4 py-2 border-b-2 border-blue-600 text-blue-600 font-medium">
              Thông tin
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">{orderSupplier.code}</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <p className="text-md text-gray-600 mb-1">Người tạo:</p>
                  <p className="text-md font-medium">
                    {orderSupplier.creator?.name || "-"}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-md text-gray-600 mb-1">Nhà cung cấp:</p>
                  <p className="text-md font-medium">
                    {orderSupplier.supplier?.name || "-"}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <p className="text-md text-gray-600 mb-1">Ngày đặt:</p>
                  <p className="text-md font-medium">
                    {new Date(orderSupplier.orderDate).toLocaleDateString(
                      "vi-VN"
                    )}
                  </p>
                </div>
                <div className="mb-4">
                  <p className="text-md text-gray-600 mb-1">Dự kiến nhập:</p>
                  <p className="text-md font-medium">-</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <h4 className="font-medium">Mã hàng</h4>
              <input
                type="text"
                placeholder="Tìm mã hàng"
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <h4 className="font-medium">Tên hàng</h4>
              <input
                type="text"
                placeholder="Tìm tên hàng"
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
            </div>

            <table className="w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium border">
                    Mã hàng
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium border">
                    Tên hàng
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium border">
                    Số lượng
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium border">
                    Đơn giá
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium border">
                    Giảm giá
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium border">
                    Giá nhập
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium border">
                    Thành tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderSupplier.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm border">
                      {item.productCode}
                    </td>
                    <td className="px-4 py-2 text-sm border">
                      {item.productName}
                    </td>
                    <td className="px-4 py-2 text-sm text-right border">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2 text-sm text-right border">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right border">
                      {formatCurrency(item.discount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right border">
                      {formatCurrency(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Số lượng mặt hàng:</span>
                <span className="font-medium">
                  {orderSupplier.items?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tổng số lượng:</span>
                <span className="font-medium">
                  {orderSupplier.totalQuantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tổng tiền hàng:</span>
                <span className="font-medium">
                  {formatCurrency(orderSupplier.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Giảm giá:</span>
                <span className="font-medium">
                  {formatCurrency(orderSupplier.discount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Thành tiền:</span>
                <span className="font-medium">
                  {formatCurrency(orderSupplier.subTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chi phí nhập trả NCC:</span>
                <span className="font-medium">
                  {formatCurrency(orderSupplier.exReturnSuppliers)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chi phí nhập khác:</span>
                <span className="font-medium">
                  {formatCurrency(orderSupplier.exReturnThirdParty)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Cần trả NCC:</span>
                <span className="text-blue-600">
                  {formatCurrency(orderSupplier.supplierDebt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tiền đã trả NCC:</span>
                <span className="font-medium">
                  {formatCurrency(orderSupplier.paidAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Sao chép
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Xuất file
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Gửi Email
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
