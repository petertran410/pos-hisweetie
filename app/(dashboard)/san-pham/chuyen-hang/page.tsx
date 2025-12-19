"use client";

import { useState, useEffect } from "react";
import { useTransfers } from "@/lib/hooks/useTransfers";
import { useBranches } from "@/lib/hooks/useBranches";
import { TransferTable } from "@/components/transfers/TransferTable";
import { TransferForm } from "@/components/transfers/TransferForm";
import { Plus, FileDown, FileUp, Settings2, X } from "lucide-react";
import type { Transfer } from "@/lib/api/transfers";
import type { TransferQueryParams } from "@/lib/api/transfers";

export default function TransferPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null
  );
  const [showColumnModal, setShowColumnModal] = useState(false);

  // Filter states
  const [fromBranchId, setFromBranchId] = useState<string>("");
  const [toBranchId, setToBranchId] = useState<string>("");
  const [selectedStatuses, setSelectedStatuses] = useState<number[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Time filter states
  const [enableTransferDate, setEnableTransferDate] = useState(false);
  const [enableReceiveDate, setEnableReceiveDate] = useState(false);
  const [timeMode, setTimeMode] = useState<"preset" | "custom">("preset");
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("this_month");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  // Receive status filter
  const [receiveStatus, setReceiveStatus] = useState<string>("all");

  const { data: branches } = useBranches();

  const buildQueryParams = (): TransferQueryParams => {
    const params: TransferQueryParams = {};

    if (fromBranchId) params.fromBranchIds = [parseInt(fromBranchId)];
    if (toBranchId) params.toBranchIds = [parseInt(toBranchId)];
    if (selectedStatuses.length > 0) params.status = selectedStatuses;

    if (enableTransferDate && fromDate && toDate) {
      params.fromTransferDate = fromDate.toISOString();
      params.toTransferDate = toDate.toISOString();
    }

    if (enableReceiveDate && fromDate && toDate) {
      params.fromReceivedDate = fromDate.toISOString();
      params.toReceivedDate = toDate.toISOString();
    }

    return params;
  };

  const queryParams = buildQueryParams();
  const { data, isLoading } = useTransfers(queryParams);

  const filteredData = data?.data
    ? data.data.filter((transfer) => {
        if (receiveStatus === "all") return true;

        const isMatched = transfer.details?.every(
          (d) => Number(d.receivedQuantity) === Number(d.sendQuantity)
        );

        return receiveStatus === "matched" ? isMatched : !isMatched;
      })
    : [];

  const STATUS_OPTIONS = [
    { value: 1, label: "Phiếu tạm", color: "bg-gray-100 text-gray-700" },
    { value: 2, label: "Đang chuyển", color: "bg-blue-100 text-blue-700" },
    { value: 3, label: "Đã nhận", color: "bg-green-100 text-green-700" },
    { value: 4, label: "Đã hủy", color: "bg-red-100 text-red-700" },
  ];

  const TIME_PRESETS = [
    { value: "today", label: "Hôm nay" },
    { value: "yesterday", label: "Hôm qua" },
    { value: "this_week", label: "Tuần này" },
    { value: "last_week", label: "Tuần trước" },
    { value: "this_month", label: "Tháng này" },
    { value: "last_month", label: "Tháng trước" },
    { value: "last_7_days", label: "7 ngày qua" },
    { value: "last_30_days", label: "30 ngày qua" },
    { value: "this_quarter", label: "Quý này" },
    { value: "last_quarter", label: "Quý trước" },
    { value: "this_year", label: "Năm nay" },
    { value: "last_year", label: "Năm trước" },
  ];

  const applyTimePreset = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (preset) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        start = new Date(now.setDate(now.getDate() - 1));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case "this_week":
        const day = now.getDay();
        start = new Date(
          now.setDate(now.getDate() - day + (day === 0 ? -6 : 1))
        );
        start.setHours(0, 0, 0, 0);
        end = new Date();
        break;
      case "last_week":
        const lastWeekStart = new Date(
          now.setDate(now.getDate() - now.getDay() - 6)
        );
        start = new Date(lastWeekStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(lastWeekStart.setDate(lastWeekStart.getDate() + 6));
        end.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "last_7_days":
        start = new Date(now.setDate(now.getDate() - 7));
        end = new Date();
        break;
      case "last_30_days":
        start = new Date(now.setDate(now.getDate() - 30));
        end = new Date();
        break;
      case "this_quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date();
        break;
      case "last_quarter":
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        start = new Date(now.getFullYear(), lastQuarter * 3, 1);
        end = new Date(now.getFullYear(), (lastQuarter + 1) * 3, 0);
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
        break;
      case "last_year":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }

    setFromDate(start);
    setToDate(end);
    setSelectedPreset(preset);
    setShowTimeDropdown(false);
  };

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

  const clearAllFilters = () => {
    setFromBranchId("");
    setToBranchId("");
    setSelectedStatuses([]);
    setEnableTransferDate(false);
    setEnableReceiveDate(false);
    setFromDate(null);
    setToDate(null);
    setReceiveStatus("all");
  };

  useEffect(() => {
    if (timeMode === "preset") {
      applyTimePreset(selectedPreset);
    }
  }, [timeMode]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Chuyển đi */}
          <div>
            <label className="block text-sm font-medium mb-2">Chuyển đi</label>
            <select
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white">
              <option value="">Chọn chi nhánh</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nhận về */}
          <div>
            <label className="block text-sm font-medium mb-2">Nhận về</label>
            <select
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white">
              <option value="">Chọn kho</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Trạng thái <span className="text-red-500">*</span>
            </label>

            {selectedStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedStatuses.map((status) => {
                  const option = STATUS_OPTIONS.find(
                    (opt) => opt.value === status
                  );
                  return (
                    <span
                      key={status}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${option?.color}`}>
                      {option?.label}
                      <button
                        onClick={() => removeStatus(status)}
                        className="hover:bg-black/10 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full border rounded px-3 py-2 bg-white text-left flex items-center justify-between">
                <span className="text-gray-500">
                  {selectedStatuses.length > 0
                    ? `Đã chọn ${selectedStatuses.length}`
                    : "Chọn trạng thái"}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showStatusDropdown ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showStatusDropdown && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded shadow-lg z-10">
                  {STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(option.value)}
                        onChange={() => toggleStatus(option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedStatuses.length > 0 && (
              <button
                onClick={() => setSelectedStatuses([])}
                className="text-sm text-blue-600 hover:text-blue-700 mt-2">
                +1 khác
              </button>
            )}
          </div>

          {/* Thời gian */}
          <div>
            <label className="block text-sm font-medium mb-2">Thời gian</label>

            <div className="space-y-2 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableTransferDate}
                  onChange={(e) => setEnableTransferDate(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Ngày chuyển</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableReceiveDate}
                  onChange={(e) => setEnableReceiveDate(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Ngày nhận</span>
              </label>
            </div>

            {(enableTransferDate || enableReceiveDate) && (
              <>
                <div className="space-y-2 mb-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={timeMode === "preset"}
                      onChange={() => setTimeMode("preset")}
                      className="rounded-full"
                    />
                    <span className="text-sm flex-1">Tháng này</span>
                    <button
                      onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                      className="text-blue-600 hover:text-blue-700">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={timeMode === "custom"}
                      onChange={() => setTimeMode("custom")}
                      className="rounded-full"
                    />
                    <span className="text-sm flex-1">Tùy chỉnh</span>
                    {timeMode === "custom" && (
                      <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="text-blue-600 hover:text-blue-700">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                    )}
                  </label>
                </div>

                {showTimeDropdown && timeMode === "preset" && (
                  <div className="bg-white border rounded shadow-lg p-2 space-y-1 mb-3">
                    {TIME_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => applyTimePreset(preset.value)}
                        className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-50 ${
                          selectedPreset === preset.value
                            ? "bg-blue-50 text-blue-600"
                            : ""
                        }`}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                )}

                {showCalendar && timeMode === "custom" && (
                  <div className="bg-white border rounded shadow-lg p-4 mb-3">
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">
                          Từ ngày: {fromDate?.toLocaleDateString("vi-VN")}
                        </label>
                        <input
                          type="date"
                          value={fromDate?.toISOString().split("T")[0] || ""}
                          onChange={(e) =>
                            setFromDate(new Date(e.target.value))
                          }
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">
                          Đến ngày: {toDate?.toLocaleDateString("vi-VN")}
                        </label>
                        <input
                          type="date"
                          value={toDate?.toISOString().split("T")[0] || ""}
                          onChange={(e) => setToDate(new Date(e.target.value))}
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="flex-1 px-3 py-1.5 border rounded text-sm hover:bg-gray-50">
                        Bỏ qua
                      </button>
                      <button
                        onClick={() => setShowCalendar(false)}
                        className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        Áp dụng
                      </button>
                    </div>
                  </div>
                )}

                {fromDate && toDate && (
                  <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded">
                    Từ ngày: {fromDate.toLocaleDateString("vi-VN")} - Đến ngày:{" "}
                    {toDate.toLocaleDateString("vi-VN")}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tình trạng nhận hàng */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Tình trạng nhận hàng
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={receiveStatus === "all"}
                  onChange={() => setReceiveStatus("all")}
                  className="rounded-full"
                />
                <span className="text-sm">Tất cả</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={receiveStatus === "unmatched"}
                  onChange={() => setReceiveStatus("unmatched")}
                  className="rounded-full"
                />
                <span className="text-sm">Không khớp</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={receiveStatus === "matched"}
                  onChange={() => setReceiveStatus("matched")}
                  className="rounded-full"
                />
                <span className="text-sm">Khớp</span>
              </label>
            </div>
          </div>

          {/* Clear filters button */}
          {(fromBranchId ||
            toBranchId ||
            selectedStatuses.length > 0 ||
            enableTransferDate ||
            enableReceiveDate ||
            receiveStatus !== "all") && (
            <button
              onClick={clearAllFilters}
              className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded">
              Xóa bộ lọc
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between bg-white">
          <h1 className="text-2xl font-bold">Chuyển hàng</h1>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
              <FileUp className="w-4 h-4" />
              Import file
            </button>

            <button className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50">
              <FileDown className="w-4 h-4" />
              Xuất file
            </button>

            <button
              onClick={() => setShowColumnModal(!showColumnModal)}
              className="flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 relative">
              <Settings2 className="w-4 h-4" />
              Cột hiển thị
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Chuyển hàng
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <TransferTable
            transfers={filteredData}
            isLoading={isLoading}
            onEdit={(transfer) => {
              setSelectedTransfer(transfer);
              setShowForm(true);
            }}
            showColumnModal={showColumnModal}
            onCloseColumnModal={() => setShowColumnModal(false)}
          />
        </div>
      </main>

      {/* Transfer Form Modal */}
      {showForm && (
        <TransferForm
          transfer={selectedTransfer}
          onClose={() => {
            setShowForm(false);
            setSelectedTransfer(null);
          }}
        />
      )}
    </div>
  );
}
