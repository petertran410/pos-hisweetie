"use client";

import { useState, useEffect, useRef } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { ChevronDown } from "lucide-react";

interface PackingSlipsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "dong-hang", label: "Đóng hàng" },
  { value: "loading", label: "Loading" },
  { value: "giao-hang", label: "Giao hàng" },
];

export function PackingSlipsSidebar({
  onFiltersChange,
}: PackingSlipsSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState("");
  const [type, setType] = useState("all");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedBranch) {
      setBranchId(selectedBranch.id.toString());
    }
  }, [selectedBranch]);

  useEffect(() => {
    const filters: any = {};
    if (branchId) filters.branchId = parseInt(branchId);
    if (type && type !== "all") filters.type = type;
    onFiltersChange(filters);
  }, [branchId, type, onFiltersChange]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTypeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearAllFilters = () => {
    setBranchId("");
    setType("all");
    onFiltersChange({});
  };

  const selectedTypeLabel =
    TYPE_OPTIONS.find((opt) => opt.value === type)?.label || "Tất cả";

  return (
    <aside className="w-72 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll p-4 space-y-6 bg-white shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bộ lọc</h2>
        <button
          onClick={clearAllFilters}
          className="text-sm text-blue-600 hover:text-blue-700">
          Xóa tất cả
        </button>
      </div>

      <div ref={typeDropdownRef} className="relative">
        <label className="block text-sm font-medium mb-2">Loại</label>
        <div
          onClick={() => setShowTypeDropdown(!showTypeDropdown)}
          className="w-full border rounded px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <span>{selectedTypeLabel}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

        {showTypeDropdown && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {TYPE_OPTIONS.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  setType(option.value);
                  setShowTypeDropdown(false);
                }}
                className={`px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm ${
                  option.value === type ? "bg-blue-50 text-blue-600" : ""
                }`}>
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Chi nhánh</label>
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
    </aside>
  );
}
