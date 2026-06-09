"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Search, ChevronDown, Minus, Plus } from "lucide-react";
import { useSuppliers, useSupplier } from "@/lib/hooks/useSuppliers";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useCreatePurchaseOrder,
  useCreatePurchaseOrderFromOrderSupplier,
  useUpdatePurchaseOrder,
} from "@/lib/hooks/usePurchaseOrders";
import { toast } from "sonner";
import type { PurchaseOrder } from "@/lib/types/purchase-order";
import { formatCurrency } from "@/lib/utils";
import { useBranchStore } from "@/lib/store/branch";
import type { OrderSupplier } from "@/lib/types/order-supplier";
import { CreditCard } from "lucide-react";
import { SupplierPaymentModal } from "../order-suppliers/SupplierPaymentModal";
import { useUsers, useUsersForFilter } from "@/lib/hooks/useUsers";
import { useAuthStore } from "@/lib/store/auth";
import { ProductPickerDropdown } from "@/components/products/ProductPickerDropdown";

// Định dạng số có ngăn cách hàng nghìn, tối đa `maxFractionDigits` số thập
// phân (mặc định 3 cho đơn giá). Không ép số thập phân tối thiểu nên 1000 vẫn
// hiển thị "1,000", còn 1001.667 hiển thị "1,001.667".
function formatNumber(value: number, maxFractionDigits = 3): string {
  if (!isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

// Làm tròn về `digits` số thập phân, tránh sai số dấu phẩy động (vd 0.1+0.2).
function roundTo(value: number, digits = 3): number {
  const f = Math.pow(10, digits);
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Ô nhập số tiền cho phép gõ số thập phân mượt (giữ nguyên dấu "." và số 0 ở
 * cuối trong lúc gõ). Khi blur sẽ format lại theo locale.
 * - `maxFractionDigits`: số chữ số thập phân tối đa được phép gõ.
 * - `onValueChange`: trả về number đã parse.
 */
function NumericInput({
  value,
  onValueChange,
  maxFractionDigits = 3,
  disabled,
  className,
}: {
  value: number;
  onValueChange: (next: number) => void;
  maxFractionDigits?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  // Khi không focus, hiển thị giá trị đã format từ prop (nguồn sự thật).
  const display = focused ? raw : formatNumber(value, maxFractionDigits);

  const decimalPattern = useMemo(
    () =>
      maxFractionDigits > 0
        ? new RegExp(`^\\d*(?:\\.\\d{0,${maxFractionDigits}})?$`)
        : /^\d*$/,
    [maxFractionDigits]
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      disabled={disabled}
      className={className}
      onFocus={(e) => {
        setFocused(true);
        // Bắt đầu gõ từ giá trị số thuần (bỏ dấu phẩy ngăn cách).
        setRaw(value ? String(value) : "");
        e.target.select();
      }}
      onChange={(e) => {
        // Bỏ dấu phẩy ngăn cách, chỉ nhận số + tối đa N chữ số thập phân.
        const cleaned = e.target.value.replace(/,/g, "");
        if (cleaned === "" || decimalPattern.test(cleaned)) {
          setRaw(cleaned);
          onValueChange(cleaned === "" ? 0 : parseFloat(cleaned) || 0);
        }
      }}
      onBlur={() => setFocused(false)}
    />
  );
}

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
  // Đánh dấu user đã nhập trực tiếp ô "Thành tiền". Khi true, ô Thành tiền là
  // nguồn chính: đổi SL/giảm giá sẽ suy ra Đơn giá (= thành tiền / SL + giảm
  // giá). Khi false (mặc định): Đơn giá là nguồn chính, Thành tiền tự tính.
  manualSubTotal?: boolean;
}

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
  orderSupplier?: OrderSupplier | null;
  copyFrom?: PurchaseOrder | null;
  onClose?: () => void;
}

const STATUS_OPTIONS = [
  { value: true, label: "Phiếu tạm" },
  { value: false, label: "Hoàn thành" },
];

export function PurchaseOrderForm({
  purchaseOrder,
  orderSupplier,
  copyFrom,
}: PurchaseOrderFormProps) {
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
  const createPurchaseOrder = useCreatePurchaseOrder();
  const createPurchaseOrderFromOrderSupplier =
    useCreatePurchaseOrderFromOrderSupplier();
  const updatePurchaseOrder = useUpdatePurchaseOrder();
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [previouslyPaid, setPreviouslyPaid] = useState<number>(0);
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
      copyFrom?.branchId ||
      selectedBranch?.id ||
      0
  );
  const [code, setCode] = useState<string>(purchaseOrder?.code || "");
  const [supplierId, setSupplierId] = useState<number>(
    purchaseOrder?.supplierId ||
      orderSupplier?.supplierId ||
      copyFrom?.supplierId ||
      0
  );
  const [note, setNote] = useState<string>(
    purchaseOrder?.description ||
      orderSupplier?.description ||
      copyFrom?.description ||
      ""
  );
  const [discount, setDiscount] = useState<number>(
    purchaseOrder?.discount || copyFrom?.discount || 0
  );
  const [discountRatio, setDiscountRatio] = useState<number>(
    purchaseOrder?.discountRatio || copyFrom?.discountRatio || 0
  );
  const [discountType, setDiscountType] = useState<"amount" | "ratio">(
    "amount"
  );
  const [isDraft, setIsDraft] = useState<boolean>(
    purchaseOrder?.isDraft !== undefined ? purchaseOrder.isDraft : true
  );
  const [products, setProducts] = useState<ProductItem[]>([]);
  const { user: currentUser } = useAuthStore();
  const { data: users } = useUsersForFilter();
  const [purchaseById, setPurchaseById] = useState<number>(
    purchaseOrder?.purchaseById ||
      orderSupplier?.userId ||
      copyFrom?.purchaseById ||
      currentUser?.id ||
      0
  );
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const selectedUser = users?.find((u: any) => u.id === purchaseById);

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, "")) || 0;
  };

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const discountDropdownRef = useRef<HTMLDivElement>(null);

  // Cho phép sửa PN ở mọi trạng thái trừ "Đã hủy" (status=2). Trước đây
  // form bị khoá khi `!isDraft` (= "Đã nhập hàng") nên user không thể chỉnh
  // số lượng/giá kể cả khi cần điều chỉnh sau nhập hàng. BE đã hỗ trợ tính
  // delta tồn kho an toàn khi update PN status=1.
  const isFormDisabled = purchaseOrder?.status === 2;

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === isDraft);
  const selectedBranchData = branches?.find((b) => b.id === branchId);
  const activeBranches = branches?.filter((b) => b.isActive);
  const selectedSupplierFromList = suppliersData?.data?.find(
    (s) => s.id === supplierId
  );
  const { data: selectedSupplierFetched } = useSupplier(
    supplierId && !selectedSupplierFromList ? supplierId : undefined
  );
  const selectedSupplier = selectedSupplierFromList || selectedSupplierFetched;

  const availableDiscount = useMemo(() => {
    if (!orderSupplier) return null;
    const orderLevelDiscount = Number(orderSupplier.discount || 0);
    if (orderLevelDiscount === 0) return null;
    const usedDiscount =
      orderSupplier.purchaseOrders?.reduce((sum, po) => {
        if (purchaseOrder && po.id === purchaseOrder.id) return sum;
        return sum + Number(po.discount || 0);
      }, 0) ?? 0;
    return orderLevelDiscount - usedDiscount;
  }, [orderSupplier, purchaseOrder]);

  useEffect(() => {
    if (purchaseOrder?.items) {
      const loadedProducts: ProductItem[] = purchaseOrder.items.map((item) => {
        const price = roundTo(Number(item.price), 3);
        const discount = Number(item.discount);
        const quantity = Number(item.quantity);
        const subTotal = Math.round(Number(item.totalPrice));
        return {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity,
          price,
          discount,
          subTotal,
          // Giữ đúng thành tiền đã lưu: nếu khác công thức (do đơn giá lẻ thập
          // phân) thì coi như thành tiền là nguồn chính.
          manualSubTotal: subTotal !== Math.round((price - discount) * quantity),
          inventory: 0,
          note: item.description,
        };
      });
      setProducts(loadedProducts);

      // Edit/xem PN đã có: PN.paidAmount đã chứa cả phần kế thừa từ PDN
      // (nếu là PN tạo từ PDN qua endpoint createFromOrderSupplier) lẫn phần
      // user trả thêm. Hiển thị nguyên giá trị này làm "đã thanh toán".
      setPreviouslyPaid(Number(purchaseOrder.paidAmount || 0));
      setPaymentAmount(0);
    } else if (copyFrom?.items) {
      // Copy từ PN khác: seed products, reset payment
      const loadedProducts: ProductItem[] = copyFrom.items.map((item) => {
        const price = roundTo(Number(item.price), 3);
        const discount = Number(item.discount);
        const quantity = Number(item.quantity);
        const subTotal = Math.round(Number(item.totalPrice));
        return {
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity,
          price,
          discount,
          subTotal,
          manualSubTotal: subTotal !== Math.round((price - discount) * quantity),
          inventory: 0,
          note: item.description,
        };
      });
      setProducts(loadedProducts);
      setPreviouslyPaid(0);
      setPaymentAmount(0);
    } else if (orderSupplier?.items) {
      const receivedQuantities: Record<number, number> = {};
      orderSupplier.purchaseOrders?.forEach((po) => {
        po.items?.forEach((item) => {
          receivedQuantities[item.productId] =
            (receivedQuantities[item.productId] || 0) + Number(item.quantity);
        });
      });

      const loadedProducts: ProductItem[] = orderSupplier.items
        .map((item) => {
          const received = receivedQuantities[item.productId] || 0;
          const remaining = Number(item.quantity) - received;
          const price = roundTo(Number(item.price), 3);
          const discount = Number(item.discount);
          return {
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: remaining,
            price,
            discount,
            subTotal: Math.round((price - discount) * remaining),
            inventory: 0,
            note: item.description,
          };
        })
        .filter((item) => item.quantity > 0);

      setProducts(loadedProducts);
      setDiscountType("amount");

      const orderLevelDiscount = Number(orderSupplier.discount || 0);
      const usedDiscount =
        orderSupplier.purchaseOrders?.reduce((sum, po) => {
          return sum + Number(po.discount || 0);
        }, 0) ?? 0;
      const remainingDiscount = orderLevelDiscount - usedDiscount;
      setDiscount(remainingDiscount > 0 ? remainingDiscount : 0);

      // Đối xứng phía bán: chỉ kế thừa số đã thanh toán khi đây là PN ĐẦU TIÊN
      // của PDN. Đã có PN active rồi → BE đã chuyển paidAmount sang PN trước,
      // PN tiếp theo tính từ 0.
      const hasActivePurchaseOrder = (orderSupplier.purchaseOrders || []).some(
        (po) => !po.isDraft && (po.status as any) !== 2
      );
      if (!hasActivePurchaseOrder) {
        setPreviouslyPaid(Number(orderSupplier.paidAmount || 0));
      } else {
        setPreviouslyPaid(0);
      }
      setPaymentAmount(0);
    }
  }, [purchaseOrder, copyFrom, orderSupplier]);

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
        discountDropdownRef.current &&
        !discountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowDiscountDropdown(false);
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
    const price = roundTo(cost, 3);

    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: qty,
      price,
      discount: 0,
      subTotal: Math.round(price * qty),
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
      const item = { ...updated[index], quantity };

      if (item.manualSubTotal) {
        // Thành tiền là nguồn chính (user đã gõ tay) → giữ nguyên thành tiền,
        // suy lại đơn giá = thành tiền / SL + giảm giá (tối đa 3 số thập phân).
        item.price =
          quantity > 0
            ? roundTo(item.subTotal / quantity + item.discount, 3)
            : 0;
      } else {
        // Đơn giá là nguồn chính → thành tiền tự tính, làm tròn về số nguyên.
        item.subTotal = Math.round((item.price - item.discount) * quantity);
      }

      updated[index] = item;
      return updated;
    });
  };

  const handlePriceChange = (index: number, price: number) => {
    if (isFormDisabled) return;

    if (price < 0) {
      toast.error("Giá không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], price: roundTo(price, 3) };
      // User chỉnh đơn giá → đơn giá thành nguồn chính, thành tiền tự tính
      // (số nguyên).
      item.manualSubTotal = false;
      item.subTotal = Math.round((item.price - item.discount) * item.quantity);
      updated[index] = item;
      return updated;
    });
  };

  const handleDiscountChange = (index: number, discount: number) => {
    if (isFormDisabled) return;

    if (discount < 0) {
      toast.error("Giảm giá không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], discount };

      if (item.manualSubTotal) {
        // Giữ thành tiền, suy lại đơn giá theo giảm giá mới.
        item.price =
          item.quantity > 0
            ? roundTo(item.subTotal / item.quantity + discount, 3)
            : 0;
      } else {
        item.subTotal = Math.round(
          (item.price - discount) * item.quantity
        );
      }

      updated[index] = item;
      return updated;
    });
  };

  // User nhập trực tiếp ô Thành tiền: chốt thành tiền là số nguyên, suy ra
  // đơn giá = thành tiền / SL + giảm giá (tối đa 3 số thập phân). Đặt cờ
  // manualSubTotal để các thay đổi SL/giảm giá sau đó vẫn giữ thành tiền.
  const handleSubTotalChange = (index: number, subTotal: number) => {
    if (isFormDisabled) return;

    if (subTotal < 0) {
      toast.error("Thành tiền không được nhỏ hơn 0");
      return;
    }

    setProducts((prev) => {
      const updated = [...prev];
      const roundedSubTotal = Math.round(subTotal);
      const item = {
        ...updated[index],
        subTotal: roundedSubTotal,
        manualSubTotal: true,
      };
      item.price =
        item.quantity > 0
          ? roundTo(roundedSubTotal / item.quantity + item.discount, 3)
          : 0;
      updated[index] = item;
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
    handleFormSubmit();
  };

  const handleComplete = async () => {
    handleFormComplete();
  };

  /**
   * Validate + build payload chung cho 2 path: lưu tạm và hoàn thành.
   * Trả về null nếu validate fail (đã toast bên trong) hoặc payload hợp lệ.
   */
  const buildSubmitPayload = (asDraft: boolean) => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh");
      return null;
    }

    if (!supplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return null;
    }

    if (products.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return null;
    }

    const hasInvalidQuantity = products.some((p) => p.quantity <= 0);
    if (hasInvalidQuantity) {
      toast.error("Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm");
      return null;
    }

    if (availableDiscount !== null && discount > availableDiscount) {
      toast.error(
        `Giảm giá không được vượt quá ${formatCurrency(availableDiscount)}`
      );
      return null;
    }

    const isCreatingFromOrderSupplier =
      !purchaseOrder?.id && !!orderSupplier?.id;

    if (isCreatingFromOrderSupplier) {
      // Endpoint từ-PDN-sang-PN: BE tự kế thừa paidAmount từ PDN.
      // FE chỉ gửi `additionalPayment` = phần user trả THÊM (paymentAmount).
      const fromOSPayload: any = {
        orderSupplierId: orderSupplier!.id,
        branchId,
        isDraft: asDraft,
        description: note,
        discount: discountType === "amount" ? Number(discount) || 0 : 0,
        discountRatio:
          discountType === "ratio" ? Number(discountRatio) || 0 : 0,
        items: products.map((p) => ({
          productId: Number(p.productId),
          productCode: p.productCode,
          productName: p.productName,
          quantity: Number(p.quantity),
          price: Number(p.price),
          discount: Number(p.discount) || 0,
          discountRatio: 0,
          // Gửi thành tiền (số nguyên) đã chốt trên form làm nguồn sự thật.
          totalPrice: Math.round(Number(p.subTotal)),
          description: p.note,
        })),
        additionalPayment: paymentAmount > 0 ? Number(paymentAmount) : 0,
        payments:
          paymentAmount > 0
            ? [{ method: paymentMethod, amount: Number(paymentAmount) }]
            : [],
        purchaseById: purchaseById || undefined,
      };
      if (code.trim()) {
        fromOSPayload.code = code.trim();
      }
      return { kind: "from-os" as const, payload: fromOSPayload };
    }

    const standardPayload: any = {
      supplierId,
      branchId,
      isDraft: asDraft,
      description: note,
      discount: discountType === "amount" ? Number(discount) || 0 : 0,
      discountRatio: discountType === "ratio" ? Number(discountRatio) || 0 : 0,
      items: products.map((p) => ({
        productId: Number(p.productId),
        quantity: Number(p.quantity),
        price: Number(p.price),
        discount: Number(p.discount) || 0,
        // Gửi thành tiền (số nguyên) đã chốt trên form. BE lưu thẳng giá trị
        // này thay vì recompute từ đơn giá (tránh lệch do đơn giá 3 số thập phân).
        totalPrice: Math.round(Number(p.subTotal)),
        description: p.note,
      })),
      paidAmount: paymentAmount > 0 ? Number(paymentAmount) : 0,
      purchaseById: purchaseById || undefined,
    };
    if (code.trim()) {
      standardPayload.code = code.trim();
    }
    return { kind: "standard" as const, payload: standardPayload };
  };

  const handleFormSubmit = async () => {
    const built = buildSubmitPayload(true);
    if (!built) return;

    try {
      if (purchaseOrder?.id) {
        await updatePurchaseOrder.mutateAsync({
          id: purchaseOrder.id,
          data: built.payload,
        });
        toast.success("Cập nhật phiếu nhập hàng thành công");
      } else if (built.kind === "from-os") {
        await createPurchaseOrderFromOrderSupplier.mutateAsync(built.payload);
      } else {
        await createPurchaseOrder.mutateAsync(built.payload);
        toast.success("Tạo phiếu nhập hàng thành công");
      }

      router.push("/san-pham/nhap-hang");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  const handleFormComplete = async () => {
    const built = buildSubmitPayload(false);
    if (!built) return;

    try {
      if (purchaseOrder?.id) {
        await updatePurchaseOrder.mutateAsync({
          id: purchaseOrder.id,
          data: built.payload,
        });
        toast.success("Cập nhật phiếu nhập hàng thành công");
      } else if (built.kind === "from-os") {
        await createPurchaseOrderFromOrderSupplier.mutateAsync(built.payload);
      } else {
        await createPurchaseOrder.mutateAsync(built.payload);
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
                          value={formatCurrency(item.quantity)}
                          onChange={(e) => {
                            const numericValue = parseFormattedNumber(
                              e.target.value
                            );
                            handleQuantityChange(
                              index,
                              numericValue.toString()
                            );
                          }}
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
                      <NumericInput
                        value={item.price}
                        onValueChange={(v) => handlePriceChange(index, v)}
                        maxFractionDigits={3}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <NumericInput
                        value={item.discount}
                        onValueChange={(v) => handleDiscountChange(index, v)}
                        maxFractionDigits={0}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <NumericInput
                        value={item.subTotal}
                        onValueChange={(v) => handleSubTotalChange(index, v)}
                        maxFractionDigits={0}
                        disabled={isFormDisabled ? true : false}
                        className="w-full text-right border rounded px-2 py-1 text-sm font-medium disabled:bg-gray-100"
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
          <h3 className="font-semibold text-gray-900">Thông tin nhập hàng</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <div className="text-md text-gray-600 whitespace-nowrap">
                Mã phiếu nhập:
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: PN000123 (để trống = tự sinh)"
                maxLength={50}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100"
                disabled={!!isFormDisabled}
              />
            </div>
            <p className="text-xs text-gray-500">
              Bạn có thể tự nhập mã. Để trống, hệ thống sẽ tự sinh mã PN######.
            </p>
          </div>

          {purchaseOrder?.orderSupplier?.code && (
            <div className="flex gap-2">
              <div className="block text-md text-gray-600">
                Mã đặt hàng nhập:
              </div>
              <span>{purchaseOrder?.orderSupplier?.code}</span>
            </div>
          )}

          <div ref={userDropdownRef} className="flex gap-2 items-center">
            <div className="text-md text-gray-600">Người nhập hàng:</div>
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
                      setPurchaseById(0);
                      setShowUserDropdown(false);
                    }}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-400">
                    Không chọn
                  </div>
                  {users?.map((user: any) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setPurchaseById(user.id);
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

          <div ref={statusDropdownRef} className="flex gap-2">
            <div className="text-md text-gray-600">Trạng thái:</div>
            <span>{selectedStatus ? selectedStatus.label : "Phiếu tạm"}</span>
          </div>

          <div ref={branchDropdownRef} className="flex gap-2 items-center">
            <div className="text-md text-gray-600">Kho: </div>
            <div className="relative w-40">
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
                  {activeBranches?.map((branch) => (
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

          <div ref={supplierDropdownRef} className="flex gap-2 items-center">
            <div className="block text-md text-gray-600">Nhà cung cấp:</div>
            <div className="relative w-64">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled &&
                  setShowSupplierDropdown(!showSupplierDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-2 py-1.5 text-sm border rounded flex items-center justify-between disabled:bg-gray-100 hover:bg-gray-50">
                <span className="truncate">
                  {selectedSupplier
                    ? selectedSupplier.name
                    : "Chọn nhà cung cấp"}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              </button>

              {showSupplierDropdown && !isFormDisabled && (
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
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => {
                            setSupplierId(supplier.id);
                            setShowSupplierDropdown(false);
                            setSupplierSearch("");
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                          {supplier.name}
                        </button>
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
              <div className="text-md text-gray-600">Tổng tiền hàng:</div>
              <div className="text-md">
                {formatCurrency(
                  products.reduce((sum, p) => sum + p.subTotal, 0)
                )}
              </div>
            </div>
            <div ref={discountDropdownRef} className="flex gap-2 items-center">
              <div className="text-md text-gray-600">Giảm giá:</div>
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
                      const value = parseFormattedNumber(e.target.value);
                      if (
                        availableDiscount !== null &&
                        value > availableDiscount
                      ) {
                        toast.error(
                          `Giảm giá không được vượt quá ${formatCurrency(availableDiscount)}`
                        );
                        setDiscount(availableDiscount);
                        return;
                      }
                      setDiscount(value);
                    } else {
                      const value = parseFloat(e.target.value) || 0;
                      if (availableDiscount !== null) {
                        const subtotal = products.reduce(
                          (sum, p) => sum + p.subTotal,
                          0
                        );
                        const discountByRatio = (subtotal * value) / 100;
                        if (discountByRatio > availableDiscount) {
                          toast.error(
                            `Giảm giá không được vượt quá ${formatCurrency(availableDiscount)}`
                          );
                          return;
                        }
                      }
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
            <div className="block text-md text-gray-600 mb-1">
              Cần trả nhà cung cấp:
            </div>
            <div className="text-md">{formatCurrency(calculateTotal())}</div>
          </div>

          {previouslyPaid > 0 && (
            <>
              <div className="flex gap-2">
                <div className="block text-md text-gray-600">
                  {purchaseOrder
                    ? "Đã thanh toán:"
                    : "Đã thanh toán ở phiếu đặt hàng:"}
                </div>
                <div className="text-md font-medium text-green-600">
                  {formatCurrency(previouslyPaid)}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="block text-md text-gray-600">
                  Còn cần trả thêm:
                </div>
                <div className="text-md font-semibold">
                  {formatCurrency(
                    Math.max(0, calculateTotal() - previouslyPaid)
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 items-center">
            <div className="text-md text-gray-600">
              {previouslyPaid > 0
                ? "Trả thêm nhà cung cấp:"
                : "Tiền trả nhà cung cấp:"}
            </div>
            <div className="flex gap-2 items-center">
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

          <div className="flex gap-2">
            <label className="text-md text-gray-600">
              Tiền nhà cung cấp trả lại:
            </label>
            <div className="">
              {formatCurrency(
                Math.max(0, paymentAmount + previouslyPaid - calculateTotal())
              )}
            </div>
          </div>

          <div>
            <label className="block text-md text-gray-600 mb-1">Ghi chú:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              maxLength={1000}
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
            className="w-full py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 font-medium">
            Lưu tạm
          </button>
        </div>
      </div>

      <SupplierPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={calculateTotal()}
        previouslyPaid={previouslyPaid}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
