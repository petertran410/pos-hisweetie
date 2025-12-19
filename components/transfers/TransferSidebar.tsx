"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import type { TransferQueryParams } from "@/lib/api/transfers";
import { X, ChevronDown } from "lucide-react";

interface TransferSidebarProps {
  filters: TransferQueryParams;
  onFiltersChange: (filters: TransferQueryParams) => void;
}

interface StatusOption {
  value: number;
  label: string;
  color: string;
}

interface TimePreset {
  label: string;
  value: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 1, label: "Phiếu tạm", color: "bg-gray-100 text-gray-600" },
  { value: 2, label: "Đang chuyển", color: "bg-blue-100 text-blue-600" },
  { value: 3, label: "Đã nhận", color: "bg-green-100 text-green-600" },
  { value: 4, label: "Đã hủy", color: "bg-red-100 text-red-600" },
];

const TIME_PRESETS: TimePreset[] = [
  { label: "Hôm nay", value: "today" },
  { label: "Hôm qua", value: "yesterday" },
  { label: "Tuần này", value: "this_week" },
  { label: "Tuần trước", value: "last_week" },
  { label: "Tháng này", value: "this_month" },
  { label: "Tháng trước", value: "last_month" },
  { label: "7 ngày qua", value: "last_7_days" },
  { label: "30 ngày qua", value: "last_30_days" },
  { label: "Tháng này (âm lịch)", value: "this_lunar_month" },
  { label: "Tháng trước (âm lịch)", value: "last_lunar_month" },
  { label: "Năm nay", value: "this_year" },
  { label: "Năm trước", value: "last_year" },
  { label: "Năm nay (âm lịch)", value: "this_lunar_year" },
  { label: "Năm trước (âm lịch)", value: "last_lunar_year" },
];

const getDateRangeFromPreset = (preset: string): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return { from: today, to: new Date(today.getTime() + 86400000 - 1) };

    case "yesterday":
      const yesterday = new Date(today.getTime() - 86400000);
      return {
        from: yesterday,
        to: new Date(yesterday.getTime() + 86400000 - 1),
      };

    case "this_week":
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1);
      return { from: startOfWeek, to: now };

    case "last_week":
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 6);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      return { from: lastWeekStart, to: lastWeekEnd };

    case "this_month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };

    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: lastMonth, to: lastMonthEnd };

    case "last_7_days":
      const last7Days = new Date(today.getTime() - 7 * 86400000);
      return { from: last7Days, to: now };

    case "last_30_days":
      const last30Days = new Date(today.getTime() - 30 * 86400000);
      return { from: last30Days, to: now };

    case "this_year":
      return { from: new Date(now.getFullYear(), 0, 1), to: now };

    case "last_year":
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31),
      };

    default:
      return { from: today, to: now };
  }
};

export function TransferSidebar({
  filters,
  onFiltersChange,
}: TransferSidebarProps) {
  const { data: branches } = useBranches();

  // Local state
  const [fromBranchId, setFromBranchId] = useState<string>("");
  const [toBranchId, setToBranchId] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Time filter state
  const [enableTransferDate, setEnableTransferDate] = useState(false);
  const [enableReceiveDate, setEnableReceiveDate] = useState(false);
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [showDateModeDropdown, setShowDateModeDropdown] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("this_month");
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Receive status
  const [receiveStatus, setReceiveStatus] = useState<
    "all" | "matched" | "unmatched"
  >("all");

  // Initialize filters from props
  useEffect(() => {
    if (filters.fromBranchIds?.[0]) {
      setFromBranchId(filters.fromBranchIds[0].toString());
    }
    if (filters.toBranchIds?.[0]) {
      setToBranchId(filters.toBranchIds[0].toString());
    }
    if (filters.status) {
      setSelectedStatuses(filters.status);
    }
  }, []);

  // Apply filters
  const applyFilters = () => {
    const newFilters: TransferQueryParams = {};

    if (fromBranchId) {
      newFilters.fromBranchIds = [parseInt(fromBranchId)];
    }

    if (toBranchId) {
      newFilters.toBranchIds = [parseInt(toBranchId)];
    }

    if (selectedStatuses.length > 0) {
      newFilters.status = selectedStatuses;
    }

    // Apply date filters
    if (enableTransferDate || enableReceiveDate) {
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

      if (enableTransferDate) {
        newFilters.fromTransferDate = dateRange.from.toISOString();
        newFilters.toTransferDate = dateRange.to.toISOString();
      }

      if (enableReceiveDate) {
        newFilters.fromReceivedDate = dateRange.from.toISOString();
        newFilters.toReceivedDate = dateRange.to.toISOString();
      }
    }

    onFiltersChange(newFilters);
  };

  // Auto-apply filters when values change
  useEffect(() => {
    applyFilters();
  }, [
    fromBranchId,
    toBranchId,
    selectedStatuses,
    enableTransferDate,
    enableReceiveDate,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    receiveStatus,
  ]);

  const toggleStatus = (status: number) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const removeStatus = (status: number) => {
    setSelectedStatuses((prev) => prev.filter((s) => s !== status));
  };

  const applyPreset = (preset: string) => {
    setSelectedPreset(preset);
    setShowPresetDropdown(false);
    setShowDateModeDropdown(false);
  };

  const clearAllFilters = () => {
    setFromBranchId("");
    setToBranchId("");
    setSelectedStatuses([]);
    setEnableTransferDate(false);
    setEnableReceiveDate(false);
    setDateMode("preset");
    setSelectedPreset("this_month");
    setFromDate("");
    setToDate("");
    setReceiveStatus("all");
    onFiltersChange({});
  };

  return (
    <aside className="w-80 border-r bg-white overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bộ lọc</h2>
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-700">
            Xóa tất cả
          </button>
        </div>

        {/* Chuyển đi */}
        <div>
          <label className="block text-sm font-medium mb-2">Chuyển đi</label>
          <select
            value={fromBranchId}
            onChange={(e) => setFromBranchId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Chọn chi nhánh</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {fromBranchId && (
            <div className="mt-2">
              <select className="w-full border rounded px-3 py-2 text-sm text-gray-500">
                <option>Chọn kho</option>
              </select>
            </div>
          )}
        </div>

        {/* Nhận về */}
        <div>
          <label className="block text-sm font-medium mb-2">Nhận về</label>
          <select
            value={toBranchId}
            onChange={(e) => setToBranchId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Chọn chi nhánh</option>
            {branches?.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {toBranchId && (
            <div className="mt-2">
              <select className="w-full border rounded px-3 py-2 text-sm text-gray-500">
                <option>Chọn kho</option>
              </select>
            </div>
          )}
        </div>

        {/* Trạng thái */}
        <div>
          <label className="block text-sm font-medium mb-2">Trạng thái</label>

          {/* Selected status tags */}
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
            {selectedStatuses.length > 0 && (
              <button
                onClick={() => setSelectedStatuses([])}
                className="text-xs text-blue-600 hover:text-blue-700">
                +1 khác
              </button>
            )}
          </div>

          {/* Status dropdown */}
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
                      type="checkbox"
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

        {/* Thời gian */}
        <div>
          <label className="block text-sm font-medium mb-2">Thời gian</label>

          {/* Date type checkboxes */}
          <div className="space-y-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTransferDate}
                onChange={(e) => setEnableTransferDate(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-sm">Ngày chuyển</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableReceiveDate}
                onChange={(e) => setEnableReceiveDate(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-sm">Ngày nhận</span>
            </label>
          </div>

          {/* Date mode selection */}
          {(enableTransferDate || enableReceiveDate) && (
            <div className="space-y-2">
              <div className="relative">
                <button
                  onClick={() => setShowDateModeDropdown(!showDateModeDropdown)}
                  className={`w-full flex items-center justify-between border rounded px-3 py-2 text-sm ${
                    dateMode === "preset"
                      ? "bg-blue-50 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={dateMode === "preset"}
                      onChange={() => {}}
                      className="cursor-pointer"
                    />
                    <span>
                      {dateMode === "preset"
                        ? TIME_PRESETS.find((p) => p.value === selectedPreset)
                            ?.label
                        : "Tháng này"}
                    </span>
                  </div>
                  {dateMode === "preset" && <ChevronDown className="w-4 h-4" />}
                </button>

                {showDateModeDropdown && dateMode === "preset" && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                    <div className="py-1">
                      {/* Theo ngày */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        Theo ngày
                      </div>
                      {TIME_PRESETS.slice(0, 2).map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyPreset(preset.value)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            selectedPreset === preset.value
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {preset.label}
                        </button>
                      ))}

                      {/* Theo tuần */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                        Theo tuần
                      </div>
                      {TIME_PRESETS.slice(2, 4).map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyPreset(preset.value)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            selectedPreset === preset.value
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {preset.label}
                        </button>
                      ))}

                      {/* Theo tháng */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                        Theo tháng
                      </div>
                      {TIME_PRESETS.slice(4, 6).map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyPreset(preset.value)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            selectedPreset === preset.value
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {preset.label}
                        </button>
                      ))}

                      {/* Theo quý */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                        Theo quý
                      </div>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-400">
                        Quý này
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-400">
                        Quý trước
                      </button>

                      {/* Theo năm */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                        Theo năm
                      </div>
                      {TIME_PRESETS.slice(10, 12).map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyPreset(preset.value)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            selectedPreset === preset.value
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {preset.label}
                        </button>
                      ))}

                      {/* Khoảng cách */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                        Khoảng cách
                      </div>
                      {TIME_PRESETS.slice(6, 8).map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => applyPreset(preset.value)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                            selectedPreset === preset.value
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {preset.label}
                        </button>
                      ))}

                      {/* Âm lịch */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 mt-1">
                        Âm lịch
                      </div>
                      {TIME_PRESETS.slice(8, 10)
                        .concat(TIME_PRESETS.slice(12, 14))
                        .map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => applyPreset(preset.value)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                              selectedPreset === preset.value
                                ? "bg-blue-50 text-blue-600"
                                : ""
                            }`}>
                            {preset.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom date range */}
              <button
                onClick={() => {
                  setDateMode("custom");
                  setShowDateModeDropdown(false);
                }}
                className={`w-full flex items-center gap-2 border rounded px-3 py-2 text-sm ${
                  dateMode === "custom"
                    ? "bg-blue-50 border-blue-500"
                    : "hover:bg-gray-50"
                }`}>
                <input
                  type="radio"
                  checked={dateMode === "custom"}
                  onChange={() => {}}
                  className="cursor-pointer"
                />
                <span>Tùy chỉnh</span>
              </button>

              {dateMode === "custom" && (
                <div className="space-y-2 pl-6">
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                      className="flex-1 px-3 py-1 border rounded text-sm hover:bg-gray-50">
                      Bỏ qua
                    </button>
                    <button
                      onClick={() => applyFilters()}
                      className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Áp dụng
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tình trạng nhận hàng */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tình trạng nhận hàng
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="receiveStatus"
                value="all"
                checked={receiveStatus === "all"}
                onChange={(e) => setReceiveStatus(e.target.value as any)}
                className="cursor-pointer"
              />
              <span className="text-sm">Tất cả</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="receiveStatus"
                value="unmatched"
                checked={receiveStatus === "unmatched"}
                onChange={(e) => setReceiveStatus(e.target.value as any)}
                className="cursor-pointer"
              />
              <span className="text-sm">Không khớp</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="receiveStatus"
                value="matched"
                checked={receiveStatus === "matched"}
                onChange={(e) => setReceiveStatus(e.target.value as any)}
                className="cursor-pointer"
              />
              <span className="text-sm">Khớp</span>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}
