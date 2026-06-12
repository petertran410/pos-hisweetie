"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  useCreatePurpose,
  useUpdatePurpose,
  useDeletePurpose,
} from "@/lib/hooks/useInternalUses";
import type { InternalUsePurpose } from "@/lib/api/internalUses";
import { toast } from "sonner";

interface PurposeFormProps {
  isOpen: boolean;
  purpose?: InternalUsePurpose | null;
  onClose: () => void;
}

export function PurposeForm({ isOpen, purpose, onClose }: PurposeFormProps) {
  const [name, setName] = useState(purpose?.name || "");

  const createPurpose = useCreatePurpose();
  const updatePurpose = useUpdatePurpose();
  const deletePurpose = useDeletePurpose();

  useEffect(() => {
    setName(purpose?.name || "");
  }, [purpose, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên mục đích sử dụng");
      return;
    }
    try {
      if (purpose) {
        await updatePurpose.mutateAsync({
          id: purpose.id,
          data: { name: name.trim() },
        });
      } else {
        await createPurpose.mutateAsync({ name: name.trim() });
      }
      onClose();
    } catch {
      // toast đã xử lý trong hook
    }
  };

  const handleDelete = async () => {
    if (!purpose) return;
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa mục đích sử dụng này? Các phiếu cũ vẫn giữ nguyên mục đích đã chọn."
      )
    ) {
      return;
    }
    try {
      await deletePurpose.mutateAsync(purpose.id);
      onClose();
    } catch {
      // toast đã xử lý trong hook
    }
  };

  const isPending =
    createPurpose.isPending || updatePurpose.isPending || deletePurpose.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[480px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {purpose
              ? "Chỉnh sửa mục đích sử dụng"
              : "Thêm mục đích sử dụng"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tên mục đích sử dụng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên mục đích sử dụng"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
              autoFocus
              required
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between border-t p-6">
          {purpose ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">
              {deletePurpose.isPending ? "Đang xóa..." : "Xóa"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isPending}
              className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50">
              {purpose
                ? updatePurpose.isPending
                  ? "Đang lưu..."
                  : "Cập nhật"
                : createPurpose.isPending
                  ? "Đang tạo..."
                  : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
