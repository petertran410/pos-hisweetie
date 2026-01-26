"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, ChevronDown, Minus, Plus } from "lucide-react";
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

const STATUS_OPTIONS = [
  { value: 0, label: "Phiếu tạm" },
  { value: 1, label: "Đã xác nhận NCC" },
];

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

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 20,
  });

  const isFormDisabled = orderSupplier && orderSupplier.status === 3;

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const selectedBranchData = branches?.find((b) => b.id === branchId);
  const selectedSupplier = suppliersData?.data?.find(
    (s) => s.id === supplierId
  );

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBranchDropdown(false);
      }
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleSubmit = async () => {
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
      status: status,
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
                className="w-full px-4 py-2.5 border rounded-lg disabled:bg-gray-100 pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                          type="text"
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
                        type="text"
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
                        type="text"
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

          <div ref={statusDropdownRef}>
            <label className="block text-sm text-gray-600 mb-1">
              Trạng thái <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowStatusDropdown(!showStatusDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-3 py-2 border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span className={!selectedStatus ? "text-gray-400" : ""}>
                  {selectedStatus ? selectedStatus.label : "Chọn trạng thái"}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                  {STATUS_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => {
                        setStatus(option.value);
                        setShowStatusDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
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

          <div ref={branchDropdownRef}>
            <label className="block text-sm text-gray-600 mb-1">
              Chi nhánh <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!orderSupplier) {
                    setShowBranchDropdown(!showBranchDropdown);
                  }
                }}
                disabled={orderSupplier ? true : false}
                className="w-full px-3 py-2 border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span
                  className={
                    !selectedBranchData || branchId === 0 ? "text-gray-400" : ""
                  }>
                  {selectedBranchData
                    ? selectedBranchData.name
                    : "Chọn chi nhánh"}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>

              {showBranchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {branches?.map((branch) => (
                    <div
                      key={branch.id}
                      onClick={() => {
                        setBranchId(branch.id);
                        setProducts([]);
                        setShowBranchDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {branch.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={supplierDropdownRef}>
            <label className="block text-sm text-gray-600 mb-1">
              Nhà cung cấp <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled &&
                  setShowSupplierDropdown(!showSupplierDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-3 py-2 border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span
                  className={
                    !selectedSupplier || supplierId === 0 ? "text-gray-400" : ""
                  }>
                  {selectedSupplier
                    ? selectedSupplier.name
                    : "Chọn nhà cung cấp"}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>

              {showSupplierDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {suppliersData?.data?.map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => {
                        setSupplierId(supplier.id);
                        setShowSupplierDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {supplier.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
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

          <div className="pt-4 border-t">
            {!isFormDisabled && (
              <button
                onClick={handleSubmit}
                disabled={
                  createOrderSupplier.isPending || updateOrderSupplier.isPending
                }
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                {orderSupplier ? "Lưu" : "Tạo đặt hàng nhập"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
