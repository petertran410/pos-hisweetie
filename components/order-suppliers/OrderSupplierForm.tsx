"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Search, Plus, Minus } from "lucide-react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateOrderSupplier,
  useUpdateOrderSupplier,
} from "@/lib/hooks/useOrderSuppliers";
import { toast } from "sonner";
import type { OrderSupplier } from "@/lib/types/order-supplier";
import { formatCurrency } from "@/lib/utils";
import { useBranchStore } from "@/lib/store/branch";

interface ProductItem {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  subTotal: number;
  inventory: number;
  note?: string;
}

interface OrderSupplierFormProps {
  orderSupplier?: OrderSupplier | null;
  onClose?: () => void;
}

const getProductCost = (product: any, branchId: number): number => {
  const inventory = product.inventories?.find(
    (inv: any) => inv.branchId === branchId
  );
  return inventory ? Number(inventory.cost) : 0;
};

export function OrderSupplierForm({
  orderSupplier,
  onClose,
}: OrderSupplierFormProps) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({});
  const createOrderSupplier = useCreateOrderSupplier();
  const updateOrderSupplier = useUpdateOrderSupplier();

  const [branchId, setBranchId] = useState<number>(
    orderSupplier?.branchId || selectedBranch?.id || 0
  );
  const [supplierId, setSupplierId] = useState<number>(
    orderSupplier?.supplierId || 0
  );
  const [status, setStatus] = useState<number>(orderSupplier?.status || 0);
  const [note, setNote] = useState<string>(orderSupplier?.description || "");
  const [products, setProducts] = useState<ProductItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 20,
  });

  const isFormDisabled = orderSupplier && orderSupplier.status !== 0;

  useEffect(() => {
    if (orderSupplier?.items) {
      const loadedProducts: ProductItem[] = orderSupplier.items.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount),
        subTotal: Number(item.subTotal),
        inventory: 0,
        note: item.description,
      }));
      setProducts(loadedProducts);
    }
  }, [orderSupplier]);

  const handleAddProduct = (product: any) => {
    if (isFormDisabled) return;

    const existingProduct = products.find((p) => p.productId === product.id);
    if (existingProduct) {
      toast.error("Sản phẩm đã có trong danh sách");
      return;
    }

    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === branchId
    );

    const cost = inventory ? Number(inventory.cost) : 0;

    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: 1,
      price: cost,
      discount: 0,
      subTotal: cost,
      inventory: Number(inventory?.onHand || 0),
    };

    setProducts((prev) => [...prev, newProduct]);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleRemoveProduct = (index: number) => {
    if (isFormDisabled) return;
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: string) => {
    if (isFormDisabled) return;
    const quantity = parseFloat(value) || 0;

    if (quantity < 0) {
      toast.error("Số lượng không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].quantity = quantity;
      updated[index].subTotal =
        quantity * updated[index].price - updated[index].discount;
      return updated;
    });
  };

  const handlePriceChange = (index: number, value: string) => {
    if (isFormDisabled) return;
    const price = parseFloat(value) || 0;

    if (price < 0) {
      toast.error("Giá không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].price = price;
      updated[index].subTotal =
        updated[index].quantity * price - updated[index].discount;
      return updated;
    });
  };

  const handleDiscountChange = (index: number, value: string) => {
    if (isFormDisabled) return;
    const discount = parseFloat(value) || 0;

    if (discount < 0) {
      toast.error("Giảm giá không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].discount = discount;
      updated[index].subTotal =
        updated[index].quantity * updated[index].price - discount;
      return updated;
    });
  };

  const calculateTotalQuantity = () => {
    return products.reduce((sum, p) => sum + p.quantity, 0);
  };

  const calculateTotalValue = () => {
    return products.reduce((sum, p) => sum + p.subTotal, 0);
  };

  const handleSubmit = async (submitStatus: number) => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (!supplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }

    if (products.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }

    const hasInvalidQuantity = products.some((p) => p.quantity <= 0);
    if (hasInvalidQuantity) {
      toast.error("Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm");
      return;
    }

    const orderSupplierData = {
      supplierId,
      branchId,
      status: submitStatus,
      description: note,
      items: products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        price: p.price,
        discount: p.discount,
        description: p.note,
      })),
    };

    try {
      if (orderSupplier?.id) {
        await updateOrderSupplier.mutateAsync({
          id: orderSupplier.id,
          data: orderSupplierData,
        });
      } else {
        await createOrderSupplier.mutateAsync(orderSupplierData);
      }

      router.push("/san-pham/dat-hang-nhap");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex h-full border-t bg-gray-50 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-80 m-4 border rounded-xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">
              {orderSupplier
                ? "Chi tiết phiếu đặt hàng nhập"
                : "Tạo phiếu đặt hàng nhập"}
            </h2>
            {orderSupplier && (
              <p className="text-sm text-gray-600 mt-1">
                Mã phiếu: {orderSupplier.code}
              </p>
            )}
          </div>
          <button
            onClick={() => (onClose ? onClose() : router.back())}
            className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm hàng hóa theo mã hoặc tên
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  isFormDisabled
                    ? "Không thể thêm sản phẩm ở trạng thái này"
                    : "Tìm kiếm sản phẩm..."
                }
                value={searchQuery}
                onChange={(e) => {
                  if (isFormDisabled) return;
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => !isFormDisabled && setShowSearchResults(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchResults(false), 200)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {showSearchResults && searchQuery && searchResults?.data && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                {searchResults.data.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Không tìm thấy sản phẩm
                  </div>
                ) : (
                  searchResults.data.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                          {product.images?.[0]?.image && (
                            <img
                              src={product.images[0].image}
                              alt={product.name}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.code} - {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Giá:{" "}
                            {formatCurrency(getProductCost(product, branchId))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    STT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Mã hàng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Tên hàng
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    ĐVT
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    SL đặt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Giá nhập
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Giảm giá
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    Thành tiền
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {item.productCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px]">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                      -
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              index,
                              String(item.quantity - 1)
                            )
                          }
                          disabled={isFormDisabled ? true : false}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50">
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(index, e.target.value)
                          }
                          disabled={isFormDisabled ? true : false}
                          className="w-20 text-center border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                        />
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              index,
                              String(item.quantity + 1)
                            )
                          }
                          disabled={isFormDisabled ? true : false}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          handlePriceChange(index, e.target.value)
                        }
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.discount}
                        onChange={(e) =>
                          handleDiscountChange(index, e.target.value)
                        }
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(item.subTotal)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleRemoveProduct(index)}
                        disabled={isFormDisabled ? true : false}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50">
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Chưa có sản phẩm nào. Vui lòng thêm sản phẩm.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-80 border mr-4 mb-4 mt-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-6 bg-white shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Mã đặt hàng nhập
            </label>
            <input
              type="text"
              value={orderSupplier?.code || "Mã phiếu tự động"}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value))}
              disabled={isFormDisabled ? true : false}
              className="w-full px-3 py-2 border rounded disabled:bg-gray-100">
              <option value={0}>Phiếu tạm</option>
              <option value={1}>Đã xác nhận NCC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Tổng số lượng / Tổng giá trị
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={calculateTotalQuantity()}
                disabled
                className="w-full px-3 py-2 border rounded bg-gray-50 text-right"
              />
              <input
                type="text"
                value={formatCurrency(calculateTotalValue())}
                disabled
                className="w-full px-3 py-2 border rounded bg-blue-50 text-right text-blue-600 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Chi nhánh <span className="text-red-500">*</span>
            </label>
            <select
              value={branchId}
              onChange={(e) => {
                if (!orderSupplier) {
                  setBranchId(Number(e.target.value));
                  setProducts([]);
                }
              }}
              disabled={orderSupplier ? true : false}
              className="w-full px-3 py-2 border rounded disabled:bg-gray-100">
              <option value={0}>Chọn chi nhánh</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Nhà cung cấp <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(Number(e.target.value))}
              disabled={isFormDisabled ? true : false}
              className="w-full px-3 py-2 border rounded disabled:bg-gray-100">
              <option value={0}>Chọn nhà cung cấp</option>
              {suppliersData?.data?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isFormDisabled ? true : false}
              rows={4}
              className="w-full px-3 py-2 border rounded resize-none disabled:bg-gray-100"
              placeholder="Nhập ghi chú..."
            />
          </div>

          <div className="pt-4 border-t space-y-3">
            {!isFormDisabled && (
              <>
                <button
                  onClick={() => handleSubmit(0)}
                  disabled={
                    createOrderSupplier.isPending ||
                    updateOrderSupplier.isPending
                  }
                  className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-50">
                  Lưu tạm
                </button>
                <button
                  onClick={() => handleSubmit(1)}
                  disabled={
                    createOrderSupplier.isPending ||
                    updateOrderSupplier.isPending
                  }
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                  Xác nhận NCC
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
