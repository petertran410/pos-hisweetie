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
import { useUsers } from "@/lib/hooks/useUsers";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import type { OrderSupplier } from "@/lib/types/order-supplier";
import { formatCurrency, parseNumberInput } from "@/lib/utils";
import { useBranchStore } from "@/lib/store/branch";
import { CreditCard, Calendar } from "lucide-react";
import { SupplierPaymentModal } from "./SupplierPaymentModal";

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
  { value: 2, label: "Nhập một phần" },
  { value: 3, label: "Hoàn thành" },
  { value: 4, label: "Đã hủy" },
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
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "transfer" | "card"
  >("cash");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderDate, setOrderDate] = useState<Date | null>(
    orderSupplier?.orderDate ? new Date(orderSupplier.orderDate) : null
  );
  const [previouslyPaid, setPreviouslyPaid] = useState<number>(0);
  const { user: currentUser } = useAuthStore();

  const handlePaymentConfirm = (
    amount: number,
    method: "cash" | "transfer" | "card"
  ) => {
    setPaymentAmount(amount);
    setPaymentMethod(method);
  };

  const [branchId, setBranchId] = useState<number>(
    orderSupplier?.branchId || selectedBranch?.id || 0
  );
  const [supplierId, setSupplierId] = useState<number>(
    orderSupplier?.supplierId || 0
  );
  const [status, setStatus] = useState<number>(orderSupplier?.status || 0);
  const [note, setNote] = useState<string>(orderSupplier?.description || "");
  const [discount, setDiscount] = useState<number>(
    orderSupplier?.discount || 0
  );
  const [discountRatio, setDiscountRatio] = useState<number>(
    orderSupplier?.discountRatio || 0
  );
  const [discountType, setDiscountType] = useState<"amount" | "ratio">(
    "amount"
  );

  const [products, setProducts] = useState<ProductItem[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [userId, setUserId] = useState<number>(
    orderSupplier?.userId || currentUser?.id || 0
  );
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { data: users } = useUsers();
  const selectedUser = users?.find((u: any) => u.id === userId);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

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

      const previousPaid = Number(orderSupplier.paidAmount || 0);
      setPreviouslyPaid(previousPaid);

      setPaymentAmount(0);

      if (orderSupplier.payments && orderSupplier.payments.length > 0) {
        const firstPayment = orderSupplier.payments[0];
        setPaymentMethod(
          firstPayment.paymentMethod as "cash" | "transfer" | "card"
        );
      }
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
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
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
        (updated[index].price - updated[index].discount) * quantity;
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
        (price - updated[index].discount) * updated[index].quantity;
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
        (updated[index].price - discount) * updated[index].quantity;
      return updated;
    });
  };

  const calculateTotalValue = () => {
    const subtotal = products.reduce((sum, p) => sum + p.subTotal, 0);
    const discountAmount =
      discountType === "amount" ? discount : (subtotal * discountRatio) / 100;
    return subtotal - discountAmount;
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
      userId: userId || undefined,
      status: status,
      description: note,
      discount: discountType === "amount" ? Number(discount) || 0 : 0,
      discountRatio: discountType === "ratio" ? Number(discountRatio) || 0 : 0,
      items: products.map((p) => ({
        productId: Number(p.productId),
        quantity: Number(p.quantity),
        price: Number(p.price),
        discount: Number(p.discount) || 0,
        description: p.note,
      })),
      paymentAmount: paymentAmount > 0 ? paymentAmount : undefined,
      paymentMethod: paymentAmount > 0 ? paymentMethod : undefined,
      orderDate: orderDate?.toISOString(),
    };

    try {
      if (orderSupplier?.id) {
        await updateOrderSupplier.mutateAsync({
          id: orderSupplier.id,
          data: orderSupplierData,
        });
        toast.success("Cập nhật đặt hàng nhập thành công");
      } else {
        await createOrderSupplier.mutateAsync(orderSupplierData);
        toast.success("Tạo đặt hàng nhập thành công");
      }

      router.push("/san-pham/dat-hang-nhap");
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
              onClick={() => router.push("/san-pham/dat-hang-nhap")}
              className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {orderSupplier ? "Cập nhật đặt hàng nhập" : "Tạo đặt hàng nhập"}
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
                  <th className="px-3 py-2 text-left text-md font-medium text-gray-700">
                    STT
                  </th>
                  <th className="px-3 py-2 text-left text-md font-medium text-gray-700">
                    Mã hàng
                  </th>
                  <th className="px-3 py-2 text-left text-md font-medium text-gray-700">
                    Tên hàng
                  </th>
                  <th className="px-3 py-2 text-center text-md font-medium text-gray-700">
                    SL đặt
                  </th>
                  <th className="px-3 py-2 text-right text-md font-medium text-gray-700">
                    Giá nhập
                  </th>
                  <th className="px-3 py-2 text-right text-md font-medium text-gray-700">
                    Giảm giá
                  </th>
                  <th className="px-3 py-2 text-right text-md font-medium text-gray-700">
                    Thành tiền
                  </th>
                  <th className="px-3 py-2 text-center text-md font-medium text-gray-700">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm">{index + 1}</td>
                    <td className="px-3 py-2 text-sm text-blue-600">
                      {item.productCode}
                    </td>
                    <td className="px-3 py-2 text-sm">{item.productName}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            handleQuantityChange(
                              index,
                              String(item.quantity - 1)
                            )
                          }
                          disabled={isFormDisabled ? true : false}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          value={formatCurrency(item.quantity)}
                          onChange={(e) => {
                            const numericValue = parseNumberInput(
                              e.target.value
                            );
                            handleQuantityChange(
                              index,
                              numericValue.toString()
                            );
                          }}
                          disabled={isFormDisabled ? true : false}
                          className="w-16 text-center border rounded px-1 py-1 text-sm disabled:bg-gray-100"
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
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={formatCurrency(item.price)}
                        onChange={(e) => {
                          const numericValue = parseNumberInput(e.target.value);
                          handlePriceChange(index, numericValue.toString());
                        }}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={formatCurrency(item.discount)}
                        onChange={(e) => {
                          const numericValue = parseNumberInput(e.target.value);
                          handleDiscountChange(index, numericValue.toString());
                        }}
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
          <h3 className="font-semibold text-gray-900">Thông tin đơn hàng</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex gap-2">
            <label className="text-md text-gray-600 mb-1">
              Mã đặt hàng nhập:
            </label>
            <div>{orderSupplier?.code || "Mã phiếu tự động"}</div>
          </div>

          <div ref={userDropdownRef} className="flex gap-2 items-center">
            <div className="text-md text-gray-600">Người đặt hàng:</div>
            <div className="relative w-40">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowUserDropdown(!showUserDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100">
                <span className={!selectedUser ? "text-gray-400" : ""}>
                  {selectedUser ? selectedUser.name : "Chọn người nhập"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  <div
                    onClick={() => {
                      setUserId(0);
                      setShowUserDropdown(false);
                    }}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-400">
                    Không chọn
                  </div>
                  {users?.map((user: any) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setUserId(user.id);
                        setShowUserDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {user.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={statusDropdownRef} className="flex gap-2 items-center">
            <div className="text-md text-gray-600">Trạng thái:</div>
            <div className="relative w-40">
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
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10">
                  {STATUS_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => {
                        setStatus(option.value);
                        setShowStatusDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={branchDropdownRef} className="flex gap-2 items-center">
            <div className="text-md text-gray-600">Chi nhánh:</div>
            <div className="relative w-40">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowBranchDropdown(!showBranchDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100">
                <span>{selectedBranchData?.name || "Chọn chi nhánh"}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showBranchDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {branches?.map((branch) => (
                    <div
                      key={branch.id}
                      onClick={() => {
                        setBranchId(branch.id);
                        setShowBranchDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {branch.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div ref={supplierDropdownRef} className="flex gap-2 items-center">
            <div className="text-md text-gray-600">Nhà cung cấp:</div>
            <div className="relative w-40">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled &&
                  setShowSupplierDropdown(!showSupplierDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100">
                <span className={!selectedSupplier ? "text-gray-400" : ""}>
                  {selectedSupplier
                    ? selectedSupplier.name
                    : "Chọn nhà cung cấp"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSupplierDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {suppliersData?.data?.map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => {
                        setSupplierId(supplier.id);
                        setShowSupplierDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {supplier.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t my-3"></div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="block text-md text-gray-600">Tổng tiền hàng:</div>
              <div>
                {formatCurrency(
                  products.reduce((sum, p) => sum + p.subTotal, 0)
                )}
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="block text-md text-gray-600">Giảm giá:</div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={
                    discountType === "amount"
                      ? formatCurrency(discount)
                      : discountRatio
                  }
                  onChange={(e) => {
                    if (discountType === "amount") {
                      const value = parseNumberInput(e.target.value);
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
                  <option value="amount">VND</option>
                  <option value="ratio">%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="text-md text-gray-600">Cần trả nhà cung cấp:</div>
            <div>{formatCurrency(calculateTotalValue() - previouslyPaid)}</div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="text-md text-gray-600">
              {orderSupplier ? "Trả thêm cho NCC:" : "Tiền trả nhà cung cấp:"}
            </div>
            <div className="flex items-center gap-2">
              <div>{formatCurrency(paymentAmount)}</div>
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

          {orderSupplier && (previouslyPaid > 0 || paymentAmount > 0) && (
            <div className="flex gap-2">
              <div className="text-md text-gray-600">Tổng đã trả:</div>
              <div>{formatCurrency(previouslyPaid + paymentAmount)}</div>
            </div>
          )}

          <div className="flex gap-2">
            <div className="text-md text-gray-600">
              Tiền nhà cung cấp trả lại:
            </div>
            <div>
              {formatCurrency(
                Math.max(
                  0,
                  previouslyPaid + paymentAmount - calculateTotalValue()
                )
              )}
            </div>
          </div>

          <div>
            <label className="text-md text-gray-600">
              Dự kiến ngày nhập hàng
            </label>
            <div className="relative">
              <input
                type="date"
                value={orderDate?.toISOString().split("T")[0] || ""}
                onChange={(e) =>
                  setOrderDate(e.target.value ? new Date(e.target.value) : null)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full text-sm px-2 py-1.5 border rounded disabled:bg-gray-100 
   focus:outline-none focus:ring-2 focus:ring-blue-500
   [&::-webkit-calendar-picker-indicator]:opacity-0
   [&::-webkit-calendar-picker-indicator]:absolute
   [&::-webkit-calendar-picker-indicator]:right-0
   [&::-webkit-calendar-picker-indicator]:w-full
   [&::-webkit-calendar-picker-indicator]:h-full
   [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isFormDisabled ? true : false}
              placeholder="Nhập ghi chú..."
              rows={2}
              className="w-full text-md px-2 py-1.5 border rounded disabled:bg-gray-100 resize-none"
            />
          </div>
        </div>

        {/* Sidebar Footer - Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isFormDisabled ? true : false}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            {orderSupplier ? "Cập nhật" : "Đặt hàng nhập"}
          </button>

          <button
            onClick={() => router.push("/san-pham/dat-hang-nhap")}
            className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-sm">
            Hủy
          </button>
        </div>
      </div>

      <SupplierPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={calculateTotalValue()}
        previouslyPaid={previouslyPaid}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
