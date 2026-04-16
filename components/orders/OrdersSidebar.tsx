// components/orders/OrdersSidebar.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";
import { ChevronDown, X, Check } from "lucide-react";

interface OrdersSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Phiếu tạm",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
  },
  {
    value: "confirmed",
    label: "Đã xác nhận",
    color: "bg-teal-100 text-teal-700",
    dot: "bg-teal-500",
  },
  {
    value: "processing",
    label: "Đang giao hàng",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-400",
  },
  {
    value: "partially_invoiced",
    label: "Ra 1 phần HĐ",
    color: "bg-teal-100 text-teal-600",
    dot: "bg-teal-300",
  },
  {
    value: "completed",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  {
    value: "cancelled",
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    dot: "bg-red-400",
  },
];

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "unpaid",
    label: "Chưa thanh toán",
    color: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  },
  {
    value: "partial",
    label: "Thanh toán 1 phần",
    color: "bg-orange-100 text-orange-700",
    dot: "bg-orange-400",
  },
  {
    value: "paid",
    label: "Đã thanh toán",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
];

const TIME_PRESETS = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "Tuần này", value: "this_week" },
  { label: "Tuần trước", value: "last_week" },
  { label: "Tháng này", value: "this_month" },
  { label: "Tháng trước", value: "last_month" },
  { label: "7 ngày qua", value: "last_7_days" },
  { label: "30 ngày qua", value: "last_30_days" },
];

const PRESET_LABELS: Record<string, string> = Object.fromEntries(
  TIME_PRESETS.map((p) => [p.value, p.label])
);

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const y = new Date(today.getTime() - 86400000);
      return { from: y, to: new Date(y.getTime() + 86400000 - 1) };
    }
    case "this_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay());
      return { from: s, to: now };
    }
    case "last_week": {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() - 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      return { from: s, to: e };
    }
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
    case "last_7_days":
      return { from: new Date(today.getTime() - 7 * 86400000), to: now };
    case "last_30_days":
      return { from: new Date(today.getTime() - 30 * 86400000), to: now };
    default:
      return { from: today, to: now };
  }
};

// ── Reusable custom dropdown ──────────────────────────────────────────────────
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm transition-colors ${
          open
            ? "border-blue-400 ring-2 ring-blue-100"
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
      </button>

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
                value === opt.value ? "bg-blue-50" : "hover:bg-gray-50"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`}
              />
              <span
                className={`flex-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
                {opt.label}
              </span>
              {value === opt.value && (
                <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export function OrdersSidebar({ onFiltersChange }: OrdersSidebarProps) {
  const { data: branches } = useBranches();
  const { data: customersData } = useCustomers({ pageSize: 1000 });
  const { data: users } = useUsersForFilter();
  const { data: saleChannels } = useSaleChannels();

  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("");
  const [enableOrderDate, setEnableOrderDate] = useState(true);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [showPresetDrop, setShowPresetDrop] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [saleChannelId, setSaleChannelId] = useState("");

  const presetRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  // Click-outside cho preset dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (presetRef.current && !presetRef.current.contains(e.target as Node))
        setShowPresetDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const customers = useMemo(() => customersData?.data || [], [customersData]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === customerId),
    [customers, customerId]
  );

  // Local search + slice(50) → tránh render 1000 DOM nodes
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.contactNumber ?? "").includes(q) ||
          (c.code ?? "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [customers, customerSearch]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (branchId) n++;
    if (customerId) n++;
    if (selectedStatus) n++;
    if (selectedPaymentStatus) n++;
    if (enableOrderDate) n++;
    if (creatorId) n++;
    if (saleChannelId) n++;
    return n;
  }, [
    branchId,
    customerId,
    selectedStatus,
    selectedPaymentStatus,
    enableOrderDate,
    creatorId,
    saleChannelId,
  ]);

  // Debounce 300ms qua cleanup pattern
  useEffect(() => {
    const timer = setTimeout(() => {
      const f: any = {};
      if (branchId) f.branchId = parseInt(branchId);
      if (customerId) f.customerId = parseInt(customerId);
      if (selectedStatus) f.status = selectedStatus;
      if (selectedPaymentStatus) f.paymentStatus = selectedPaymentStatus;
      if (creatorId) f.soldById = parseInt(creatorId);
      if (saleChannelId) f.saleChannelId = parseInt(saleChannelId);
      if (enableOrderDate) {
        const range =
          dateMode === "preset"
            ? getDateRangeFromPreset(selectedPreset)
            : fromDate && toDate
              ? { from: new Date(fromDate), to: new Date(toDate) }
              : getDateRangeFromPreset("this_month");
        f.fromDate = range.from.toISOString();
        f.toDate = range.to.toISOString();
      }
      onFiltersChange(f);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    branchId,
    customerId,
    selectedStatus,
    selectedPaymentStatus,
    enableOrderDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    creatorId,
    saleChannelId,
  ]);

  const clearAll = () => {
    setBranchId("");
    setCustomerId("");
    setCustomerSearch("");
    setSelectedStatus("");
    setSelectedPaymentStatus("");
    setEnableOrderDate(true);
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    setCreatorId("");
    setSaleChannelId("");
    onFiltersChange({});
  };

  return (
    <aside className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll bg-white shadow-xl flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Bộ lọc</h2>
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center leading-none">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* ── Thời gian ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Thời gian
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableOrderDate}
                onChange={(e) => setEnableOrderDate(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-500">Ngày đặt hàng</span>
            </label>
          </div>

          {enableOrderDate && (
            <div className="space-y-2">
              {/* Toggle preset / custom */}
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
                {(["preset", "custom"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDateMode(m)}
                    className={`flex-1 py-1.5 font-medium transition-colors ${
                      dateMode === m
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}>
                    {m === "preset" ? "Nhanh" : "Tùy chọn"}
                  </button>
                ))}
              </div>

              {dateMode === "preset" ? (
                // Preset dropdown đẹp
                <div ref={presetRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPresetDrop((p) => !p)}
                    className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-blue-50 border-blue-200 text-blue-700 font-medium transition-colors ${
                      showPresetDrop ? "ring-2 ring-blue-100" : ""
                    }`}>
                    <span>{PRESET_LABELS[selectedPreset]}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${showPresetDrop ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showPresetDrop && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {TIME_PRESETS.map((p, idx) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(p.value);
                            setShowPresetDrop(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                            selectedPreset === p.value
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "hover:bg-gray-50 text-gray-700"
                          } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
                          {p.label}
                          {selectedPreset === p.value && (
                            <Check className="w-3.5 h-3.5 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Từ ngày", val: fromDate, set: setFromDate },
                    { label: "Đến ngày", val: toDate, set: setToDate },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {label}
                      </label>
                      <input
                        type="date"
                        value={val}
                        onChange={(e) => set(e.target.value)}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Trạng thái đơn hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái đơn hàng
          </label>
          <StatusDropdown
            options={STATUS_OPTIONS}
            value={selectedStatus}
            placeholder="Chọn trạng thái"
            onChange={setSelectedStatus}
          />
        </div>

        {/* ── Trạng thái thanh toán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trạng thái thanh toán
          </label>
          <StatusDropdown
            options={PAYMENT_STATUS_OPTIONS}
            value={selectedPaymentStatus}
            placeholder="Chọn trạng thái TT"
            onChange={setSelectedPaymentStatus}
          />
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Khách hàng ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Khách hàng
          </label>
          {customerId && selectedCustomer ? (
            <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-blue-50 border-blue-200">
              <span className="text-sm text-blue-700 font-medium flex-1 truncate">
                {selectedCustomer.name}
              </span>
              <button
                onClick={() => {
                  setCustomerId("");
                  setCustomerSearch("");
                }}
                className="text-blue-400 hover:text-blue-600 flex-shrink-0">
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
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showCustomerDrop && filteredCustomers.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredCustomers.map((c, idx) => (
                    <button
                      key={c.id}
                      onMouseDown={() => {
                        setCustomerId(String(c.id));
                        setCustomerSearch("");
                        setShowCustomerDrop(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${
                        idx > 0 ? "border-t border-gray-50" : ""
                      }`}>
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

        {/* ── Chi nhánh ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chi nhánh
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Tất cả chi nhánh</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Người tạo ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Người tạo
          </label>
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Tất cả</option>
            {users?.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Kênh bán ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kênh bán hàng
          </label>
          <select
            value={saleChannelId}
            onChange={(e) => setSaleChannelId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Tất cả kênh</option>
            {saleChannels?.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
