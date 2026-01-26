"use client";

import { useState, useRef, useEffect } from "react";
import type { PurchaseOrderFilters } from "@/lib/types/purchase-order";
import { useBranches } from "@/lib/hooks/useBranches";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsers } from "@/lib/hooks/useUsers";
import { ChevronDown, X } from "lucide-react";

interface PurchaseOrderSidebarProps {
  filters: PurchaseOrderFilters;
  setFilters: (filters: Partial<PurchaseOrderFilters>) => void;
}

export function PurchaseOrderSidebar({
  filters,
  setFilters,
}: PurchaseOrderSidebarProps) {
  const { data: branches } = useBranches();
  const { data: suppliersData } = useSuppliers({});
  const { data: users } = useUsers();

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedTimeOption, setSelectedTimeOption] = useState("this_month");

  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const selectedBranch = branches?.find((b) => b.id === filters.branchId);
  const selectedSupplier = suppliersData?.data?.find(
    (s) => s.id === filters.supplierId
  );

  const statusOptions = [
    { value: 0, label: "Phiếu tạm" },
    { value: 1, label: "Đã nhập hàng" },
    { value: 2, label: "Đã hủy" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBranchDropdown(false);
      }
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false);
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

  return (
    <div className="w-80 bg-white border-r p-4 overflow-y-auto ml-4 mt-4 mb-4 rounded-xl">
      <div className="mb-6" ref={branchDropdownRef}>
        <label className="text-sm font-medium mb-2 block">Chi nhánh</label>
        <div className="relative">
          {selectedBranch ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm">
              <span className="flex-1">{selectedBranch.name}</span>
              <button
                onClick={() => setFilters({ branchId: undefined })}
                className="text-blue-500 hover:text-blue-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-gray-50">
                <span className="text-gray-400">Chọn chi nhánh</span>
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
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Kho hàng</label>
        <select className="w-full border rounded px-3 py-2 text-sm">
          <option value="">Chọn kho hàng</option>
        </select>
      </div>

      <div className="mb-6" ref={statusDropdownRef}>
        <label className="text-sm font-medium mb-2 block">Trạng thái</label>
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-gray-50">
            <span className="truncate">
              {filters.status !== undefined
                ? statusOptions.find((s) => s.value === filters.status)?.label
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

      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Thời gian</label>
        <div className="space-y-1">
          <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="radio"
              name="time"
              value="this_month"
              checked={selectedTimeOption === "this_month"}
              onChange={(e) => setSelectedTimeOption(e.target.value)}
              className="cursor-pointer"
            />
            <span className="text-sm">Tháng này</span>
          </label>
          <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
            <input
              type="radio"
              name="time"
              value="custom"
              checked={selectedTimeOption === "custom"}
              onChange={(e) => setSelectedTimeOption(e.target.value)}
              className="cursor-pointer"
            />
            <span className="text-sm">Tùy chỉnh</span>
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Người tạo</label>
        <input
          type="text"
          placeholder="Chọn người tạo"
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-6" ref={supplierDropdownRef}>
        <label className="text-sm font-medium mb-2 block">Nhà cung cấp</label>
        <div className="relative">
          {selectedSupplier ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded text-sm">
              <span className="flex-1">{selectedSupplier.name}</span>
              <button
                onClick={() => setFilters({ supplierId: undefined })}
                className="text-blue-500 hover:text-blue-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                className="w-full flex items-center justify-between border rounded px-3 py-2 text-sm hover:bg-gray-50">
                <span className="text-gray-400">Chọn nhà cung cấp</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />
              </button>

              {showSupplierDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                  {suppliersData?.data?.map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => {
                        setFilters({ supplierId: supplier.id });
                        setShowSupplierDropdown(false);
                      }}
                      className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                      {supplier.name}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
