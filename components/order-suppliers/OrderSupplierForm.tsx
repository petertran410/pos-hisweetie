"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { useCan } from "@/lib/hooks/useCan";
import { useLatestSupplierPrices } from "@/lib/hooks/useLatestSupplierPrices";
import {
  useExchangeRate,
  useRefreshExchangeRate,
} from "@/lib/hooks/useExchangeRate";
import { ExchangeRateIndicator } from "@/components/exchange-rates/ExchangeRateIndicator";

// ID nhóm nhà cung cấp "nước ngoài". Theo yêu cầu của hệ thống: NCC thuộc
// nhóm id = 1 → được phép nhập Đơn giá NM / Thành tiền NM bằng ngoại tệ
// (hiện tại chỉ hỗ trợ CNY). NCC không thuộc nhóm này → 2 cột ẩn, dùng
// mặc định VND.
const IMPORT_SUPPLIER_GROUP_ID = 1;
// Mã tiền tệ mặc định khi chưa có nhóm nước ngoài.
const DEFAULT_CURRENCY = "VND";
const DEFAULT_EXCHANGE_RATE = 1;

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
  withTime = false,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
  minDate?: string;
  withTime?: boolean;
}) {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const todayObj = new Date();
  const init = value
    ? new Date(value.includes("T") ? value : value + "T00:00:00")
    : todayObj;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());
  const [hh, setHh] = useState<string>(pad2(init.getHours()));
  const [mm, setMm] = useState<string>(pad2(init.getMinutes()));

  // Phần ngày đang chọn (YYYY-MM-DD) tách từ value
  const selDatePart = value ? value.slice(0, 10) : "";

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

  // Phát giá trị ra ngoài: kèm giờ nếu withTime
  const emit = (dateStr: string) => {
    if (!dateStr) {
      onChange("");
      return;
    }
    onChange(withTime ? `${dateStr}T${hh}:${mm}` : dateStr);
  };

  const handleTimeChange = (nextHh: string, nextMm: string) => {
    setHh(nextHh);
    setMm(nextMm);
    const base = selDatePart || fmt(todayObj.getDate());
    onChange(`${base}T${nextHh}:${nextMm}`);
  };

  const clampHour = (v: string) => {
    const n = Math.max(0, Math.min(23, parseInt(v || "0", 10) || 0));
    return pad2(n);
  };
  const clampMinute = (v: string) => {
    const n = Math.max(0, Math.min(59, parseInt(v || "0", 10) || 0));
    return pad2(n);
  };

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
          const isSel = selDatePart === ds;
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
                emit(ds);
                if (!withTime) onClose();
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

      {/* Time picker */}
      {withTime && (
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Giờ:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={hh}
            onChange={(e) => setHh(e.target.value)}
            onBlur={(e) => handleTimeChange(clampHour(e.target.value), mm)}
            className="w-14 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <span className="text-gray-400 font-semibold">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={mm}
            onChange={(e) => setMm(e.target.value)}
            onBlur={(e) => handleTimeChange(hh, clampMinute(e.target.value))}
            className="w-14 text-center border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      )}

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
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const ds = `${now.getFullYear()}-${pad2(
                now.getMonth() + 1
              )}-${pad2(now.getDate())}`;
              if (withTime) {
                const nh = pad2(now.getHours());
                const nm = pad2(now.getMinutes());
                setHh(nh);
                setMm(nm);
                onChange(`${ds}T${nh}:${nm}`);
              } else {
                onChange(ds);
              }
              onClose();
            }}
            className="text-xs text-brand hover:text-brand-dark font-medium px-2 py-1 rounded hover:bg-brand-soft transition-colors">
            {withTime ? "Bây giờ" : "Hôm nay"}
          </button>
          {withTime && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-white bg-brand hover:bg-brand-dark font-medium px-3 py-1 rounded transition-colors">
              Xong
            </button>
          )}
        </div>
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
  // Cần `includeSupplierGroup: true` để dropdown NCC trả về
  // `supplierGroupDetails` — nếu thiếu, `selectedSupplier` ở dưới sẽ không
  // có thông tin nhóm nước ngoài → form không hiển thị 3 cột "Đơn giá NM" /
  // "Thành tiền NM" / "Tỉ giá" dù NCC đó thực sự thuộc nhóm id=1.
  const { data: suppliersData } = useSuppliers({
    name: debouncedSupplierSearch || undefined,
    pageSize: 50,
    currentItem: 0,
    includeSupplierGroup: true,
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
  const canViewSalePrice = useCan("order_suppliers", "view_price");
  const canViewFactoryPrice = useCan("order_suppliers", "view_factory_price");

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

  // ─── Tiền tệ & tỉ giá ────────────────────────────────────────────────────
  // Snapshot tỉ giá tại thời điểm tạo phiếu (lưu vào OrderSupplier.currency /
  // OrderSupplier.exchangeRate). Nếu không có sẵn → mặc định VND + 1.
  // Khi chọn NCC thuộc nhóm nước ngoài sẽ tự động fetch tỉ giá mới nhất.
  const [currency, setCurrency] = useState<"VND" | "CNY">(
    (orderSupplier?.currency as "VND" | "CNY" | undefined) || DEFAULT_CURRENCY
  );
  const [exchangeRate, setExchangeRate] = useState<number>(
    orderSupplier?.exchangeRate != null
      ? Number(orderSupplier.exchangeRate)
      : DEFAULT_EXCHANGE_RATE
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
  // LUÔN fetch detail NCC khi user chọn (bỏ qua cache từ dropdown list).
  // Lý do: dù `useSuppliers` của dropdown đã truyền `includeSupplierGroup:
  // true`, React Query cache có thể chứa query cũ từ session trước/page khác
  // thiếu field `supplierGroupDetails`. Nếu dùng cache cũ, `isImportSupplier`
  // luôn false → form không hiển thị 3 cột NM. `useSupplier(supplierId)`
  // gọi `findOne` — BE findOne luôn include group đầy đủ, nên đây là nguồn
  // đáng tin duy nhất.
  const { data: selectedSupplier } = useSupplier(supplierId || undefined);

  // NCC nước ngoài = có ít nhất 1 supplierGroupDetails.supplierGroupId === 1.
  // Khi đó mới hiển thị 2 cột "Đơn giá NM" / "Thành tiền NM" và cho phép
  // nhập tỉ giá.
  const isImportSupplier = useMemo(() => {
    return (
      selectedSupplier?.supplierGroupDetails?.some(
        (d) => d.supplierGroupId === IMPORT_SUPPLIER_GROUP_ID
      ) ?? false
    );
  }, [selectedSupplier]);

  // Phiếu đã có phiếu nhập hàng (PurchaseOrder) liên quan chưa? Nếu rồi thì
  // KHÔNG cho phép refresh tỉ giá (đã snapshot xuống PN, đổi sẽ lệch dữ liệu).
  const hasLinkedPurchaseOrder = useMemo(() => {
    return (
      orderSupplier?.purchaseOrders != null &&
      orderSupplier.purchaseOrders.length > 0
    );
  }, [orderSupplier]);

  // ─── Tỉ giá: chỉ gọi live khi chưa có snapshot trên phiếu ──────────────
  // - Phiếu MỚI (orderSupplier = null) + NCC nước ngoài: gọi live, cho refresh
  // - Phiếu CŨ (orderSupplier != null) + currency=CNY: KHÔNG gọi live; dùng
  //   snapshot từ DB. Vẫn cho refresh nếu chưa có PN liên quan.
  const isLiveRateNeeded = isImportSupplier;
  const liveRateQuery = useExchangeRate("CNY", "VND");
  // Khi là phiếu cũ có currency=CNY, KHÔNG lấy rate từ live query mà dùng
  // snapshot exchangeRate. Ngược lại: phiếu mới + NCC nước ngoài → dùng live.
  const effectiveRate = useMemo(() => {
    if (orderSupplier?.currency === "CNY" && orderSupplier?.exchangeRate) {
      // Snapshot từ DB — ưu tiên.
      return Number(orderSupplier.exchangeRate);
    }
    if (isImportSupplier && liveRateQuery.data) {
      return liveRateQuery.data.rate;
    }
    return exchangeRate;
  }, [
    orderSupplier,
    isImportSupplier,
    liveRateQuery.data,
    exchangeRate,
  ]);

  // Effect: khi user chọn NCC thuộc nhóm nước ngoài ở phiếu MỚI, tự động
  // set currency=CNY + lấy tỉ giá mới nhất. Khi chuyển sang NCC trong nước
  // thì reset về VND.
  useEffect(() => {
    // Chỉ áp dụng auto-set khi đang TẠO MỚI (không có orderSupplier).
    if (orderSupplier) return;
    if (isImportSupplier) {
      setCurrency("CNY");
      // Lấy rate từ live query (nếu đã có) hoặc giữ nguyên default 1
      // (sẽ tự cập nhật khi live query trả data).
      if (liveRateQuery.data?.rate) {
        setExchangeRate(liveRateQuery.data.rate);
      }
    } else {
      setCurrency("VND");
      setExchangeRate(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImportSupplier, orderSupplier]);

  // Effect phụ: khi live rate load xong (sau khi chọn NCC nước ngoài lần
  // đầu) → cập nhật exchangeRate state.
  useEffect(() => {
    if (
      !orderSupplier &&
      isImportSupplier &&
      liveRateQuery.data?.rate &&
      exchangeRate !== liveRateQuery.data.rate
    ) {
      setExchangeRate(liveRateQuery.data.rate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRateQuery.data]);

  // ─── Auto-load giá nhập gần nhất theo nhà cung cấp ──────────────────────────
  // Chạy cho MỌI user (kể cả user không có quyền xem giá): giá là "nền" để tính
  // subTotal và lưu phiếu. Tầng render cột mới ẩn theo canViewSalePrice.
  const productIds = useMemo(
    () => products.map((p) => p.productId),
    [products]
  );
  const { pricesByProduct: supplierPrices, isLoading: isLoadingSupplierPrices } =
    useLatestSupplierPrices(
      supplierId || undefined,
      productIds,
      branchId || undefined
    );
  // NCC trước đó — init = NCC của phiếu đang sửa để mount KHÔNG ghi đè giá đã lưu.
  const prevSupplierRef = useRef<number>(orderSupplier?.supplierId || 0);
  // Tập productId cần áp giá NCC (thêm SP mới khi đã có NCC, hoặc đổi NCC).
  const pendingPriceRef = useRef<Set<number>>(new Set());

  // Đổi NCC (user-initiated) → đánh dấu áp giá lại TOÀN BỘ dòng theo NCC mới.
  useEffect(() => {
    if (prevSupplierRef.current === supplierId) return;
    prevSupplierRef.current = supplierId;
    if (!supplierId) return;
    products.forEach((p) => pendingPriceRef.current.add(p.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId]);

  // Khi đã có giá NCC trả về → ghi đè price cho các dòng đang chờ.
  useEffect(() => {
    if (isLoadingSupplierPrices || pendingPriceRef.current.size === 0) return;
    setProducts((prev) => {
      let changed = false;
      const next = prev.map((p) => {
        if (!pendingPriceRef.current.has(p.productId)) return p;
        const lp = supplierPrices[p.productId];
        pendingPriceRef.current.delete(p.productId);
        // Không có lịch sử với NCC này → giữ nguyên giá vốn đang có.
        if (lp == null) return p;
        changed = true;
        return {
          ...p,
          price: lp,
          subTotal: (lp - p.discount) * p.quantity,
        };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierPrices, isLoadingSupplierPrices]);


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
          // Coi như nhập tay nếu giá trị lưu khác công thức auto
          // (Đơn giá NM × SL). factorySubTotal cùng đơn vị CNY với
          // factoryPrice, không liên quan tỉ giá.
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

    // Đã chọn NCC từ trước → đánh dấu áp giá nhập gần nhất theo NCC cho SP này
    // (effect sẽ ghi đè khi data về; giá vốn ở trên chỉ là fallback). Chạy cho
    // mọi user để subTotal nền luôn đúng dù không hiển thị cột giá.
    if (supplierId) {
      pendingPriceRef.current.add(product.id);
    }
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
        // Thành tiền NM = Đơn giá NM × SL (CÙNG đơn vị CNY, không nhân tỉ giá).
        // Tỉ giá chỉ dùng để hiển thị "Tổng tiền hàng (CNY)" ở panel bên phải.
        updated[index].factorySubTotal =
          updated[index].factoryPrice * quantity;
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
      // Khi user sửa Đơn giá NM (CNY) → coi như user đang điều khiển dòng
      // này từ "đầu vào". Reset manual flag + tự tính lại Thành tiền NM.
      // Logic 2-chiều: nếu trước đó user đã nhập tay Thành tiền NM, lần sửa
      // Đơn giá này sẽ override → Thành tiền NM = Đơn giá × SL (cùng CNY).
      updated[index].factorySubTotalManual = false;
      updated[index].factorySubTotal = factoryPrice * updated[index].quantity;
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
      // Đánh dấu user nhập tay → handler khác (handleQuantityChange,
      // handleFactoryPriceChange) sẽ KHÔNG override giá trị này.
      updated[index].factorySubTotalManual = true;
      // Logic 2-chiều: Thành tiền NM và Đơn giá NM CÙNG đơn vị CNY, nên
      // tính ngược Đơn giá = Thành tiền / SL (không cần tỉ giá).
      if (updated[index].quantity > 0) {
        updated[index].factoryPrice =
          factorySubTotal / updated[index].quantity;
      }
      return updated;
    });
  };

  /**
   * User ấn nút "Cập nhật tỉ giá" trên form. Cập nhật tỉ giá mới nhất từ
   * API + tự tính lại factorySubTotal cho tất cả các dòng KHÔNG manual
   * (giữ nguyên giá trị user đã nhập tay).
   *
   * Đây là entry point duy nhất để đổi tỉ giá khi phiếu đang edit (chưa có
   * PN liên quan). Sau khi gọi, exchangeRate state cập nhật → các dòng
   * auto-calc sẽ tự nhảy số.
   */
  const refreshExchangeRateMutation = useRefreshExchangeRate();
  const handleRefreshExchangeRate = () => {
    if (hasLinkedPurchaseOrder) {
      toast.error(
        "Phiếu đã có phiếu nhập hàng liên quan. Không thể cập nhật lại tỉ giá.",
      );
      return;
    }
    refreshExchangeRateMutation.mutate(
      { base: "CNY", target: "VND" },
      {
        onSuccess: (data) => {
          setExchangeRate(data.rate);
          // Cập nhật lại factorySubTotal cho các dòng KHÔNG manual. Vì
          // factorySubTotal cùng đơn vị CNY với factoryPrice, KHÔNG nhân
          // tỉ giá — chỉ cần đảm bảo công thức factoryPrice × SL đúng.
          setProducts((prev) =>
            prev.map((p) => {
              if (p.factorySubTotalManual) return p;
              return {
                ...p,
                factorySubTotal: (p.factoryPrice || 0) * (p.quantity || 0),
              };
            }),
          );
        },
      },
    );
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
      // Tiền tệ & tỉ giá áp dụng cho phiếu. Chỉ thực sự có ý nghĩa khi NCC
      // thuộc nhóm nước ngoài; với NCC trong nước sẽ là VND + 1 (mặc định).
      currency,
      exchangeRate,
      items: products.map((p) => {
        const priceNum = Number(p.price);
        const item: any = {
          productId: Number(p.productId),
          quantity: Number(p.quantity),
          discount: Number(p.discount) || 0,
          factoryPrice: Number(p.factoryPrice) || null,
          factorySubTotal: Number(p.factorySubTotal) || null,
          description: p.note,
        };
        // Chỉ gửi price khi là số hợp lệ. Nếu user không có quyền xem giá vốn
        // thì cost bị strip ở backend → price = NaN; bỏ qua để backend tự
        // resolve giá vốn hiện tại của sản phẩm theo chi nhánh.
        if (Number.isFinite(priceNum)) {
          item.price = priceNum;
        }
        return item;
      }),
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
        <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/san-pham/dat-hang-nhap")}
            className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold shrink-0">
            {orderSupplier ? "Cập nhật đặt hàng nhập" : "Tạo đặt hàng nhập"}
          </h2>
          <div className="flex-1 max-w-xl">
            <ProductPickerDropdown
              branchId={branchId}
              disabled={!!isFormDisabled}
              onAddProduct={handleAddProduct}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider w-12">
                    STT
                  </th>
                  <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider">
                    Mã hàng
                  </th>
                  <th className="px-[10px] py-2 text-left text-sm font-semibold text-gray-700 tracking-wider min-w-[220px]">
                    Tên hàng
                  </th>
                  <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider w-[140px]">
                    SL đặt
                  </th>
                  {canViewSalePrice && (
                    <>
                      <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider w-[120px]">
                        Giá nhập
                      </th>
                      <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider w-[110px]">
                        Giảm giá
                      </th>
                      <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider w-[140px]">
                        Thành tiền
                      </th>
                    </>
                  )}
                  {canViewFactoryPrice && isImportSupplier && (
                    <>
                      <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider w-[120px]">
                        {`Đơn giá NM${currency === "CNY" ? " (¥)" : ""}`}
                      </th>
                      <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider w-[140px]">
                        {`Thành tiền NM (¥)`}
                      </th>
                      <th className="px-[10px] py-2 text-right text-sm font-semibold text-gray-700 tracking-wider w-[120px]">
                        Tỉ giá
                      </th>
                    </>
                  )}
                  <th className="px-[10px] py-2 text-center text-sm font-semibold text-gray-700 tracking-wider w-12">
                    Xóa
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors">
                    <td className="px-[10px] py-2 align-middle text-center text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-[10px] py-2 align-middle text-sm font-medium text-gray-900">
                      {item.productCode}
                    </td>
                    <td className="px-[10px] py-2 align-middle text-sm text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-[10px] py-2 align-middle whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
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
                            const numericValue = parseNumberInput(
                              e.target.value
                            );
                            handleQuantityChange(
                              index,
                              numericValue.toString()
                            );
                          }}
                          disabled={isFormDisabled ? true : false}
                          className="w-16 text-center border rounded px-2 py-1 text-sm disabled:bg-gray-100"
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
                    {canViewSalePrice && (
                      <>
                        <td className="px-[10px] py-2 align-middle">
                          <input
                            type="text"
                            value={formatCurrency(item.price)}
                            onChange={(e) => {
                              const numericValue = parseNumberInput(
                                e.target.value
                              );
                              handlePriceChange(index, numericValue.toString());
                            }}
                            disabled={isFormDisabled ? true : false}
                            className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-[10px] py-2 align-middle">
                          <input
                            type="text"
                            value={formatCurrency(item.discount)}
                            onChange={(e) => {
                              const numericValue = parseNumberInput(
                                e.target.value
                              );
                              handleDiscountChange(
                                index,
                                numericValue.toString()
                              );
                            }}
                            disabled={isFormDisabled ? true : false}
                            className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-[10px] py-2 align-middle text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                          {formatCurrency(item.subTotal)}
                        </td>
                      </>
                    )}
                    {canViewFactoryPrice && isImportSupplier && (
                      <>
                        <td className="px-[10px] py-2 align-middle">
                          <input
                            type="text"
                            value={formatCurrency(item.factoryPrice)}
                            onChange={(e) => {
                              const numericValue = parseNumberInput(
                                e.target.value
                              );
                              handleFactoryPriceChange(
                                index,
                                numericValue.toString()
                              );
                            }}
                            disabled={isFormDisabled ? true : false}
                            className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-[10px] py-2 align-middle">
                          <input
                            type="text"
                            value={formatCurrency(item.factorySubTotal)}
                            onChange={(e) => {
                              const numericValue = parseNumberInput(
                                e.target.value
                              );
                              handleFactorySubTotalChange(
                                index,
                                numericValue.toString()
                              );
                            }}
                            disabled={isFormDisabled ? true : false}
                            className="w-full text-right border rounded px-2 py-1 text-sm disabled:bg-gray-100"
                          />
                        </td>
                        <td className="px-[10px] py-2 align-middle text-right text-xs whitespace-nowrap">
                          <span className="text-gray-600">
                            1 {currency} ={" "}
                            <strong className="text-gray-900">
                              {new Intl.NumberFormat("vi-VN", {
                                maximumFractionDigits: 2,
                              }).format(effectiveRate)}
                            </strong>{" "}
                            VND
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-[10px] py-2 align-middle text-center">
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
          {/* Hàng trên cùng: Người đặt + Ngày — giống KiotViet */}
          <div className="flex gap-2">
            <div ref={userDropdownRef} className="relative flex-1">
              <button
                type="button"
                onClick={() =>
                  !isFormDisabled && setShowUserDropdown(!showUserDropdown)
                }
                disabled={isFormDisabled ? true : false}
                className="w-full px-3 py-2 text-sm border rounded-lg flex items-center justify-between disabled:bg-gray-100">
                <span
                  className={`truncate ${!selectedUser ? "text-gray-400" : ""}`}>
                  {selectedUser ? selectedUser.name : "Người đặt hàng"}
                </span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
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

            <div ref={orderDateRef} className="relative flex-1">
              {(() => {
                const pad2 = (n: number) => String(n).padStart(2, "0");
                const orderDateStr = orderDate
                  ? `${orderDate.getFullYear()}-${pad2(
                      orderDate.getMonth() + 1
                    )}-${pad2(orderDate.getDate())}T${pad2(
                      orderDate.getHours()
                    )}:${pad2(orderDate.getMinutes())}`
                  : "";
                const displayLabel = orderDate
                  ? orderDate.toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Ngày đặt hàng";

                return (
                  <>
                    <button
                      type="button"
                      disabled={isFormDisabled ? true : false}
                      onClick={() =>
                        !isFormDisabled && setShowOrderDateCalendar((v) => !v)
                      }
                      className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        orderDate
                          ? "border-brand bg-brand-soft text-gray-800"
                          : "border-gray-200 text-gray-500"
                      } ${
                        showOrderDateCalendar
                          ? "ring-2 ring-brand-soft border-brand"
                          : "hover:border-gray-300"
                      }`}>
                      <span className="truncate">{displayLabel}</span>
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                    {showOrderDateCalendar && (
                      <MiniCalendar
                        withTime
                        value={orderDateStr}
                        onChange={(d) =>
                          setOrderDate(d ? new Date(d) : null)
                        }
                        onClose={() => setShowOrderDateCalendar(false)}
                      />
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Nhà cung cấp — đưa lên đầu giống KiotViet */}
          <div ref={supplierDropdownRef} className="relative">
            <button
              type="button"
              onClick={() =>
                !isFormDisabled &&
                setShowSupplierDropdown(!showSupplierDropdown)
              }
              disabled={isFormDisabled ? true : false}
              className="w-full px-3 py-2 text-sm border rounded-lg flex items-center justify-between disabled:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-brand">
              <span
                className={`truncate ${!selectedSupplier ? "text-gray-400" : ""}`}>
                {selectedSupplier ? selectedSupplier.name : "Tìm nhà cung cấp"}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />
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

          {/* Nợ hiện tại NCC — 1 dòng text nhỏ in nghiêng */}
          {selectedSupplier && (
            <p className="text-xs italic text-gray-500 -mt-1">
              Nợ hiện tại:{" "}
              <span className="text-red-600 font-medium not-italic">
                {formatCurrency(Number(selectedSupplier.debt) || 0)}
              </span>
            </p>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex gap-2 items-center">
              <label className="text-md text-gray-600 whitespace-nowrap">
                Mã đặt hàng nhập:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder=""
                maxLength={50}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100"
                disabled={!!isFormDisabled}
              />
            </div>
            <p className="text-xs text-gray-500">
              Bạn có thể tự nhập mã. Để trống, hệ thống sẽ tự sinh mã PDN######.
            </p>
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

          {canViewSalePrice && (
            <>
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
            {/* Tổng tiền hàng theo tiền tệ (chỉ hiện khi NCC nước ngoài).
                Vì Đơn giá NM và Thành tiền NM đều tính bằng CNY (không nhân
                tỉ giá), nên hiển thị 2 dòng:
                  - Tổng CNY: tổng factorySubTotal (đã = CNY thuần)
                  - Tổng VND (quy đổi): tổng CNY × tỉ giá (chỉ tham khảo,
                    không dùng để ghi nhận công nợ — đó là VND "Cần trả NCC"
                    ở dưới, dùng cột "Thành tiền" VND). */}
            {isImportSupplier && (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="block text-md text-gray-600">
                    Tổng tiền hàng (CNY):
                  </div>
                  <div className="font-medium text-gray-900">
                    {new Intl.NumberFormat("vi-VN", {
                      maximumFractionDigits: 2,
                    }).format(
                      products.reduce(
                        (sum, p) => sum + (p.factorySubTotal || 0),
                        0
                      )
                    )}{" "}
                    CNY
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="block text-md text-gray-600">
                    Tổng quy đổi (VND):
                  </div>
                  <div className="font-medium text-gray-700 text-sm">
                    {formatCurrency(
                      products.reduce(
                        (sum, p) => sum + (p.factorySubTotal || 0),
                        0
                      ) * (effectiveRate || 1)
                    )}
                  </div>
                </div>
                {orderSupplier != null && (
                  // Phiếu CŨ: hiển thị tỉ giá snapshot từ DB. Cho refresh nếu
                  // chưa có PN liên quan.
                  <ExchangeRateIndicator
                    base={currency}
                    target="VND"
                    rate={
                      orderSupplier?.currency === "CNY" ? effectiveRate : null
                    }
                    fetchedAt={orderSupplier?.createdAt}
                    allowRefresh={!hasLinkedPurchaseOrder && !isFormDisabled}
                    onRefresh={handleRefreshExchangeRate}
                  />
                )}
                {!orderSupplier && (
                  // Phiếu MỚI: hiển thị live rate từ BE + cho refresh
                  <ExchangeRateIndicator
                    base="CNY"
                    target="VND"
                    allowRefresh={!isFormDisabled}
                    onRefresh={handleRefreshExchangeRate}
                  />
                )}
              </div>
            )}
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
            </>
          )}

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
            className="w-full bg-brand text-white py-2.5 rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center gap-2">
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
