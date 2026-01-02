"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsers } from "@/lib/hooks/useUsers";
import { useBankAccounts } from "@/lib/hooks/useBankAccounts";
import { ChevronDown } from "lucide-react";

interface CashFlowsSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: "all", label: "Tổng quỹ" },
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Ngân hàng" },
  { value: "ewallet", label: "Ví điện tử" },
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

const STATUS_OPTIONS = [
  { value: 0, label: "Đã thanh toán" },
  { value: 1, label: "Đã hủy" },
];

const PARTNER_TYPE_OPTIONS = [
  { value: "A", label: "Tất cả" },
  { value: "C", label: "Khách hàng" },
  { value: "S", label: "Nhà cung cấp" },
  { value: "U", label: "Nhân viên" },
  { value: "D", label: "Đối tác giao hàng" },
  { value: "O", label: "Khác" },
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

export function CashFlowsSidebar({
  filters,
  onFiltersChange,
}: CashFlowsSidebarProps) {
  const [accountType, setAccountType] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [dateMode, setDateMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState("30_days");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isReceipt, setIsReceipt] = useState<string>("all");
  const [selectedCashFlowGroup, setSelectedCashFlowGroup] =
    useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<number[]>([]);
  const [usedForFinancialReporting, setUsedForFinancialReporting] =
    useState<string>("all");
  const [creatorId, setCreatorId] = useState<string>("");
  const [partnerType, setPartnerType] = useState("A");
  const [partnerName, setPartnerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const { data: branchesData } = useBranches();
  const { data: usersData } = useUsers();

  const branches = branchesData || [];
  const users = usersData || [];

  useEffect(() => {
    applyFilters();
  }, [
    accountType,
    selectedBranch,
    dateMode,
    selectedPreset,
    fromDate,
    toDate,
    isReceipt,
    selectedCashFlowGroup,
    selectedStatus,
    usedForFinancialReporting,
    creatorId,
    partnerType,
    partnerName,
    contactNumber,
  ]);

  const applyFilters = () => {
    const newFilters: any = {};

    if (selectedBranch) {
      newFilters.branchIds = [parseInt(selectedBranch)];
    }

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
    newFilters.startDate = dateRange.from.toISOString();
    newFilters.endDate = dateRange.to.toISOString();

    if (isReceipt !== "all") {
      newFilters.isReceipt = isReceipt === "receipt";
    }

    if (selectedStatus.length > 0) {
      newFilters.status = selectedStatus[0];
    }

    if (usedForFinancialReporting !== "all") {
      newFilters.usedForFinancialReporting = parseInt(
        usedForFinancialReporting
      );
    }

    if (creatorId) {
      newFilters.userId = parseInt(creatorId);
    }

    if (partnerType !== "A") {
      newFilters.partnerType = partnerType;
    }

    if (partnerName) {
      newFilters.partnerName = partnerName;
    }

    if (contactNumber) {
      newFilters.contactNumber = contactNumber;
    }

    onFiltersChange(newFilters);
  };

  const toggleStatus = (status: number) => {
    setSelectedStatus((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [status]
    );
  };

  return (
    <div className="w-80 border-r bg-white overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-3">Loại quỹ</label>
          <div className="space-y-2">
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="accountType"
                  value={option.value}
                  checked={accountType === option.value}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="cursor-pointer"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Chi nhánh</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Chọn chi nhánh</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Thời gian</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={dateMode === "preset"}
                onChange={() => setDateMode("preset")}
                className="cursor-pointer"
              />
              <div className="flex-1 relative">
                <button
                  onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center justify-between">
                  <span>
                    {TIME_PRESETS.find((p) => p.value === selectedPreset)
                      ?.label || "30 ngày qua"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showPresetDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => {
                          setSelectedPreset(preset.value);
                          setShowPresetDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={dateMode === "custom"}
                onChange={() => setDateMode("custom")}
                className="cursor-pointer"
              />
              <span className="text-sm">Tùy chỉnh</span>
            </label>

            {dateMode === "custom" && (
              <div className="ml-6 space-y-2">
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Loại chứng từ
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isReceipt === "all" || isReceipt === "receipt"}
                onChange={() =>
                  setIsReceipt(isReceipt === "receipt" ? "all" : "receipt")
                }
                className="cursor-pointer"
              />
              <span className="text-sm">Phiếu thu</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isReceipt === "all" || isReceipt === "payment"}
                onChange={() =>
                  setIsReceipt(isReceipt === "payment" ? "all" : "payment")
                }
                className="cursor-pointer"
              />
              <span className="text-sm">Phiếu chi</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Loại thu chi</label>
          <input
            type="text"
            placeholder="Chọn loại thu chi"
            value={selectedCashFlowGroup}
            onChange={(e) => setSelectedCashFlowGroup(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Trạng thái</label>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((status) => (
              <label
                key={status.value}
                className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStatus.includes(status.value)}
                  onChange={() => toggleStatus(status.value)}
                  className="cursor-pointer"
                />
                <span className="text-sm">{status.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Hạch toán kết quả kinh doanh
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setUsedForFinancialReporting("all")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                usedForFinancialReporting === "all"
                  ? "bg-blue-500 text-white"
                  : "border"
              }`}>
              Tất cả
            </button>
            <button
              onClick={() => setUsedForFinancialReporting("1")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                usedForFinancialReporting === "1"
                  ? "bg-blue-500 text-white"
                  : "border"
              }`}>
              Có
            </button>
            <button
              onClick={() => setUsedForFinancialReporting("0")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                usedForFinancialReporting === "0"
                  ? "bg-blue-500 text-white"
                  : "border"
              }`}>
              Không
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Người tạo</label>
          <select
            value={creatorId}
            onChange={(e) => setCreatorId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="">Chọn người tạo</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Người nộp/nhận
          </label>
          <select
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-2">
            {PARTNER_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Tên, mã người nộp/nhận"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
          />
          <input
            type="text"
            placeholder="Số điện thoại"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}
