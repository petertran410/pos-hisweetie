"use client";

import {
  usePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/lib/hooks/usePurchaseOrders";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsers } from "@/lib/hooks/useUsers";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PurchaseOrderDetailRowProps {
  purchaseOrderId: number;
  colSpan: number;
}

export function PurchaseOrderDetailRow({
  purchaseOrderId,
  colSpan,
}: PurchaseOrderDetailRowProps) {
  const router = useRouter();
  const { data: purchaseOrder, isLoading } = usePurchaseOrder(purchaseOrderId);
  const { data: suppliersData } = useSuppliers({});
  const { data: users } = useUsers();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  const [productCodeSearch, setProductCodeSearch] = useState("");
  const [productNameSearch, setProductNameSearch] = useState("");
  const [editedSupplierId, setEditedSupplierId] = useState<number>(0);
  const [editedPurchaseById, setEditedPurchaseById] = useState<number>(0);
  const [editedPurchaseDate, setEditedPurchaseDate] = useState<string>("");
  const [editedDescription, setEditedDescription] = useState<string>("");

  useState(() => {
    if (purchaseOrder) {
      setEditedSupplierId(purchaseOrder.supplierId);
      setEditedPurchaseById(purchaseOrder.purchaseById || 0);
      setEditedPurchaseDate(purchaseOrder.purchaseDate);
      setEditedDescription(purchaseOrder.description || "");
    }
  });

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

  const handleOpenPurchaseOrder = () => {
    router.push(`/san-pham/nhap-hang/${purchaseOrder.id}`);
  };

  const handleCancelPurchaseOrder = async () => {
    if (window.confirm("Bạn có chắc chắn muốn hủy phiếu nhập hàng này?")) {
      try {
        await updatePurchaseOrder.mutateAsync({
          id: purchaseOrder.id,
          data: {
            supplierId: purchaseOrder.supplierId,
            items: purchaseOrder.items?.map(
              (item: {
                productId: any;
                quantity: any;
                price: any;
                discount: any;
                description: any;
              }) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
                description: item.description,
              })
            ),
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
    }
  };

  const handleSave = async () => {
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
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-bold">{purchaseOrder.code}</span>
                <span
                  className={`px-3 py-1 text-sm rounded ${
                    purchaseOrder.status === 0
                      ? "bg-orange-100 text-orange-600"
                      : purchaseOrder.status === 1
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                  {purchaseOrder.status === 0
                    ? "Phiếu tạm"
                    : purchaseOrder.status === 1
                    ? "Đã nhập hàng"
                    : "Đã hủy"}
                </span>
                <span className="text-sm text-gray-500 ml-auto">
                  {purchaseOrder.branch?.name || "-"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">
                    Người tạo:
                  </label>
                  <input
                    type="text"
                    value={purchaseOrder.creator?.name || "admin"}
                    disabled
                    className="w-full px-3 py-2 text-sm border rounded bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">
                    Người nhập:
                  </label>
                  <select
                    value={editedPurchaseById}
                    onChange={(e) =>
                      setEditedPurchaseById(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm border rounded bg-white">
                    <option value={0}>Chọn người nhập</option>
                    {users?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">
                    Ngày nhập:
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editedPurchaseDate
                        ? new Date(editedPurchaseDate)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    onChange={(e) => setEditedPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-500 mb-1.5">
                    Tên NCC:
                  </label>
                  <select
                    value={editedSupplierId}
                    onChange={(e) =>
                      setEditedSupplierId(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm border rounded bg-white">
                    <option value={0}>Chọn nhà cung cấp</option>
                    {suppliersData?.data?.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full">
                <div className="grid grid-cols-2 gap-4 mb-3 mt-3 ml-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Tìm mã hàng"
                      value={productCodeSearch}
                      onChange={(e) => setProductCodeSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Tìm tên hàng"
                      value={productNameSearch}
                      onChange={(e) => setProductNameSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
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
                      <tr key={item.id} className="border-b border-t">
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
                        className="px-4 py-8 text-center text-gray-500 text-sm">
                        Không có sản phẩm nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mb-6">
              <div className="w-80 border rounded-lg p-4 bg-gray-50">
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
                    <span className="text-gray-600">Giảm giá</span>
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
              <label className="block text-sm text-gray-500 mb-1.5">
                Ghi chú:
              </label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Nhập ghi chú"
              />
            </div>

            <div className="flex items-center gap-3">
              {purchaseOrder.status !== 2 && (
                <button
                  onClick={handleCancelPurchaseOrder}
                  className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                  Hủy
                </button>
              )}
              <button
                onClick={handleOpenPurchaseOrder}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                Mở phiếu
              </button>
              {purchaseOrder.status !== 2 && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                  Lưu
                </button>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
