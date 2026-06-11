"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronDown,
  Minus,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSuppliers, useSupplier } from "@/lib/hooks/useSuppliers";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreateOrderSupplier,
  useUpdateOrderSupplier,
} from "@/lib/hooks/useOrderSuppliers";
import { useUsers, useUsersForFilter } from "@/lib/hooks/useUsers";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import type { OrderSupplier } from "@/lib/types/order-supplier";
import { formatCurrency, parseNumberInput } from "@/lib/utils";
import { useBranchStore } from "@/lib/store/branch";
import { CreditCard, Calendar } from "lucide-react";
import { SupplierPaymentModal } from "./SupplierPaymentModal";
import { ProductPickerDropdown } from "@/components/products/ProductPickerDropdown";

interface ProductItem {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  subTotal: number;
  factoryPrice: number;
  factorySubTotal: number;
  factorySubTotalManual?: boolean;
  inventory: number;
  note?: string;
}

interface OrderSupplierFormProps {
  orderSupplier?: OrderSupplier | null;
  onClose?: () => void;
}

const STATUS_OPTIONS = [
  { value: 0, label: "Phiếu tạm" },
  { value: 1, label: "Đã xác nhận NCC" },
  { value: 2, label: "Nhập một phần" },
  { value: 3, label: "Hoàn thành" },
  { value: 4, label: "Đã hủy" },
];

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ─── MiniCalendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
  value,
  onChange,
  onClose,
  minDate,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
  minDate?: string;
}) {
  const todayObj = new Date();
  const init = value ? new Date(value + "T00:00:00") : todayObj;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  // Mon = 0 offset
  const startOffset = (new Date(vy, vm, 1).getDay() + 6) % 7;

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: number) =>
    `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prev = () =>
    vm === 0 ? (setVm(11), setVy((y) => y - 1)) : setVm((m) => m - 1);
  const next = () =>
    vm === 11 ? (setVm(0), setVy((y) => y + 1)) : setVm((m) => m + 1);

  return (
    <div className="absolute z-20 mt-2 left-0 right-0 bg-white border border-gray-200 rounded-xl p-3 shadow-lg select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const ds = fmt(day);
          const isSel = value === ds;
          const isToday =
            todayObj.getFullYear() === vy &&
            todayObj.getMonth() === vm &&
            todayObj.getDate() === day;
          const isDisabled = !!minDate && ds < minDate;

          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                onChange(ds);
                onClose();
              }}
              className={[
                "aspect-square text-xs rounded-lg flex items-center justify-center transition-colors",
                isSel
                  ? "bg-brand text-white font-bold"
                  : isToday
                    ? "border border-brand text-brand font-semibold hover:bg-brand-soft"
                    : isDisabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-700 hover:bg-brand-soft cursor-pointer",
              ].join(" ")}>
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClose();
          }}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
          Xóa
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(todayObj.toISOString().split("T")[0]);
            onClose();
          }}
          className="text-xs text-brand hover:text-brand-dark font-medium px-2 py-1 rounded hover:bg-brand-soft transition-colors">
          Hôm nay
        </button>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function OrderSupplierForm({
  orderSupplier,
  onClose,
}: OrderSupplierFormProps) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSupplierSearch(supplierSearch), 250);
    return () => clearTimeout(t);
  }, [supplierSearch]);
  const { data: suppliersData } = useSuppliers({
    name: debouncedSupplierSearch || undefined,
    pageSize: 50,
    currentItem: 0,
  });
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

  const [code, setCode] = useState<string>(orderSupplier?.code || "");

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

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [userId, setUserId] = useState<number>(
    orderSupplier?.userId || currentUser?.id || 0
  );
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { data: users } = useUsersForFilter();
  const selectedUser = users?.find((u: any) => u.id === userId);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const orderDateRef = useRef<HTMLDivElement>(null);
  const [showOrderDateCalendar, setShowOrderDateCalendar] = useState(false);

  const isFormDisabled = orderSupplier && orderSupplier.status === 3;

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === status);
  const selectedBranchData = branches?.find((b) => b.id === branchId);
  const activeBranches = branches?.filter((b) => b.isActive);
  const selectedSupplierFromList = suppliersData?.data?.find(
    (s) => s.id === supplierId
  );
  const { data: selectedSupplierFetched } = useSupplier(
    supplierId && !selectedSupplierFromList ? supplierId : undefined
  );
  const selectedSupplier = selectedSupplierFromList || selectedSupplierFetched;

  useEffect(() => {
    if (orderSupplier?.items) {
      const loadedProducts: ProductItem[] = orderSupplier.items.map((item) => {
        const qty = Number(item.quantity);
        const factoryPrice = Number(item.factoryPrice ?? 0);
        const factorySubTotal = Number(item.factorySubTotal ?? 0);
        return {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: qty,
          price: Number(item.price),
          discount: Number(item.discount),
          subTotal: Number(item.subTotal),
          factoryPrice,
          factorySubTotal,
          // Coi như nhập tay nếu giá trị lưu khác công thức auto (giá NM × SL).
          factorySubTotalManual:
            item.factorySubTotal != null &&
            factorySubTotal !== factoryPrice * qty,
          inventory: 0,
          note: item.description,
        };
      });
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
      if (
        orderDateRef.current &&
        !orderDateRef.current.contains(event.target as Node)
      ) {
        setShowOrderDateCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddProduct = (product: any, quantity: number = 1) => {
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
    const qty = quantity > 0 ? quantity : 1;

    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: qty,
      price: cost,
      discount: 0,
      subTotal: cost * qty,
      factoryPrice: 0,
      factorySubTotal: 0,
      factorySubTotalManual: false,
      inventory: Number(inventory?.onHand || 0),
    };

    setProducts((prev) => [...prev, newProduct]);
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
      if (!updated[index].factorySubTotalManual) {
        updated[index].factorySubTotal = updated[index].factoryPrice * quantity;
      }
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

  const handleFactoryPriceChange = (index: number, value: string) => {
    if (isFormDisabled) return;
    const factoryPrice = parseFloat(value) || 0;

    if (factoryPrice < 0) {
      toast.error("Đơn giá nhà máy không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].factoryPrice = factoryPrice;
      // Chỉ tự tính lại thành tiền NM khi người dùng chưa nhập tay.
      if (!updated[index].factorySubTotalManual) {
        updated[index].factorySubTotal =
          factoryPrice * updated[index].quantity;
      }
      return updated;
    });
  };

  const handleFactorySubTotalChange = (index: number, value: string) => {
    if (isFormDisabled) return;
    const factorySubTotal = parseFloat(value) || 0;

    if (factorySubTotal < 0) {
      toast.error("Thành tiền nhà máy không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      updated[index].factorySubTotal = factorySubTotal;
      updated[index].factorySubTotalManual = true;
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

    const orderSupplierData: any = {
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
        factoryPrice: Number(p.factoryPrice) || null,
        factorySubTotal: Number(p.factorySubTotal) || null,
        description: p.note,
      })),
      paymentAmount: paymentAmount > 0 ? paymentAmount : undefined,
      paymentMethod: paymentAmount > 0 ? paymentMethod : undefined,
      orderDate: orderDate?.toISOString(),
    };

    if (code.trim()) {
      orderSupplierData.code = code.trim();
    }

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
          <div className="mb-4">
            <ProductPickerDropdown
              branchId={branchId}
              disabled={!!isFormDisabled}
              onAddProduct={handleAddProduct}
            />
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
                  <th className="px-3 py-2 text-right text-md font-medium text-gray-700">
                    Đơn giá NM
                  </th>
                  <th className="px-3 py-2 text-right text-md font-medium text-gray-700">
                    Thành tiền NM
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
                    <td className="px-3 py-2 text-sm text-brand">
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
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={formatCurrency(item.factoryPrice)}
                        onChange={(e) => {
                          const numericValue = parseNumberInput(e.target.value);
                          handleFactoryPriceChange(
                            index,
                            numericValue.toString()
                          );
                        }}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={formatCurrency(item.factorySubTotal)}
                        onChange={(e) => {
                          const numericValue = parseNumberInput(e.target.value);
                          handleFactorySubTotalChange(
                            index,
                            numericValue.toString()
                          );
                        }}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
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
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <label className="text-md text-gray-600 whitespace-nowrap">
                Mã đặt hàng nhập:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: PDN000123 (để trống = tự sinh)"
                maxLength={50}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100"
                disabled={!!isFormDisabled}
              />
            </div>
            <p className="text-xs text-gray-500">
              Bạn có thể tự nhập mã. Để trống, hệ thống sẽ tự sinh mã PDN######.
            </p>
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
                  {activeBranches?.map((branch) => (
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
            <div className="relative w-64">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled &&
                  setShowSupplierDropdown(!showSupplierDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100">
                <span
                  className={`truncate ${!selectedSupplier ? "text-gray-400" : ""}`}>
                  {selectedSupplier
                    ? selectedSupplier.name
                    : "Chọn nhà cung cấp"}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </button>
              {showSupplierDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-72 overflow-hidden flex flex-col">
                  <div className="p-2 border-b sticky top-0 bg-white">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        placeholder="Tìm nhà cung cấp..."
                        className="w-full pl-8 pr-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-56">
                    {suppliersData?.data?.length ? (
                      suppliersData.data.map((supplier) => (
                        <div
                          key={supplier.id}
                          onClick={() => {
                            setSupplierId(supplier.id);
                            setShowSupplierDropdown(false);
                            setSupplierSearch("");
                          }}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                          {supplier.name}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Không tìm thấy nhà cung cấp
                      </div>
                    )}
                  </div>
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
                <CreditCard className="w-4 h-4 text-brand" />
              </button>
            </div>
            {paymentAmount > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                {paymentMethod === "cash" && "Tiền mặt"}
                {/* {paymentMethod === "card" && "Thẻ"} */}
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
              Ngày đặt hàng nhập
            </label>
            <div ref={orderDateRef} className="relative">
              {(() => {
                const orderDateStr = orderDate
                  ? `${orderDate.getFullYear()}-${String(
                      orderDate.getMonth() + 1
                    ).padStart(2, "0")}-${String(orderDate.getDate()).padStart(
                      2,
                      "0"
                    )}`
                  : "";
                const displayLabel = orderDate
                  ? orderDate.toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Mặc định (ngày tạo)";

                return (
                  <>
                    <button
                      type="button"
                      disabled={isFormDisabled ? true : false}
                      onClick={() =>
                        !isFormDisabled &&
                        setShowOrderDateCalendar((v) => !v)
                      }
                      className={`w-full flex items-center justify-between px-2 py-1.5 border rounded-lg text-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        orderDate
                          ? "border-brand bg-brand-soft text-gray-800"
                          : "border-gray-200 text-gray-400"
                      } ${
                        showOrderDateCalendar
                          ? "ring-2 ring-brand-soft border-brand"
                          : "hover:border-gray-300"
                      }`}>
                      <span>{displayLabel}</span>
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                    {showOrderDateCalendar && (
                      <MiniCalendar
                        value={orderDateStr}
                        onChange={(d) =>
                          setOrderDate(d ? new Date(d + "T00:00:00") : null)
                        }
                        onClose={() => setShowOrderDateCalendar(false)}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              maxLength={1000}
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
