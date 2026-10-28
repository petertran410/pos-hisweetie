"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  useCreateUnit,
  useDeleteUnit,
  useUpdateUnit,
} from "@/lib/hooks/useUnits";
import type { Unit } from "@/lib/api/units";

/**
 * Thêm / sửa một Đơn vị tính ngay từ ô chọn ở form sản phẩm.
 * Sửa tên → đổi luôn trên mọi sản phẩm đang dùng; trùng tên đơn vị khác →
 * hỏi gộp. Xóa chỉ khi chưa sản phẩm nào dùng.
 */
export function UnitModal({
  unit,
  initialName = "",
  onClose,
  onSaved,
}: {
  unit?: Unit | null;
  initialName?: string;
  onClose: () => void;
  onSaved?: (name: string) => void;
}) {
  const [name, setName] = useState(unit?.name ?? initialName);
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const isPending =
    createUnit.isPending || updateUnit.isPending || deleteUnit.isPending;

  const done = (savedName: string) => {
    onSaved?.(savedName);
    onClose();
  };

  const save = (confirmMerge = false) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!unit) {
      createUnit.mutate(trimmed, {
        onSuccess: (created) => done(created.name),
      });
      return;
    }
    if (trimmed === unit.name) return onClose();
    updateUnit.mutate(
      { id: unit.id, data: { name: trimmed, confirmMerge } },
      {
        onSuccess: (updated) => done(updated.name),
        // Trùng tên đơn vị khác → backend trả 409, hỏi xác nhận gộp.
        onError: async (error: Error & { status?: number }) => {
          if (error.status !== 409 || confirmMerge) {
            toast.error(error.message || "Không thể lưu đơn vị");
            return;
          }
          const res = await Swal.fire({
            title: "Gộp đơn vị?",
            text: `${error.message} ${unit.productCount} sản phẩm đang dùng "${unit.name}" sẽ chuyển sang đơn vị kia và "${unit.name}" bị xóa khỏi danh sách.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Gộp",
            cancelButtonText: "Đóng",
          });
          if (res.isConfirmed) save(true);
        },
      },
    );
  };

  const handleDelete = async () => {
    if (!unit) return;
    const res = await Swal.fire({
      title: `Xóa đơn vị "${unit.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Đóng",
      confirmButtonColor: "#dc2626",
    });
    if (res.isConfirmed) deleteUnit.mutate(unit.id, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">
            {unit ? "Sửa đơn vị tính" : "Thêm đơn vị tính"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <label className="block text-sm font-medium">Tên đơn vị</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Ví dụ: Hũ"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
          {unit && unit.productCount > 0 && (
            <p className="text-xs text-gray-500">
              {unit.productCount} sản phẩm đang dùng đơn vị này sẽ đổi theo.
              Nhập tên của một đơn vị đã có để gộp vào đơn vị đó.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          {unit && unit.productCount === 0 && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50">
              Xóa
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-3 py-1.5 text-sm border rounded hover:bg-gray-100">
            Đóng
          </button>
          <button
            onClick={() => save()}
            disabled={!name.trim() || isPending}
            className="px-3 py-1.5 text-sm text-white bg-brand rounded hover:bg-brand-dark disabled:opacity-50">
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
