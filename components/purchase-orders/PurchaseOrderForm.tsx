"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Search, ChevronDown, Minus, Plus } from "lucide-react";
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
import { CreditCard } from "lucide-react";
import { SupplierPaymentModal } from "../order-suppliers/SupplierPaymentModal";

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
  { value: false, label: "Hoàn thành" },
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
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "card"
  >("cash");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handlePaymentConfirm = (
    amount: number,
    method: "cash" | "transfer" | "card"
  ) => {
    setPaymentAmount(amount);
    setPaymentMethod(method);
  };

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
  const [discount, setDiscount] = useState<number>(
    purchaseOrder?.discount || 0
  );
  const [discountRatio, setDiscountRatio] = useState<number>(
    purchaseOrder?.discountRatio || 0
  );
  const [discountType, setDiscountType] = useState<"amount" | "ratio">(
    "amount"
  );
  const [isDraft, setIsDraft] = useState<boolean>(
    purchaseOrder?.isDraft !== undefined ? purchaseOrder.isDraft : true
  );
  const [products, setProducts] = useState<ProductItem[]>([]);

  const formatNumber = (value: number): string => {
    if (!value) return "";
    return value.toLocaleString("en-US");
  };

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, "")) || 0;
  };

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

  const calculateTotal = () => {
    const subtotal = products.reduce((sum, p) => sum + p.subTotal, 0);
    const discountAmount =
      discountType === "amount" ? discount : (subtotal * discountRatio) / 100;
    return subtotal - discountAmount;
  };

  const handleSubmit = async () => {
    setIsDraft(true);
    handleFormSubmit();
  };

  const handleComplete = async () => {
    setIsDraft(false);
    handleFormSubmit();
  };

  const handleFormSubmit = async () => {
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

    const purchaseOrderData = {
      supplierId,
      branchId,
      isDraft,
      description: note,
      discount: discountType === "amount" ? discount : undefined,
      discountRatio: discountType === "ratio" ? discountRatio : undefined,
      items: products.map((p) => ({
        productId: Number(p.productId),
        quantity: Number(p.quantity),
        price: Number(p.price),
        discount: Number(p.discount) || 0,
        description: p.note,
      })),
      orderSupplierId: orderSupplier?.id,
      paidAmount: paymentAmount > 0 ? paymentAmount : undefined,
    };

    try {
      if (purchaseOrder?.id) {
        await updatePurchaseOrder.mutateAsync({
          id: purchaseOrder.id,
          data: purchaseOrderData,
        });
        toast.success("Cập nhật phiếu nhập hàng thành công");
      } else {
        await createPurchaseOrder.mutateAsync(purchaseOrderData);
        toast.success("Tạo phiếu nhập hàng thành công");
      }

      router.push("/san-pham/nhap-hang");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="flex h-full border-t bg-gray-50 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden m-4 border rounded-xl">
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/san-pham/nhap-hang")}
              className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {purchaseOrder ? "Cập nhật nhập hàng" : "Tạo nhập hàng"}
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Tìm kiếm sản phẩm theo mã hoặc tên..."
                disabled={isFormDisabled ? true : false}
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg disabled:bg-gray-100"
              />
            </div>

            {showSearchResults && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
                {searchResults?.data?.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0">
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
                        <p className="text-md text-gray-500">
                          Giá:{" "}
                          {formatCurrency(getProductCost(product, branchId))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700">
                    STT
                  </th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700">
                    Mã hàng
                  </th>
                  <th className="px-3 py-3 text-left text-md font-medium text-gray-700">
                    Tên hàng
                  </th>
                  <th className="px-3 py-3 text-center text-md font-medium text-gray-700">
                    SL
                  </th>
                  <th className="px-3 py-3 text-right text-md font-medium text-gray-700">
                    Đơn giá
                  </th>
                  <th className="px-3 py-3 text-right text-md font-medium text-gray-700">
                    Giảm giá
                  </th>
                  <th className="px-3 py-3 text-right text-md font-medium text-gray-700">
                    Thành tiền
                  </th>
                  <th className="px-3 py-3 text-center text-md font-medium text-gray-700">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-md text-center">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 text-md">{item.productCode}</td>
                    <td className="px-3 py-2 text-md">{item.productName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
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
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={formatNumber(item.price)}
                        onChange={(e) => {
                          const numericValue = parseFormattedNumber(
                            e.target.value
                          );
                          handlePriceChange(index, numericValue.toString());
                        }}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
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
                    <td className="px-3 py-2 text-sm text-right font-medium">
                      {formatCurrency(item.subTotal)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleRemoveProduct(index)}
                        disabled={isFormDisabled ? true : false}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50">
                        <X className="w-4 h-4" />
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

      <div className="w-[420px] border mr-4 mt-4 mb-4 rounded-xl overflow-y-auto bg-white border-l flex flex-col custom-sidebar-scroll">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Thông tin nhập hàng</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-md text-gray-600 mb-1">
              Mã phiếu nhập
            </label>
            <input
              type="text"
              value={purchaseOrder?.code || "Mã phiếu tự động"}
              disabled
              className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50 text-gray-600"
            />
          </div>

          {orderSupplier && (
            <div>
              <label className="block text-md text-gray-600 mb-1">
                Mã đặt hàng nhập
              </label>
              <input
                type="text"
                value={orderSupplier.code}
                disabled
                className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50 text-gray-600"
              />
            </div>
          )}

          <div ref={statusDropdownRef}>
            <label className="block text-md text-gray-600 mb-1">
              Trạng thái <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowStatusDropdown(!showStatusDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span>
                  {selectedStatus ? selectedStatus.label : "Chọn trạng thái"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showStatusDropdown && !isFormDisabled && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setIsDraft(option.value);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={branchDropdownRef}>
            <label className="block text-md text-gray-600 mb-1">
              Kho <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowBranchDropdown(!showBranchDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span>
                  {selectedBranchData ? selectedBranchData.name : "Chọn kho"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showBranchDropdown && !isFormDisabled && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {branches?.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setBranchId(branch.id);
                        setShowBranchDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                      {branch.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={supplierDropdownRef}>
            <label className="block text-md text-gray-600 mb-1">
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
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span>
                  {selectedSupplier
                    ? selectedSupplier.name
                    : "Chọn nhà cung cấp"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showSupplierDropdown && !isFormDisabled && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {suppliersData?.data?.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => {
                        setSupplierId(supplier.id);
                        setShowSupplierDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                      {supplier.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t my-3"></div>

          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Tổng tiền hàng
              </label>
              <div className="text-sm font-semibold text-right px-2 py-1.5 bg-gray-50 rounded">
                {formatCurrency(
                  products.reduce((sum, p) => sum + p.subTotal, 0)
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Giảm giá
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={
                    discountType === "amount"
                      ? formatNumber(discount)
                      : discountRatio
                  }
                  onChange={(e) => {
                    if (discountType === "amount") {
                      const value = parseFormattedNumber(e.target.value);
                      setDiscount(value);
                    } else {
                      const value = parseFloat(e.target.value) || 0;
                      setDiscountRatio(value);
                    }
                  }}
                  disabled={isFormDisabled ? true : false}
                  placeholder="0"
                  className="flex-1 text-right text-sm px-2 py-1.5 border rounded disabled:bg-gray-100"
                />
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(e.target.value as "amount" | "ratio");
                    setDiscount(0);
                    setDiscountRatio(0);
                  }}
                  disabled={isFormDisabled ? true : false}
                  className="w-16 text-sm border rounded disabled:bg-gray-100">
                  <option value="amount">₫</option>
                  <option value="ratio">%</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">
              Cần trả nhà cung cấp
            </label>
            <input
              type="text"
              value={formatCurrency(calculateTotal())}
              disabled
              className="w-full px-2 py-1.5 text-sm border rounded bg-blue-50 text-blue-600 font-semibold text-right"
            />
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">
              Tiền trả nhà cung cấp
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formatCurrency(paymentAmount)}
                readOnly
                className="flex-1 text-right text-sm px-2 py-1.5 border rounded bg-gray-50"
              />
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={isFormDisabled ? true : false}
                className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-50">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </button>
            </div>
            {paymentAmount > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {paymentMethod === "cash" && "Tiền mặt"}
                {paymentMethod === "card" && "Thẻ"}
                {paymentMethod === "transfer" && "Chuyển khoản"}
              </div>
            )}
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">
              Tiền nhà cung cấp trả lại
            </label>
            <div className="text-sm font-semibold text-right px-2 py-1.5 bg-red-50 text-red-600 rounded">
              {formatCurrency(Math.max(0, paymentAmount - calculateTotal()))}
            </div>
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">
              Chi phí nhập khác
            </label>
            <input
              type="text"
              value="0"
              disabled
              className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50 text-right"
            />
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isFormDisabled ? true : false}
              className="w-full px-2 py-1.5 text-sm border rounded disabled:bg-gray-100 resize-none"
              rows={3}
              placeholder="Nhập ghi chú..."
            />
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 space-y-2">
          <button
            onClick={handleComplete}
            disabled={isFormDisabled ? true : false}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            Hoàn thành
          </button>
          <button
            onClick={handleSubmit}
            disabled={isFormDisabled ? true : false}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            Lưu tạm
          </button>
        </div>
      </div>

      <SupplierPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={calculateTotal()}
        previouslyPaid={0}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
