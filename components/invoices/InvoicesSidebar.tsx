// components/invoices/InvoicesSidebar.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { useMisaEmployees } from "@/lib/hooks/useMisa";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown, X, Check, AlertTriangle } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import {
  TimeRangeFilter,
  rangeToIso,
  type TimeRangeState,
} from "@/components/shared/TimeRangeFilter";

interface InvoicesSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  /** Hiện filter "Nhân viên phụ trách" (Misa) — chỉ dùng cho trang hóa đơn VAT */
  showMisaEmployeeFilter?: boolean;
  /**
   * Tách filter thời gian thành 2 bộ độc lập:
   * - "Thời gian mua hàng" → purchaseDate (fromPurchaseDate/toPurchaseDate)
   * - "Thời gian tạo" → createdAt (fromCreatedDate/toCreatedDate)
   * Chỉ dùng cho trang hóa đơn thường. Mặc định false (giữ hành vi cũ).
   */
  splitTimeFilters?: boolean;
  /** Hiện toggle "Chỉ HĐ cảnh báo lệch giá" — chỉ dùng cho trang hóa đơn thường */
  showPriceWarningFilter?: boolean;
  /** Hiện filter "Thời gian cập nhật" (updatedAt) — chỉ dùng cho trang hóa đơn VAT */
  showUpdatedTimeFilter?: boolean;
}

const STATUS_OPTIONS = [
  {
    value: "3",
    label: "Đang xử lý",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    value: "5",
    label: "Đóng hàng",
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-400",
  },
  {
    value: "6",
    label: "Đang giao hàng",
    color: "bg-purple-100 text-purple-700",
    dot: "bg-purple-400",
  },
  {
    value: "7",
    label: "Giao thành công",
    color: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  {
    value: "1",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "8",
    label: "Trả hàng",
    color: "bg-pink-100 text-pink-700",
    dot: "bg-pink-400",
  },
  {
    value: "2",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

// Mặc định khi user CHƯA chọn trạng thái và CHƯA lưu vào localStorage:
// hiển thị toàn bộ trạng thái TRỪ "Trả hàng" (8) và "Đã hủy" (2).
const DEFAULT_STATUSES = STATUS_OPTIONS.filter(
  (o) => o.value !== "8" && o.value !== "2"
).map((o) => o.value);

const DELIVERY_STATUS_OPTIONS = [
  {
    value: "none",
    label: "Chưa có giao hàng",
    color: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
  {
    value: "pending",
    label: "Chưa giao",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: "delivered",
    label: "Đã giao",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
];

// ─── StatusDropdown (dùng cho cả "Trạng thái HĐ" và "Trạng thái giao hàng") ──
interface DropdownOption {
  value: string;
  label: string;
  color: string;
  dot: string;
}
function StatusDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: DropdownOption[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-2 min-w-0">
          {selected ? (
            <>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${selected.dot}`}
              />
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${selected.color}`}>
                {selected.label}
              </span>
            </>
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(value === opt.value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                value === opt.value ? "bg-brand-soft" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
              />
              <span
                className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MultiStatusDropdown ─────────────────────────────────────────────────────
function MultiStatusDropdown({
  options,
  values,
  placeholder,
  onChange,
}: {
  options: DropdownOption[];
  values: string[];
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selectedOptions = options.filter((o) => values.includes(o.value));
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((s) => (
              <span
                key={s.value}
                className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${s.color}`}>
                {s.label}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {options.map((opt, idx) => {
            const isSelected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(
                    isSelected
                      ? values.filter((v) => v !== opt.value)
                      : [...values, opt.value]
                  );
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors ${
                  isSelected ? "bg-brand-soft" : "hover:bg-gray-50"
                } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
                />
                <span
                  className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                  {opt.label}
                </span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SimpleDropdown ──────────────────────────────────────────────────────────
interface SimpleOption {
  value: string;
  label: string;
}
function SimpleDropdown({
  options,
  value,
  placeholder,
  onChange,
}: {
  options: SimpleOption[];
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((p) => !p)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-2 py-1 text-sm cursor-pointer transition-colors select-none ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "hover:border-gray-400"
        } bg-white`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-gray-300 hover:text-gray-500 p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && options.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value === value ? "" : opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function InvoicesSidebar({
  onFiltersChange,
  showMisaEmployeeFilter = false,
  splitTimeFilters = false,
  showPriceWarningFilter = false,
  showUpdatedTimeFilter = false,
}: InvoicesSidebarProps) {
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches ?? []).filter((b: any) => b.isActive),
    [branches]
  );
  const branchOptions = useMemo(
    () => activeBranches.map((b: any) => ({ value: String(b.id), label: b.name })),
    [activeBranches]
  );
  const { data: customersData } = useCustomers({ pageSize: 1000 });
  const { data: users } = useUsersForFilter();
  const { data: saleChannels } = useSaleChannels();
  const { data: bankAccounts } = useBankAccountsForPayment();
  const { data: misaEmployees } = useMisaEmployees(showMisaEmployeeFilter);
  const { selectedBranch } = useBranchStore();

  // Restore filter state từ localStorage
  const STORAGE_KEY = "invoices-sidebar-filters";
  const getSavedFilters = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const saved = useRef(getSavedFilters());

  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(() => {
    const savedIds = saved.current?.selectedBranchIds;
    if (Array.isArray(savedIds)) {
      // Giữ nguyên filter nhiều chi nhánh (>=2) user đã chủ động chọn.
      if (savedIds.length >= 2) return savedIds;
      // Giữ nguyên lựa chọn "Tất cả chi nhánh" (mảng rỗng) user đã chủ động chọn.
      if (savedIds.length === 0) return [];
    }
    // Còn lại (1 chi nhánh hoặc chưa có gì): bám theo chi nhánh đang chọn ở
    // DashboardHeader. Quan trọng vì khi đổi chi nhánh ở header, guard
    // unmount→mount lại sidebar, nên không thể dựa vào localStorage cũ.
    if (selectedBranch) return [selectedBranch.id];
    return Array.isArray(savedIds) ? savedIds : [];
  });
  const [customerId, setCustomerId] = useState(saved.current?.customerId || "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const savedStatuses = saved.current?.selectedStatuses;
    // Chỉ khôi phục khi user đã lưu một lựa chọn cụ thể (mảng có phần tử).
    // Nếu chưa lưu (undefined) hoặc rỗng ([]) → dùng mặc định: tất cả trạng
    // thái TRỪ "Trả hàng" và "Đã hủy", và hiển thị sẵn các chip này.
    if (Array.isArray(savedStatuses) && savedStatuses.length > 0)
      return savedStatuses;
    return DEFAULT_STATUSES;
  });
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState(
    saved.current?.selectedDeliveryStatus || ""
  );
  // Thời gian tạo (createdAt). Khôi phục từ key mới `createdRange`, fallback
  // sang các key cũ (dateMode/selectedPreset/fromDate/toDate) để tương thích
  // ngược với state đã lưu trước đây.
  const [createdRange, setCreatedRange] = useState<TimeRangeState>(() => ({
    dateMode:
      saved.current?.createdRange?.dateMode ?? saved.current?.dateMode ?? "preset",
    selectedPreset:
      saved.current?.createdRange?.selectedPreset ??
      saved.current?.selectedPreset ??
      "all_time",
    fromDate:
      saved.current?.createdRange?.fromDate ?? saved.current?.fromDate ?? "",
    toDate: saved.current?.createdRange?.toDate ?? saved.current?.toDate ?? "",
  }));
  // Thời gian mua hàng (purchaseDate) — chỉ dùng khi splitTimeFilters bật.
  const [purchaseRange, setPurchaseRange] = useState<TimeRangeState>(() => ({
    dateMode: saved.current?.purchaseRange?.dateMode ?? "preset",
    selectedPreset: saved.current?.purchaseRange?.selectedPreset ?? "all_time",
    fromDate: saved.current?.purchaseRange?.fromDate ?? "",
    toDate: saved.current?.purchaseRange?.toDate ?? "",
  }));
  // Thời gian cập nhật (updatedAt) — chỉ dùng khi showUpdatedTimeFilter bật.
  const [updatedRange, setUpdatedRange] = useState<TimeRangeState>(() => ({
    dateMode: saved.current?.updatedRange?.dateMode ?? "preset",
    selectedPreset: saved.current?.updatedRange?.selectedPreset ?? "all_time",
    fromDate: saved.current?.updatedRange?.fromDate ?? "",
    toDate: saved.current?.updatedRange?.toDate ?? "",
  }));
  const [creatorIds, setCreatorIds] = useState<string[]>(
    saved.current?.creatorIds || []
  );
  const [soldByIds, setSoldByIds] = useState<string[]>(
    saved.current?.soldByIds || []
  );
  const [misaEmployeeCodes, setMisaEmployeeCodes] = useState<string[]>(
    saved.current?.misaEmployeeCodes || []
  );
  const [taxCodeStatus, setTaxCodeStatus] = useState<"" | "empty" | "filled">(
    saved.current?.taxCodeStatus || ""
  );
  const [saleChannelId, setSaleChannelId] = useState(
    saved.current?.saleChannelId || ""
  );
  const [paymentMethod, setPaymentMethod] = useState<"" | "cash" | "transfer">(
    saved.current?.paymentMethod || ""
  );
  const [selectedBankAccountIds, setSelectedBankAccountIds] = useState<
    number[]
  >(saved.current?.selectedBankAccountIds || []);

  const [priceWarning, setPriceWarning] = useState<boolean>(
    saved.current?.priceWarning || false
  );

  const customerRef = useRef<HTMLDivElement>(null);

  // Persist filter state vào localStorage khi thay đổi
  useEffect(() => {
    const state = {
      selectedBranchIds,
      customerId,
      selectedStatuses,
      selectedDeliveryStatus,
      createdRange,
      purchaseRange,
      updatedRange,
      creatorIds,
      soldByIds,
      saleChannelId,
      paymentMethod,
      selectedBankAccountIds,
      misaEmployeeCodes,
      taxCodeStatus,
      priceWarning,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [
    selectedBranchIds,
    customerId,
    selectedStatuses,
    selectedDeliveryStatus,
    createdRange,
    purchaseRange,
    updatedRange,
    creatorIds,
    soldByIds,
    saleChannelId,
    paymentMethod,
    selectedBankAccountIds,
    misaEmployeeCodes,
    taxCodeStatus,
    priceWarning,
  ]);

  // Sync với chi nhánh đang chọn ở DashboardHeader: khi đổi chi nhánh, tick lại chi nhánh đó.
  // - Skip lần mount đầu tiên (hydrate) để không ghi đè localStorage đã restore.
  // - Chỉ ghi đè khi sidebar đang ở chế độ "bám theo header" (đúng 1 chi nhánh).
  //   Nếu user đang lọc nhiều chi nhánh (>=2) hoặc "Tất cả chi nhánh" (rỗng) thì
  //   giữ nguyên, không ghi đè bằng chi nhánh mới chọn trên header.
  const isFirstRenderRef = useRef(true);
  const lastSyncedBranchIdRef = useRef<number | null>(
    selectedBranch?.id ?? null
  );
  useEffect(() => {
    const currentBranchId = selectedBranch?.id ?? null;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      lastSyncedBranchIdRef.current = currentBranchId;
      return;
    }
    if (currentBranchId !== lastSyncedBranchIdRef.current) {
      lastSyncedBranchIdRef.current = currentBranchId;
      setSelectedBranchIds((prev) =>
        prev.length === 1 ? (currentBranchId ? [currentBranchId] : []) : prev
      );
    }
  }, [selectedBranch?.id]);

  const customers = useMemo(() => customersData?.data || [], [customersData]);
  const selectedCustomer = useMemo(
    () => customers.find((c: any) => String(c.id) === customerId),
    [customers, customerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c: any) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactNumber ?? "").includes(q) ||
          (c.code ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [customers, customerSearch]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedBranchIds.length > 0) n++;
    if (customerId) n++;
    if (selectedStatuses.length > 0) n++;
    if (selectedDeliveryStatus) n++;
    if (
      createdRange.selectedPreset !== "all_time" ||
      createdRange.dateMode === "custom"
    )
      n++;
    if (
      splitTimeFilters &&
      (purchaseRange.selectedPreset !== "all_time" ||
        purchaseRange.dateMode === "custom")
    )
      n++;
    if (
      showUpdatedTimeFilter &&
      (updatedRange.selectedPreset !== "all_time" ||
        updatedRange.dateMode === "custom")
    )
      n++;
    if (creatorIds.length > 0) n++;
    if (soldByIds.length > 0) n++;
    if (saleChannelId) n++;
    if (paymentMethod) n++;
    if (showMisaEmployeeFilter && misaEmployeeCodes.length > 0) n++;
    if (showMisaEmployeeFilter && taxCodeStatus) n++;
    if (showPriceWarningFilter && priceWarning) n++;
    return n;
  }, [
    selectedBranchIds,
    customerId,
    selectedStatuses,
    selectedDeliveryStatus,
    createdRange,
    purchaseRange,
    splitTimeFilters,
    updatedRange,
    showUpdatedTimeFilter,
    creatorIds,
    soldByIds,
    saleChannelId,
    paymentMethod,
    misaEmployeeCodes,
    taxCodeStatus,
    showMisaEmployeeFilter,
    showPriceWarningFilter,
    priceWarning,
  ]);

  // Debounce 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (selectedBranchIds.length > 0) f.branchIds = selectedBranchIds;
      if (customerId) f.customerIds = [parseInt(customerId)];
      if (selectedStatuses.length > 0)
        f.statusIds = selectedStatuses.map(Number);
      if (selectedDeliveryStatus) f.deliveryStatus = selectedDeliveryStatus;
      if (creatorIds.length > 0) f.createdByIds = creatorIds.map(Number);
      if (soldByIds.length > 0) f.soldByIds = soldByIds.map(Number);
      if (saleChannelId) f.saleChannelId = parseInt(saleChannelId);

      // Thời gian tạo → createdAt
      const createdIso = rangeToIso(createdRange);
      if (createdIso) {
        f.fromCreatedDate = createdIso.from;
        f.toCreatedDate = createdIso.to;
      }
      // Thời gian mua hàng → purchaseDate (chỉ khi bật split)
      if (splitTimeFilters) {
        const purchaseIso = rangeToIso(purchaseRange);
        if (purchaseIso) {
          f.fromPurchaseDate = purchaseIso.from;
          f.toPurchaseDate = purchaseIso.to;
        }
      }
      // Thời gian cập nhật → updatedAt (chỉ khi bật — trang hóa đơn VAT).
      // Gate bằng flag để không rò filter sang trang hóa đơn thường vì hai
      // trang share localStorage.
      if (showUpdatedTimeFilter) {
        const updatedIso = rangeToIso(updatedRange);
        if (updatedIso) {
          f.fromUpdatedDate = updatedIso.from;
          f.toUpdatedDate = updatedIso.to;
        }
      }

      if (paymentMethod) f.paymentMethod = paymentMethod;
      if (paymentMethod === "transfer" && selectedBankAccountIds.length > 0)
        f.bankAccountIds = selectedBankAccountIds;
      // Chỉ áp filter nhân viên phụ trách ở trang bật flag (hóa đơn VAT) — tránh
      // rò filter sang trang hóa đơn thường vì hai trang share localStorage.
      if (showMisaEmployeeFilter && misaEmployeeCodes.length > 0)
        f.misaEmployeeCodes = misaEmployeeCodes;
      if (showMisaEmployeeFilter && taxCodeStatus)
        f.taxCodeStatus = taxCodeStatus;

      if (showPriceWarningFilter && priceWarning) f.priceWarning = true;

      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    selectedBranchIds,
    customerId,
    selectedStatuses,
    selectedDeliveryStatus,
    createdRange,
    purchaseRange,
    splitTimeFilters,
    updatedRange,
    showUpdatedTimeFilter,
    creatorIds,
    soldByIds,
    saleChannelId,
    paymentMethod,
    selectedBankAccountIds,
    misaEmployeeCodes,
    taxCodeStatus,
    showMisaEmployeeFilter,
    showPriceWarningFilter,
    priceWarning,
  ]);

  const clearAll = () => {
    setSelectedBranchIds(selectedBranch ? [selectedBranch.id] : []);
    setCustomerId("");
    setCustomerSearch("");
    setSelectedStatuses(DEFAULT_STATUSES);
    setSelectedDeliveryStatus("");
    setCreatedRange({
      dateMode: "preset",
      selectedPreset: "all_time",
      fromDate: "",
      toDate: "",
    });
    setPurchaseRange({
      dateMode: "preset",
      selectedPreset: "all_time",
      fromDate: "",
      toDate: "",
    });
    setUpdatedRange({
      dateMode: "preset",
      selectedPreset: "all_time",
      fromDate: "",
      toDate: "",
    });
    setCreatorIds([]);
    setSoldByIds([]);
    setSaleChannelId("");
    setPaymentMethod("");
    setSelectedBankAccountIds([]);
    setMisaEmployeeCodes([]);
    setTaxCodeStatus("");
    setPriceWarning(false);
    onFiltersChange({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <aside className="w-64 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* ── Cảnh báo lệch giá ── */}
        {showPriceWarningFilter && (
          <>
            <button
              type="button"
              onClick={() => setPriceWarning((p) => !p)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-sm transition-all select-none ${
                priceWarning
                  ? "border-yellow-400 bg-yellow-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <span className="flex items-center gap-2 min-w-0">
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 ${
                    priceWarning
                      ? "text-yellow-500 fill-yellow-100"
                      : "text-gray-400"
                  }`}
                />
                <span className="text-left font-medium text-gray-700">
                  Chỉ HĐ cảnh báo lệch giá
                </span>
              </span>
              <span
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                  priceWarning ? "bg-yellow-400" : "bg-gray-200"
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    priceWarning ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
            <div className="border-t border-gray-100" />
          </>
        )}

        {/* ── Thời gian ── */}
        {splitTimeFilters ? (
          <>
            <TimeRangeFilter
              label="Thời gian mua hàng"
              value={purchaseRange}
              onChange={setPurchaseRange}
            />
            <div className="border-t border-gray-100" />
            <TimeRangeFilter
              label="Thời gian tạo"
              value={createdRange}
              onChange={setCreatedRange}
            />
          </>
        ) : (
          <TimeRangeFilter
            label="Thời gian"
            value={createdRange}
            onChange={setCreatedRange}
          />
        )}

        {showUpdatedTimeFilter && (
          <>
            <div className="border-t border-gray-100" />
            <TimeRangeFilter
              label="Thời gian cập nhật"
              value={updatedRange}
              onChange={setUpdatedRange}
            />
          </>
        )}

        <div className="border-t border-gray-100" />

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <FilterMultiSelect
            options={branchOptions}
            values={selectedBranchIds.map(String)}
            onChange={(vals) => setSelectedBranchIds(vals.map(Number))}
            placeholder="Tất cả chi nhánh"
            searchPlaceholder="Tìm chi nhánh..."
            multiLabel={(n) => `${n} chi nhánh`}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Trạng thái hóa đơn ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái hóa đơn
          </label>
          <MultiStatusDropdown
            options={STATUS_OPTIONS}
            values={selectedStatuses}
            placeholder="Chọn trạng thái"
            onChange={setSelectedStatuses}
          />
        </div>

        {/* ── Nhân viên phụ trách (Misa) — chỉ hiện ở trang hóa đơn VAT ── */}
        {showMisaEmployeeFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nhân viên phụ trách
            </label>
            <FilterMultiSelect
              options={
                misaEmployees?.map((e) => ({
                  value: e.code,
                  label: e.name || e.code,
                })) ?? []
              }
              values={misaEmployeeCodes}
              placeholder="Tất cả"
              searchPlaceholder="Tìm theo tên nhân viên..."
              onChange={setMisaEmployeeCodes}
            />
          </div>
        )}

        {/* ── Mã số thuế (trống / không trống) — chỉ hiện ở trang hóa đơn VAT ── */}
        {showMisaEmployeeFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mã số thuế
            </label>
            <SimpleDropdown
              options={[
                { value: "filled", label: "Có mã số thuế" },
                { value: "empty", label: "Không có mã số thuế" },
              ]}
              value={taxCodeStatus}
              placeholder="Tất cả"
              onChange={(v) =>
                setTaxCodeStatus(v as "" | "empty" | "filled")
              }
            />
          </div>
        )}

        {/* ── Trạng thái giao hàng ── */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái giao hàng
          </label>
          <StatusDropdown
            options={DELIVERY_STATUS_OPTIONS}
            value={selectedDeliveryStatus}
            placeholder="Tất cả"
            onChange={setSelectedDeliveryStatus}
          />
        </div> */}

        <div className="border-t border-gray-100" />

        {/* ── Phương thức thanh toán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phương thức thanh toán
          </label>
          <SimpleDropdown
            options={[
              { value: "cash", label: "Tiền mặt" },
              { value: "transfer", label: "Ngân hàng" },
            ]}
            value={paymentMethod}
            placeholder="Tất cả"
            onChange={(v) => {
              setPaymentMethod(v as "" | "cash" | "transfer");
              setSelectedBankAccountIds([]);
            }}
          />

          {paymentMethod === "transfer" && (
            <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
              <label className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={
                    Array.isArray(bankAccounts) &&
                    bankAccounts.length > 0 &&
                    selectedBankAccountIds.length === bankAccounts.length
                  }
                  onChange={(e) => {
                    if (!Array.isArray(bankAccounts)) return;
                    setSelectedBankAccountIds(
                      e.target.checked ? bankAccounts.map((a: any) => a.id) : []
                    );
                  }}
                  className="w-3.5 h-3.5 rounded accent-brand cursor-pointer flex-shrink-0"
                />
                <span className="text-xs font-medium text-gray-600">
                  Tất cả tài khoản
                </span>
              </label>
              <div className="max-h-40 overflow-y-auto">
                {!Array.isArray(bankAccounts) || bankAccounts.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    Không có tài khoản
                  </div>
                ) : (
                  bankAccounts.map((acc: any, idx: number) => (
                    <label
                      key={acc.id}
                      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors select-none ${
                        idx > 0 ? "border-t border-gray-50" : ""
                      }`}>
                      <input
                        type="checkbox"
                        checked={selectedBankAccountIds.includes(acc.id)}
                        onChange={(e) => {
                          setSelectedBankAccountIds((prev) =>
                            e.target.checked
                              ? [...prev, acc.id]
                              : prev.filter((id) => id !== acc.id)
                          );
                        }}
                        className="w-3.5 h-3.5 rounded accent-brand cursor-pointer flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-800 truncate">
                          {acc.bankCode || acc.bankName}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {acc.accountNumber}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Khách hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khách hàng
          </label>
          {selectedCustomer ? (
            <div className="flex items-center gap-2 border rounded-lg px-2 py-1 bg-brand-soft border-brand-border">
              <span className="text-sm text-brand-dark font-medium flex-1 truncate">
                {selectedCustomer.name}
              </span>
              <button
                onClick={() => {
                  setCustomerId("");
                  setCustomerSearch("");
                }}
                className="text-brand hover:text-brand-dark flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div ref={customerRef} className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDrop(true);
                }}
                onFocus={() => setShowCustomerDrop(true)}
                onBlur={() => setTimeout(() => setShowCustomerDrop(false), 150)}
                placeholder="Tìm theo tên, SĐT, mã KH..."
                className="w-full border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {showCustomerDrop && filteredCustomers.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredCustomers.map((c: any, idx: number) => (
                    <button
                      key={c.id}
                      onMouseDown={() => {
                        setCustomerId(String(c.id));
                        setCustomerSearch("");
                        setShowCustomerDrop(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 hover:bg-brand-soft transition-colors ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                      <div className="text-sm font-medium text-gray-800">
                        {c.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {c.contactNumber || c.code || ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Người tạo ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người tạo
          </label>
          <FilterMultiSelect
            options={
              users?.map((u: any) => ({
                value: String(u.id),
                label: u.name,
              })) ?? []
            }
            values={creatorIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm theo tên người tạo..."
            onChange={setCreatorIds}
          />
        </div>

        {/* ── Người bán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người bán
          </label>
          <FilterMultiSelect
            options={
              users?.map((u: any) => ({
                value: String(u.id),
                label: u.name,
              })) ?? []
            }
            values={soldByIds}
            placeholder="Tất cả"
            searchPlaceholder="Tìm theo tên người bán..."
            onChange={setSoldByIds}
          />
        </div>

        {/* ── Kênh bán ── */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kênh bán hàng
          </label>
          <SimpleDropdown
            options={
              saleChannels?.map((sc: any) => ({
                value: String(sc.id),
                label: sc.name,
              })) ?? []
            }
            value={saleChannelId}
            placeholder="Tất cả kênh"
            onChange={setSaleChannelId}
          />
        </div> */}
      </div>
    </aside>
  );
}
