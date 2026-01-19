"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";

interface SelectBranchModalProps {
  onClose: () => void;
  onConfirm: (sourceBranchId: number, destinationBranchId: number) => void;
}

export function SelectBranchModal({
  onClose,
  onConfirm,
}: SelectBranchModalProps) {
  const { data: branches } = useBranches();
  const [sourceBranchId, setSourceBranchId] = useState<number | null>(null);
  const [destinationBranchId, setDestinationBranchId] = useState<number | null>(
    null
  );

  const handleConfirm = () => {
    if (!sourceBranchId || !destinationBranchId) {
      alert("Vui lòng chọn chi nhánh đầu vào và chi nhánh đầu ra");
      return;
    }
    onConfirm(sourceBranchId, destinationBranchId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chọn kho hàng</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Bạn cần chọn kho trước khi tạo phiếu
          </p>

          <div>
            <div>
              <label className="block text-sm mb-1 items-center gap-2">
                Chi nhánh đầu vào
              </label>
              <select
                value={sourceBranchId || ""}
                onChange={(e) => setSourceBranchId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Chọn kho</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div>
              <label className="block text-sm mb-1 items-center gap-2">
                Chi nhánh đầu ra
              </label>
              <select
                value={destinationBranchId || ""}
                onChange={(e) => setDestinationBranchId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Chọn kho</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
