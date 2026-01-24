"use client";

import { useState, useEffect, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useUsers } from "@/lib/hooks/useUsers";
import { ChevronDown } from "lucide-react";
import type { PurchaseOrderFilters } from "@/lib/types/purchase-order";
import {
  PURCHASE_ORDER_STATUS,
  getStatusLabel,
} from "@/lib/types/purchase-order";

interface PurchaseOrderSidebarProps {
  filters: PurchaseOrderFilters;
  setFilters: (filters: Partial<PurchaseOrderFilters>) => void;
}

export function PurchaseOrderSidebar({
  filters,
  setFilters,
}: PurchaseOrderSidebarProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsers();

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedTimeOption, setSelectedTimeOption] = useState("this_month");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const selectedBranch = branches?.find((b) => b.id === filters.branchId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBranchDropdown(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeOptionChange = (option: string) => {
    setSelectedTimeOption(option);
    setShowDatePicker(false);

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
      case "this_week":
        from = new Date(now.setDate(now.getDate() - now.getDay()));
        from.setHours(0, 0, 0, 0);
        to = new Date();
        to.setHours(23, 59, 59, 999);
        break;
      case "this_month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date();
        to.setHours(23, 59, 59, 999);
        break;
      case "last_month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "custom":
        setShowDatePicker(true);
        return;
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
    }
  };

  const resetFilters = () => {
    setFilters({
      branchId: undefined,
      status: undefined,
      createdById: undefined,
      purchaseById: undefined,
      createdDateFrom: undefined,
      createdDateTo: undefined,
    });
    setSelectedTimeOption("this_month");
  };

  const statusOptions = [
    {
      value: PURCHASE_ORDER_STATUS.DRAFT,
      label: getStatusLabel(PURCHASE_ORDER_STATUS.DRAFT),
    },
    {
      value: PURCHASE_ORDER_STATUS.CONFIRMED,
      label: getStatusLabel(PURCHASE_ORDER_STATUS.CONFIRMED),
    },
    {
      value: PURCHASE_ORDER_STATUS.PARTIAL,
      label: getStatusLabel(PURCHASE_ORDER_STATUS.PARTIAL),
    },
    {
      value: PURCHASE_ORDER_STATUS.COMPLETED,
      label: getStatusLabel(PURCHASE_ORDER_STATUS.COMPLETED),
    },
    {
      value: PURCHASE_ORDER_STATUS.CANCELLED,
      label: getStatusLabel(PURCHASE_ORDER_STATUS.CANCELLED),
    },
  ];

  return (
    <div className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bộ lọc</h2>
        <button
          onClick={resetFilters}
          className="text-sm text-blue-600 hover:underline">
          Xóa tất cả
        </button>
      </div>

      <div ref={branchDropdownRef}>
        <label className="text-sm font-medium mb-2 block">Chi nhánh</label>
        <div className="relative">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-gray-50">
            <span className="truncate">
              {selectedBranch ? selectedBranch.name : "Chọn chi nhánh"}
            </span>
            <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
          </button>

          {showBranchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
              <div
                onClick={() => {
                  setFilters({ branchId: undefined });
                  setShowBranchDropdown(false);
                }}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                Tất cả chi nhánh
              </div>
              {branches?.map((branch) => (
                <div
                  key={branch.id}
                  onClick={() => {
                    setFilters({ branchId: branch.id });
                    setShowBranchDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                  {branch.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={statusDropdownRef}>
        <label className="text-sm font-medium mb-2 block">Trạng thái</label>
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-gray-50">
            <span className="truncate">
              {filters.status
                ? getStatusLabel(filters.status)
                : "Chọn trạng thái"}
            </span>
            <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
          </button>

          {showStatusDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
              <div
                onClick={() => {
                  setFilters({ status: undefined });
                  setShowStatusDropdown(false);
                }}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                Tất cả trạng thái
              </div>
              {statusOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    setFilters({ status: option.value });
                    setShowStatusDropdown(false);
                  }}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Thời gian</label>
        <div className="space-y-2">
          {[
            { value: "today", label: "Hôm nay" },
            { value: "yesterday", label: "Hôm qua" },
            { value: "this_week", label: "Tuần này" },
            { value: "this_month", label: "Tháng này" },
            { value: "last_month", label: "Tháng trước" },
            { value: "custom", label: "Tùy chỉnh" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="time"
                value={option.value}
                checked={selectedTimeOption === option.value}
                onChange={(e) => handleTimeOptionChange(e.target.value)}
                className="cursor-pointer"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>

        {showDatePicker && (
          <div className="mt-3 space-y-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleCustomDateApply}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              Áp dụng
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Người tạo</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
          value={filters.createdById || ""}
          onChange={(e) =>
            setFilters({
              createdById: e.target.value ? Number(e.target.value) : undefined,
            })
          }>
          <option value="">Chọn người tạo</option>
          {users?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Người nhận đặt</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
          value={filters.purchaseById || ""}
          onChange={(e) =>
            setFilters({
              purchaseById: e.target.value ? Number(e.target.value) : undefined,
            })
          }>
          <option value="">Chọn người nhận đặt</option>
          {users?.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
