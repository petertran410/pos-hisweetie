"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, Minus, Plus } from "lucide-react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/lib/hooks/usePurchaseOrders";
import { toast } from "sonner";
import type { PurchaseOrder } from "@/lib/types/purchase-order";
import { formatCurrency } from "@/lib/utils";
import { useBranchStore } from "@/lib/store/branch";
import type { OrderSupplier } from "@/lib/types/order-supplier";

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

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
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
  { value: true, label: "Phiếu tạm" },
  { value: false, label: "Đã nhập hàng" },
];

export function PurchaseOrderForm({
  purchaseOrder,
  orderSupplier,
  onClose,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({});
  const createPurchaseOrder = useCreatePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  const [branchId, setBranchId] = useState<number>(
    purchaseOrder?.branchId ||
      orderSupplier?.branchId ||
      selectedBranch?.id ||
      0
  );
  const [supplierId, setSupplierId] = useState<number>(
    purchaseOrder?.supplierId || orderSupplier?.supplierId || 0
  );
  const [note, setNote] = useState<string>(
    purchaseOrder?.description || orderSupplier?.description || ""
  );
  const [isDraft, setIsDraft] = useState<boolean>(
    purchaseOrder?.isDraft !== undefined ? purchaseOrder.isDraft : true
  );
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

  const isFormDisabled = purchaseOrder && !purchaseOrder.isDraft;

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === isDraft);
  const selectedBranchData = branches?.find((b) => b.id === branchId);
  const selectedSupplier = suppliersData?.data?.find(
    (s) => s.id === supplierId
  );

  useEffect(() => {
    if (purchaseOrder?.items) {
      const loadedProducts: ProductItem[] = purchaseOrder.items.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: Number(item.quantity),
        price: Number(item.price),
        discount: Number(item.discount),
        subTotal: Number(item.totalPrice),
        inventory: 0,
        note: item.description,
      }));
      setProducts(loadedProducts);
    } else if (orderSupplier?.items) {
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
  }, [purchaseOrder, orderSupplier]);

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
      price: cost || Number(product.basePrice) || 0,
      discount: 0,
      subTotal: cost || Number(product.basePrice) || 0,
      inventory: inventory ? Number(inventory.onHand) : 0,
    };

    setProducts([...products, newProduct]);
    setSearchQuery("");
  };

  const handleRemoveProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;

    const newProducts = [...products];
    newProducts[index].quantity = numValue;
    newProducts[index].subTotal =
      numValue * newProducts[index].price - newProducts[index].discount;
    setProducts(newProducts);
  };

  const handlePriceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;

    const newProducts = [...products];
    newProducts[index].price = numValue;
    newProducts[index].subTotal =
      newProducts[index].quantity * numValue - newProducts[index].discount;
    setProducts(newProducts);
  };

  const handleDiscountChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;

    const newProducts = [...products];
    newProducts[index].discount = numValue;
    newProducts[index].subTotal =
      newProducts[index].quantity * newProducts[index].price - numValue;
    setProducts(newProducts);
  };

  const calculateTotal = () => {
    return products.reduce((sum, p) => sum + p.subTotal, 0);
  };

  const handleSubmit = async () => {
    if (branchId === 0) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (supplierId === 0) {
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

    const purchaseOrderData = {
      orderSupplierId: orderSupplier?.id || null,
      supplierId,
      branchId,
      purchaseDate: new Date().toISOString(),
      isDraft: isDraft,
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
      if (purchaseOrder?.id) {
        await updatePurchaseOrder.mutateAsync({
          id: purchaseOrder.id,
          data: purchaseOrderData,
        });
      } else {
        await createPurchaseOrder.mutateAsync(purchaseOrderData);
      }

      router.push("/san-pham/nhap-hang");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex h-full border-t bg-gray-50 overflow-hidden">
      {/* Phần bên trái - Danh sách sản phẩm */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white m-4 border rounded-xl">
        {/* Header giữ nguyên */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">
              {purchaseOrder
                ? "Chi tiết phiếu nhập hàng"
                : "Tạo phiếu nhập hàng"}
            </h2>
            {purchaseOrder && (
              <p className="text-sm text-gray-600 mt-1">
                Mã phiếu: {purchaseOrder.code}
              </p>
            )}
            {orderSupplier && !purchaseOrder && (
              <p className="text-sm text-gray-600 mt-1">
                Từ đặt hàng nhập: {orderSupplier.code}
              </p>
            )}
          </div>
          <button
            onClick={() => (onClose ? onClose() : router.back())}
            className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Phần search và bảng sản phẩm giữ nguyên như cũ */}
        <div className="p-6">
          <div className="relative mb-6">
            <input
              type="text"
              placeholder={
                isFormDisabled
                  ? "Không thể thêm sản phẩm ở trạng thái này"
                  : "Tìm kiếm theo tên hàng, mã hàng"
              }
              value={searchQuery}
              onChange={(e) => {
                if (isFormDisabled) return;
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => !isFormDisabled && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              disabled={isFormDisabled ? true : false}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-base"
            />

            {showSearchResults &&
              searchQuery &&
              !isFormDisabled &&
              searchResults?.data && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {searchResults.data.length > 0 ? (
                    searchResults.data.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          Mã: {product.code}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500">
                      Không tìm thấy sản phẩm
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Bảng sản phẩm */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    STT
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Mã hàng
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Tên hàng
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Số lượng
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Giá
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Giảm giá
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Thành tiền
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-center">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {product.productCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {product.productName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        value={product.quantity}
                        onChange={(e) =>
                          handleQuantityChange(index, e.target.value)
                        }
                        disabled={isFormDisabled ? true : false}
                        className="w-24 px-2 py-1 border rounded text-center disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        value={product.price}
                        onChange={(e) =>
                          handlePriceChange(index, e.target.value)
                        }
                        disabled={isFormDisabled ? true : false}
                        className="w-32 px-2 py-1 border rounded text-center disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        value={product.discount}
                        onChange={(e) =>
                          handleDiscountChange(index, e.target.value)
                        }
                        disabled={isFormDisabled ? true : false}
                        className="w-24 px-2 py-1 border rounded text-center disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {formatCurrency(product.subTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
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

        {/* Footer tổng tiền */}
        <div className="mt-auto border-t bg-gray-50 px-6 py-4">
          <div className="flex justify-end items-center">
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Tổng tiền hàng</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculateTotal())}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phần sidebar bên phải */}
      <div className="w-80 border mr-4 mb-4 mt-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-6 bg-white shadow-xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Mã phiếu nhập hàng
            </label>
            <input
              type="text"
              value={purchaseOrder?.code || "Mã phiếu tự động"}
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
                  {STATUS_OPTIONS.map((statusOption) => (
                    <div
                      key={String(statusOption.value)}
                      onClick={() => {
                        setIsDraft(statusOption.value);
                        setShowStatusDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {statusOption.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={branchDropdownRef}>
            <label className="block text-sm text-gray-600 mb-1">
              Chi nhánh <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowBranchDropdown(!showBranchDropdown)
                }
                disabled={isFormDisabled ? true : false}
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
                  createPurchaseOrder.isPending || updatePurchaseOrder.isPending
                }
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50">
                {purchaseOrder ? "Lưu" : "Tạo phiếu nhập hàng"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
