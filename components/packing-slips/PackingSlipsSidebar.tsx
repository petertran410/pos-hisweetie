"use client";

import { useState, useEffect } from "react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";

interface PackingSlipsSidebarProps {
  onFiltersChange: (filters: any) => void;
}

export function PackingSlipsSidebar({
  onFiltersChange,
}: PackingSlipsSidebarProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    if (selectedBranch) {
      setBranchId(selectedBranch.id.toString());
    }
  }, [selectedBranch]);

  useEffect(() => {
    const filters: any = {};
    if (branchId) filters.branchId = parseInt(branchId);
    onFiltersChange(filters);
  }, [branchId, onFiltersChange]);

  const clearAllFilters = () => {
    setBranchId("");
    onFiltersChange({});
  };

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
