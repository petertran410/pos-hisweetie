"use client";

import { useEffect, useRef, useState } from "react";
import { useSupplierGroups } from "@/lib/hooks/useSuppliers";
import { SupplierFilters } from "@/lib/types/supplier";
import { SupplierGroupModal } from "./SupplierGroupModal";
import { SupplierGroup } from "@/lib/types/supplier";

interface SuppliersSidebarProps {
  filters: SupplierFilters;
  setFilters: (filters: Partial<SupplierFilters>) => void;
}

export function SuppliersSidebar({
  filters,
  setFilters,
}: SuppliersSidebarProps) {
  const { data: groupsData } = useSupplierGroups();
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SupplierGroup | undefined>();
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [selectedTimeOption, setSelectedTimeOption] = useState<string>("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);

  const resetFilters = () => {
    setFilters({
      pageSize: 15,
      currentItem: 0,
      orderBy: "createdAt",
      orderDirection: "desc",
      isActive: true,
      groupId: undefined,
      createdDateFrom: undefined,
      createdDateTo: undefined,
      totalInvoicedFrom: undefined,
      totalInvoicedTo: undefined,
      debtFrom: undefined,
      debtTo: undefined,
    });
    setSelectedTimeOption("all");
    setDateFrom("");
    setDateTo("");
  };

  const handleTimeOptionSelect = (option: string) => {
    setSelectedTimeOption(option);
    setShowTimeOptions(false);

    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;

    switch (option) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "yesterday":
        from = new Date(now.setDate(now.getDate() - 1));
        from.setHours(0, 0, 0, 0);
        to = new Date(from);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisWeek":
        from = new Date(now.setDate(now.getDate() - now.getDay()));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "lastWeek":
        from = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date(now.setDate(now.getDate() - now.getDay() - 1));
        to.setHours(23, 59, 59, 999);
        break;
      case "last7Days":
        from = new Date(now.setDate(now.getDate() - 7));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "thisMonth":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
        break;
      case "lastMonth":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "last30Days":
        from = new Date(now.setDate(now.getDate() - 30));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        break;
      case "thisQuarter":
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        to = new Date();
        break;
      case "lastQuarter":
        const lastQ = Math.floor(now.getMonth() / 3) - 1;
        from = new Date(now.getFullYear(), lastQ * 3, 1);
        to = new Date(now.getFullYear(), lastQ * 3 + 3, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "thisYear":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date();
        break;
      case "lastYear":
        from = new Date(now.getFullYear() - 1, 0, 1);
        to = new Date(now.getFullYear() - 1, 11, 31);
        to.setHours(23, 59, 59, 999);
        break;
      case "all":
      default:
        from = undefined;
        to = undefined;
        break;
    }

    setFilters({
      createdDateFrom: from?.toISOString(),
      createdDateTo: to?.toISOString(),
    });
  };

  const handleCustomDateApply = () => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      setFilters({
        createdDateFrom: from.toISOString(),
        createdDateTo: to.toISOString(),
      });
      setShowDatePicker(false);
      setSelectedTimeOption("custom");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-md font-medium">Nhóm nhà cung cấp</label>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:underline">
            Tạo mới
          </button>
        </div>
        <div className="flex gap-3">
          <select
            className="flex-1 border rounded-md px-3 py-2 text-sm"
            value={filters.groupId || ""}
            onChange={(e) =>
              setFilters({
                groupId: e.target.value ? Number(e.target.value) : undefined,
              })
            }>
            <option value="">Tất cả các nhóm</option>
            {groupsData?.data &&
              Array.isArray(groupsData.data) &&
              groupsData.data.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>
          <button
            onClick={() => setShowGroupModal(true)}
            className="px-3 py-2 border rounded hover:bg-gray-50">
            +
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Tổng mua</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.totalInvoicedFrom || ""}
            onChange={(e) =>
              setFilters({
                totalInvoicedFrom: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Đến"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.totalInvoicedTo || ""}
            onChange={(e) =>
              setFilters({
                totalInvoicedTo: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Thời gian</label>
        <div className="space-y-2">
          <button
            onClick={() => setShowTimeOptions(!showTimeOptions)}
            className="w-full border rounded px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between">
            <span>
              {selectedTimeOption === "all" && "Toàn thời gian"}
              {selectedTimeOption === "today" && "Hôm nay"}
              {selectedTimeOption === "yesterday" && "Hôm qua"}
              {selectedTimeOption === "thisWeek" && "Tuần này"}
              {selectedTimeOption === "lastWeek" && "Tuần trước"}
              {selectedTimeOption === "last7Days" && "7 ngày qua"}
              {selectedTimeOption === "thisMonth" && "Tháng này"}
              {selectedTimeOption === "lastMonth" && "Tháng trước"}
              {selectedTimeOption === "last30Days" && "30 ngày qua"}
              {selectedTimeOption === "thisQuarter" && "Quý này"}
              {selectedTimeOption === "lastQuarter" && "Quý trước"}
              {selectedTimeOption === "thisYear" && "Năm này"}
              {selectedTimeOption === "lastYear" && "Năm trước"}
              {selectedTimeOption === "custom" && `${dateFrom} - ${dateTo}`}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${
                showTimeOptions ? "rotate-180" : ""
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

          {showTimeOptions && (
            <div className="absolute z-10 w-56 bg-white border rounded-lg shadow-lg">
              <div className="p-2 space-y-1">
                <div className="font-medium text-xs text-gray-500 px-2 py-1">
                  Theo ngày
                </div>
                <button
                  onClick={() => handleTimeOptionSelect("today")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Hôm nay
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("yesterday")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Hôm qua
                </button>

                <div className="font-medium text-xs text-gray-500 px-2 py-1 mt-2">
                  Theo tuần
                </div>
                <button
                  onClick={() => handleTimeOptionSelect("thisWeek")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Tuần này
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("lastWeek")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Tuần trước
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("last7Days")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  7 ngày qua
                </button>

                <div className="font-medium text-xs text-gray-500 px-2 py-1 mt-2">
                  Theo tháng
                </div>
                <button
                  onClick={() => handleTimeOptionSelect("thisMonth")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Tháng này
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("lastMonth")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Tháng trước
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("last30Days")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  30 ngày qua
                </button>

                <div className="font-medium text-xs text-gray-500 px-2 py-1 mt-2">
                  Theo quý
                </div>
                <button
                  onClick={() => handleTimeOptionSelect("thisQuarter")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Quý này
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("lastQuarter")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Quý trước
                </button>

                <div className="font-medium text-xs text-gray-500 px-2 py-1 mt-2">
                  Theo năm
                </div>
                <button
                  onClick={() => handleTimeOptionSelect("thisYear")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Năm này
                </button>
                <button
                  onClick={() => handleTimeOptionSelect("lastYear")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded">
                  Năm trước
                </button>

                <div className="border-t my-1"></div>
                <button
                  onClick={() => handleTimeOptionSelect("all")}
                  className="w-full px-2 py-1 text-sm text-left hover:bg-gray-50 rounded font-medium">
                  Toàn thời gian
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="w-full border rounded px-3 py-2 text-sm text-left hover:bg-gray-50">
            Tùy chỉnh
          </button>

          {showDatePicker && (
            <div className="border rounded p-3 space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 px-2 py-1 border rounded text-sm hover:bg-gray-50">
                  Bỏ qua
                </button>
                <button
                  onClick={handleCustomDateApply}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Nợ hiện tại</label>
        <div className="space-y-2">
          <input
            type="number"
            placeholder="Từ"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.debtFrom || ""}
            onChange={(e) =>
              setFilters({
                debtFrom: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <input
            type="number"
            placeholder="Đến"
            className="w-full border rounded px-3 py-2 text-sm"
            value={filters.debtTo || ""}
            onChange={(e) =>
              setFilters({
                debtTo: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Trạng thái</label>
        <div className="space-y-2">
          <button
            onClick={() => setFilters({ isActive: undefined })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === undefined
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Tất cả
          </button>
          <button
            onClick={() => setFilters({ isActive: true })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === true
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Đang hoạt động
          </button>
          <button
            onClick={() => setFilters({ isActive: false })}
            className={`w-full px-3 py-2 rounded text-sm text-left ${
              filters.isActive === false
                ? "bg-blue-50 text-blue-600"
                : "hover:bg-gray-50"
            }`}>
            Ngừng hoạt động
          </button>
        </div>
      </div>

      {showGroupModal && (
        <SupplierGroupModal
          group={editingGroup}
          onClose={() => {
            setShowGroupModal(false);
            setEditingGroup(undefined);
          }}
        />
      )}
    </div>
  );
}
