"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useUsers } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";
import { Filter, X, Calendar, ChevronDown } from "lucide-react";

interface InvoicesSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const INVOICE_STATUS_OPTIONS = [
  { value: 3, label: "Đang xử lý", color: "bg-blue-100" },
  { value: 1, label: "Hoàn thành", color: "bg-green-100" },
  { value: 5, label: "Không giao được", color: "bg-yellow-100" },
  { value: 2, label: "Đã hủy", color: "bg-red-100" },
];

const DELIVERY_TYPE_OPTIONS = [
  { value: "no_delivery", label: "Không giao hàng" },
  { value: "delivery", label: "Giao hàng" },
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

const getDateRangeFromPreset = (preset: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: now };
    case "yesterday":
      const yesterday = new Date(today.getTime() - 86400000);
      return {
        from: yesterday,
        to: new Date(yesterday.getTime() + 86400000 - 1),
      };
    case "this_week":
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { from: startOfWeek, to: now };
    case "last_week":
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      return { from: lastWeekStart, to: lastWeekEnd };
    case "this_month":
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfMonth, to: now };
    case "last_month":
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: lastMonthStart, to: lastMonthEnd };
    case "last_7_days":
      const last7Days = new Date(today.getTime() - 7 * 86400000);
      return { from: last7Days, to: now };
    case "last_30_days":
      const last30Days = new Date(today.getTime() - 30 * 86400000);
      return { from: last30Days, to: now };
    default:
      return { from: today, to: now };
  }
};

export function InvoicesSidebar({
  filters,
  onFiltersChange,
}: InvoicesSidebarProps) {
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [selectedDeliveryTypes, setSelectedDeliveryTypes] = useState<string[]>(
    []
  );
  const [enablePurchaseDate, setEnablePurchaseDate] = useState(true);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("this_month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [enableDeliveryDate, setEnableDeliveryDate] = useState(false);
  const [deliveryDateMode, setDeliveryDateMode] = useState<"all" | "custom">(
    "all"
  );
  const [deliveryFromDate, setDeliveryFromDate] = useState("");
  const [deliveryToDate, setDeliveryToDate] = useState("");
  const [creatorId, setCreatorId] = useState<string>("");
  const [soldById, setSoldById] = useState<string>("");
  const [saleChannelId, setSaleChannelId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [deliveryPartnerId, setDeliveryPartnerId] = useState<string>("");
  const [priceBookId, setPriceBookId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");

  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [showDateModeDropdown, setShowDateModeDropdown] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);

  const { data: branchesData } = useBranches();
  const { data: customersData } = useCustomers({ pageSize: 1000 });
  const { data: usersData } = useUsers();
  const { data: saleChannelsData } = useSaleChannels();

  const branches = branchesData || [];
  const customers = customersData?.data || [];
  const users = usersData || [];
  const saleChannels = saleChannelsData || [];

  useEffect(() => {
    applyFilters();
  }, [
    selectedBranches,
    customerId,
    selectedStatuses,
    selectedDeliveryTypes,
    enablePurchaseDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    enableDeliveryDate,
    deliveryDateMode,
    deliveryFromDate,
    deliveryToDate,
    creatorId,
    soldById,
    saleChannelId,
    paymentMethod,
    deliveryPartnerId,
    priceBookId,
    locationId,
  ]);

  const applyFilters = () => {
    const newFilters: any = {};

    if (selectedBranches.length > 0) {
      newFilters.branchId = selectedBranches[0];
    }

    if (customerId) {
      newFilters.customerId = parseInt(customerId);
    }

    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses[0];
    }

    if (enablePurchaseDate) {
      let dateRange: { from: Date; to: Date };

      if (dateMode === "preset") {
        dateRange = getDateRangeFromPreset(selectedPreset);
      } else {
        if (fromDate && toDate) {
          dateRange = {
            from: new Date(fromDate),
            to: new Date(toDate),
          };
        } else {
          dateRange = getDateRangeFromPreset("this_month");
        }
      }

      newFilters.fromDate = dateRange.from.toISOString();
      newFilters.toDate = dateRange.to.toISOString();
    }

    if (creatorId) {
      newFilters.createdBy = parseInt(creatorId);
    }

    if (soldById) {
      newFilters.soldById = parseInt(soldById);
    }

    if (saleChannelId) {
      newFilters.saleChannelId = parseInt(saleChannelId);
    }

    onFiltersChange(newFilters);
  };

  const toggleStatus = (status: number) => {
    if (selectedStatuses.includes(status)) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses([status]);
    }
  };

  const toggleDeliveryType = (type: string) => {
    if (selectedDeliveryTypes.includes(type)) {
      setSelectedDeliveryTypes(selectedDeliveryTypes.filter((t) => t !== type));
    } else {
      setSelectedDeliveryTypes([...selectedDeliveryTypes, type]);
    }
  };

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    setShowPresetDropdown(false);
    setShowDateModeDropdown(false);
  };

  const clearAllFilters = () => {
    setSelectedBranches([]);
    setCustomerId("");
    setSelectedStatuses([]);
    setSelectedDeliveryTypes([]);
    setEnablePurchaseDate(true);
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    setEnableDeliveryDate(false);
    setDeliveryDateMode("all");
    setDeliveryFromDate("");
    setDeliveryToDate("");
    setCreatorId("");
    setSoldById("");
    setSaleChannelId("");
    setPaymentMethod("");
    setDeliveryPartnerId("");
    setPriceBookId("");
    setLocationId("");
  };

  const removeBranch = (branchId: number) => {
    setSelectedBranches(selectedBranches.filter((id) => id !== branchId));
  };

  const getPresetLabel = (value: string) => {
    return TIME_PRESETS.find((p) => p.value === value)?.label || value;
  };

  return (
    <div className="w-[20%] border m-4 rounded-xl overflow-y-auto p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Bộ lọc</h3>
        </div>
        <button
          onClick={clearAllFilters}
          className="text-sm text-blue-600 hover:underline">
          Xóa tất cả
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
        {selectedBranches.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedBranches.map((branchId) => {
              const branch = branches.find((b) => b.id === branchId);
              return (
                <span
                  key={branchId}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded">
                  {branch?.name}
                  <button
                    onClick={() => removeBranch(branchId)}
                    className="hover:bg-blue-700 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              const branchId = parseInt(e.target.value);
              if (!selectedBranches.includes(branchId)) {
                setSelectedBranches([...selectedBranches, branchId]);
              }
            }
          }}
          className="w-full px-3 py-2 border rounded-lg text-sm">
          <option value="">Chọn chi nhánh</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Thời gian */}
      <div>
        <label className="block text-sm font-medium mb-2">Thời gian</label>
        <div className="space-y-2">
          <div className="relative">
            <button
              onClick={() => {
                setDateMode("preset");
                setShowDateModeDropdown(!showDateModeDropdown);
              }}
              className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between text-sm ${
                dateMode === "preset" ? "bg-blue-50 border-blue-600" : ""
              }`}>
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={dateMode === "preset"}
                  onChange={() => setDateMode("preset")}
                  className="cursor-pointer"
                />
                <span>{getPresetLabel(selectedPreset)}</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showDateModeDropdown && dateMode === "preset" && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => applyPreset(preset.value)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm">
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setDateMode("custom")}
            className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between text-sm ${
              dateMode === "custom" ? "bg-blue-50 border-blue-600" : ""
            }`}>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === "custom"}
                onChange={() => setDateMode("custom")}
                className="cursor-pointer"
              />
              <span>Tùy chỉnh</span>
            </div>
            <Calendar className="w-4 h-4" />
          </button>

          {dateMode === "custom" && (
            <div className="space-y-2 pl-6">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Loại hóa đơn */}
      <div>
        <label className="block text-sm font-medium mb-2">Loại hóa đơn</label>
        <div className="space-y-2">
          {DELIVERY_TYPE_OPTIONS.map((type) => (
            <label
              key={type.value}
              className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDeliveryTypes.includes(type.value)}
                onChange={() => toggleDeliveryType(type.value)}
                className="cursor-pointer"
              />
              <span className="text-sm">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Trạng thái hóa đơn */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Trạng thái hóa đơn
        </label>
        <div className="space-y-2">
          {INVOICE_STATUS_OPTIONS.map((status) => (
            <label
              key={status.value}
              className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(status.value)}
                onChange={() => toggleStatus(status.value)}
                className="cursor-pointer"
              />
              <span className="text-sm">{status.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Người tạo</label>
        <select
          value={creatorId}
          onChange={(e) => setCreatorId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500">
          <option value="">Chọn người tạo</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Người bán</label>
        <select
          value={soldById}
          onChange={(e) => setSoldById(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500">
          <option value="">Chọn người bán</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Kênh bán</label>
        </div>
        <select
          value={saleChannelId}
          onChange={(e) => setSaleChannelId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm text-gray-500">
          <option value="">Chọn kênh bán</option>
          {saleChannels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
