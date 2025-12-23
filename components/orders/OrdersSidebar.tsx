"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useUsers } from "@/lib/hooks/useUsers";
import { useSaleChannels } from "@/lib/hooks/useSaleChannels";
import { ChevronDown, X } from "lucide-react";

interface OrdersSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Phiếu tạm",
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    value: "processing",
    label: "Đang giao hàng",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "completed",
    label: "Hoàn thành",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "cancelled",
    label: "Hủy",
    color: "bg-red-100 text-red-700",
  },
  {
    value: "confirmed",
    label: "Đã xác nhận",
    color: "bg-teal-100 text-teal-700",
  },
];

const PAYMENT_STATUS_OPTIONS = [
  {
    value: "unpaid",
    label: "Chưa thanh toán",
    color: "bg-gray-100 text-gray-700",
  },
  {
    value: "partial",
    label: "Thanh toán 1 phần",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "paid",
    label: "Đã thanh toán",
    color: "bg-green-100 text-green-700",
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
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      return { from: lastWeekStart, to: lastWeekEnd };
    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0),
      };
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

export function OrdersSidebar({
  filters,
  onFiltersChange,
}: OrdersSidebarProps) {
  const { data: branches } = useBranches();
  const { data: customersData } = useCustomers({ pageSize: 1000 });
  const { data: users } = useUsers();
  const { data: saleChannels } = useSaleChannels();

  const [branchId, setBranchId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<
    string[]
  >([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] =
    useState(false);

  const [enableOrderDate, setEnableOrderDate] = useState(true);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [showDateModeDropdown, setShowDateModeDropdown] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("this_month");
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [creatorId, setCreatorId] = useState<string>("");
  const [saleChannelId, setSaleChannelId] = useState<string>("");
  const [showSaleChannelModal, setShowSaleChannelModal] = useState(false);

  const customers = customersData?.data || [];

  useEffect(() => {
    applyFilters();
  }, [
    branchId,
    customerId,
    selectedStatuses,
    selectedPaymentStatuses,
    enableOrderDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    creatorId,
    saleChannelId,
  ]);

  const applyFilters = () => {
    const newFilters: any = {};

    if (branchId) {
      newFilters.branchId = parseInt(branchId);
    }

    if (customerId) {
      newFilters.customerId = parseInt(customerId);
    }

    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses[0];
    }

    if (selectedPaymentStatuses.length > 0) {
      newFilters.paymentStatus = selectedPaymentStatuses[0];
    }

    if (enableOrderDate) {
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
      newFilters.soldById = parseInt(creatorId);
    }

    if (saleChannelId) {
      newFilters.saleChannelId = parseInt(saleChannelId);
    }

    onFiltersChange(newFilters);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses([status]);
  };

  const removeStatus = (status: string) => {
    setSelectedStatuses((prev) => prev.filter((s) => s !== status));
  };

  const togglePaymentStatus = (status: string) => {
    setSelectedPaymentStatuses([status]);
  };

  const removePaymentStatus = (status: string) => {
    setSelectedPaymentStatuses((prev) => prev.filter((s) => s !== status));
  };

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    setShowPresetDropdown(false);
    setShowDateModeDropdown(false);
  };

  const clearAllFilters = () => {
    setBranchId("");
    setCustomerId("");
    setSelectedStatuses([]);
    setSelectedPaymentStatuses([]);
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
    <aside className="w-80 border-r bg-white overflow-y-auto">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bộ lọc</h2>
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700">
            Xóa tất cả
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Chi nhánh xử lý
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Chọn chi nhánh</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Thời gian</label>
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableOrderDate}
                onChange={(e) => setEnableOrderDate(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-sm">Ngày đặt hàng</span>
            </label>
          </div>

          {enableOrderDate && (
            <div className="space-y-2">
              <div className="relative">
                <button
                  onClick={() => setShowDateModeDropdown(!showDateModeDropdown)}
                  className={`w-full flex items-center justify-between border rounded px-3 py-2 text-sm ${
                    dateMode === "preset" ? "bg-blue-50" : ""
                  }`}>
                  <span>
                    {dateMode === "preset"
                      ? TIME_PRESETS.find((p) => p.value === selectedPreset)
                          ?.label
                      : "Tùy chỉnh"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showDateModeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {TIME_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => {
                            setDateMode("preset");
                            applyPreset(preset.value);
                          }}
                          className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                            selectedPreset === preset.value &&
                            dateMode === "preset"
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {preset.label}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setDateMode("custom");
                          setShowDateModeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                          dateMode === "custom"
                            ? "bg-blue-50 text-blue-600"
                            : ""
                        }`}>
                        Tùy chỉnh
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {dateMode === "custom" && (
                <div className="space-y-2 p-3 bg-gray-50 rounded">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Trạng thái</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedStatuses.map((status) => {
              const option = STATUS_OPTIONS.find((o) => o.value === status);
              return (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${option?.color}`}>
                  {option?.label}
                  <button
                    onClick={() => removeStatus(status)}
                    className="hover:bg-black/10 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-gray-50">
              <span className="text-gray-500">
                {selectedStatuses.length === 0
                  ? "Chọn trạng thái"
                  : `Đã chọn ${selectedStatuses.length} trạng thái`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-60 overflow-y-auto">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedStatuses.includes(option.value)}
                      onChange={() => toggleStatus(option.value)}
                      className="cursor-pointer"
                    />
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${option.color}`}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Đối tác giao hàng
          </label>
          <input
            type="text"
            placeholder="Chọn đối tác giao hàng"
            className="w-full border rounded px-3 py-2 text-sm"
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Thời gian giao hàng
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="deliveryTime"
                value="all"
                defaultChecked
                className="cursor-pointer"
              />
              <span className="text-sm">Toàn thời gian</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="deliveryTime"
                value="custom"
                className="cursor-pointer"
              />
              <span className="text-sm">Tùy chỉnh</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Khu vực giao hàng
          </label>
          <input
            type="text"
            placeholder="Chọn Tỉnh/TP - Quận/Huyện"
            className="w-full border rounded px-3 py-2 text-sm"
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Phương thức thanh toán
          </label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            defaultValue="">
            <option value="">Chọn phương thức thanh toán</option>
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
            <option value="card">Thẻ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Người tạo</label>
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Chọn người tạo</option>
            {users?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Người nhận đặt
          </label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            defaultValue="">
            <option value="">Chọn người nhận đặt</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Kênh bán</label>
            <button
              onClick={() => setShowSaleChannelModal(true)}
              className="text-sm text-blue-600 hover:text-blue-700">
              Tạo mới
            </button>
          </div>
          <select
            value={saleChannelId}
            onChange={(e) => setSaleChannelId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Chọn kênh bán</option>
            {saleChannels?.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
