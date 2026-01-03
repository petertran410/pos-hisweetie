"use client";

import { useState } from "react";
import { useCreateCashFlowGroup } from "@/lib/hooks/useCashflowGroups";
import { X } from "lucide-react";

interface CreateCashFlowGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isReceipt: boolean;
}

export function CreateCashFlowGroupModal({
  isOpen,
  onClose,
  isReceipt,
}: CreateCashFlowGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createGroup = useCreateCashFlowGroup();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Vui lòng nhập tên loại thu/chi");
      return;
    }

    try {
      await createGroup.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        isReceipt,
      });
      setName("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error creating cashflow group:", error);
      alert("Có lỗi xảy ra khi tạo loại thu/chi");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Tạo loại thu</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tên loại thu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bất buộc"
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="financialReporting"
              defaultChecked
              className="cursor-pointer"
            />
            <label htmlFor="financialReporting" className="text-sm">
              Hạch toán kết quả kinh doanh
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="financialActivity"
              defaultChecked
              className="cursor-pointer"
            />
            <label
              htmlFor="financialActivity"
              className="text-sm flex items-center gap-1">
              Hạch toán vào kết quả hoạt động kinh doanh
              <span
                className="text-gray-400 cursor-help"
                title="Thông tin thêm">
                ⓘ
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={createGroup.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {createGroup.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
