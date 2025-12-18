"use client";

import { useState } from "react";
import { useBranches } from "@/lib/hooks/useBranches";

interface CostConfirmationModalProps {
  onConfirm: (scope: "all" | "specific", branchId?: number) => void;
  onCancel: () => void;
}

export function CostConfirmationModal({
  onConfirm,
  onCancel,
}: CostConfirmationModalProps) {
  const [scope, setScope] = useState<"all" | "specific">("all");
  const [selectedBranchId, setSelectedBranchId] = useState<
    number | undefined
  >();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  const { data: branches } = useBranches();

  const selectedBranch = branches?.find((b) => b.id === selectedBranchId);

  const handleConfirm = () => {
    if (scope === "specific" && !selectedBranchId) {
      alert("Vui lòng chọn chi nhánh");
      return;
    }
    onConfirm(scope, selectedBranchId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Xác nhận</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn muốn áp dụng giá vốn cho sản phẩm này trên:
          </p>

          {/* Radio Options */}
          <div className="space-y-3">
            {/* Toàn hệ thống */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "all"}
                onChange={() => {
                  setScope("all");
                  setSelectedBranchId(undefined);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Toàn hệ thống</span>
            </label>

            {/* Chi nhánh cụ thể */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "specific"}
                  onChange={() => setScope("specific")}
                  className="w-4 h-4"
                />
                <span className="text-sm">Chi nhánh</span>
              </label>

              {/* Branch Dropdown */}
              {scope === "specific" && (
                <div className="ml-6 mt-2 relative">
                  <button
                    type="button"
                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                    className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className="text-sm">
                      {selectedBranch?.name || "Kho Hà Nội"}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        showBranchDropdown ? "rotate-180" : ""
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

                  {showBranchDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {branches?.map((branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranchId(branch.id);
                            setShowBranchDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                            selectedBranchId === branch.id
                              ? "bg-blue-50 text-blue-600"
                              : ""
                          }`}>
                          {branch.name}
                          {selectedBranchId === branch.id && (
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
