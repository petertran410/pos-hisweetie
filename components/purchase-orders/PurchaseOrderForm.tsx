"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, Trash2 } from "lucide-react";
import {
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from "@/lib/hooks/usePurchaseOrders";
import { useBranches } from "@/lib/hooks/useBranches";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useProducts } from "@/lib/hooks/useProducts";
import type { PurchaseOrder } from "@/lib/types/purchase-order";
import { toast } from "sonner";
import { useBranchStore } from "@/lib/store/branch";

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
  onClose?: () => void;
}

interface ProductInForm {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  note: string;
}

const STATUS_OPTIONS = [
  { value: 0, label: "Phiếu tạm" },
  { value: 1, label: "Đã nhập hàng" },
];

export function PurchaseOrderForm({
  purchaseOrder,
  onClose,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const createPurchaseOrder = useCreatePurchaseOrder();
  const updatePurchaseOrder = useUpdatePurchaseOrder();

  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({});

  const [branchId, setBranchId] = useState<number>(
    purchaseOrder?.branchId || selectedBranch?.id || 0
  );
  const [supplierId, setSupplierId] = useState<number>(
    purchaseOrder?.supplierId || 0
  );
  const [status, setStatus] = useState<number>(purchaseOrder?.status || 0);
  const [note, setNote] = useState("");
  const [products, setProducts] = useState<ProductInForm[]>([]);

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

  const isFormDisabled =
    purchaseOrder?.status === 1 || purchaseOrder?.status === 2;

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const selectedBranchData = branches?.find((b) => b.id === branchId);
  const selectedSupplier = suppliersData?.data?.find(
    (s) => s.id === supplierId
  );

  useEffect(() => {
    if (purchaseOrder) {
      setNote(purchaseOrder.description || "");

      if (purchaseOrder.items) {
        setProducts(
          purchaseOrder.items.map((item) => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: Number(item.quantity),
            price: Number(item.price),
            discount: Number(item.discount),
            note: item.description || "",
          }))
        );
      }
    }
  }, [purchaseOrder]);

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

    setProducts([
      ...products,
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        price: cost || Number(product.basePrice) || 0,
        discount: 0,
        note: "",
      },
    ]);
    setSearchQuery("");
  };

  const removeProduct = (productId: number) => {
    setProducts(products.filter((p) => p.productId !== productId));
  };

  const updateProduct = (
    productId: number,
    field: keyof ProductInForm,
    value: any
  ) => {
    setProducts(
      products.map((p) =>
        p.productId === productId ? { ...p, [field]: value } : p
      )
    );
  };

  const calculateSubTotal = (item: ProductInForm) => {
    return item.quantity * item.price - item.discount;
  };

  const calculateTotal = () => {
    return products.reduce((sum, p) => sum + calculateSubTotal(p), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
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
      supplierId,
      branchId,
      purchaseDate: new Date().toISOString(),
      items: products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: p.price,
      })),
      notes: note,
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
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-80 m-4 border rounded-xl">
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
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
                          className="px-4 py-2 hover:bg-gray-50 cursor-pointer">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500">
                            {product.code}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">
                        Không tìm thấy sản phẩm
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Tên hàng
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    SL
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Giá
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Thành tiền
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500">
                      Chưa có sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.productId} className="border-t">
                      <td className="px-4 py-2">
                        <div className="font-medium">{product.productName}</div>
                        <div className="text-sm text-gray-500">
                          {product.productCode}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={product.quantity}
                          onChange={(e) =>
                            updateProduct(
                              product.productId,
                              "quantity",
                              Number(e.target.value)
                            )
                          }
                          disabled={isFormDisabled ? true : false}
                          className="w-20 px-2 py-1 border rounded disabled:bg-gray-100"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={product.price}
                          onChange={(e) =>
                            updateProduct(
                              product.productId,
                              "price",
                              Number(e.target.value)
                            )
                          }
                          disabled={isFormDisabled ? true : false}
                          className="w-24 px-2 py-1 border rounded disabled:bg-gray-100"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {formatCurrency(calculateSubTotal(product))}
                      </td>
                      <td className="px-4 py-2">
                        {!isFormDisabled && (
                          <button
                            onClick={() => removeProduct(product.productId)}
                            className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Tổng tiền:</span>
              <span className="text-blue-600">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
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
                      key={statusOption.value}
                      onClick={() => {
                        setStatus(statusOption.value);
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
