"use client";

import { useState } from "react";
import { useCreateCollectionBranch } from "@/lib/hooks/useCashflowCollectionBranches";
import { X } from "lucide-react";

interface CreateCashFlowCollectionBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCashFlowCollectionBranchModal({
  isOpen,
  onClose,
}: CreateCashFlowCollectionBranchModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createBranch = useCreateCollectionBranch();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Vui lòng nhập tên chi nhánh");
      return;
    }

    try {
      await createBranch.mutateAsync({
        name: name.trim(),
        description: description.trim(),
      });
      setName("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error creating collection branch:", error);
      alert("Có lỗi xảy ra khi tạo chi nhánh");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Tạo chi nhánh cần thu/chi</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tên chi nhánh <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bắt buộc"
              className="w-full px-3 py-2 border rounded-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mô tả</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={createBranch.isPending}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand disabled:opacity-50">
              {createBranch.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
