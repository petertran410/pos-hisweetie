"use client";

import { useState } from "react";
import { X, Snowflake, Package } from "lucide-react";
import { useBulkUpdateCargoType } from "@/lib/hooks/useProducts";

interface BulkCargoTypeModalProps {
  /** ID các sản phẩm đang được chọn trên bảng. */
  productIds: number[];
  onClose: () => void;
  /** Gọi sau khi cập nhật xong — dùng để bỏ chọn dòng ở bảng cha. */
  onDone?: () => void;
}

const OPTIONS = [
  {
    value: "COLD" as const,
    label: "Hàng lạnh",
    hint: "Chuyển kho nhanh hơn (~3-5 ngày)",
    icon: Snowflake,
    activeClass: "border-blue-500 bg-blue-50 text-blue-700",
  },
  {
    value: "NORMAL" as const,
    label: "Hàng thường",
    hint: "Chuyển kho tiêu chuẩn (~5-7 ngày)",
    icon: Package,
    activeClass: "border-gray-700 bg-gray-100 text-gray-800",
  },
];

/**
 * Gán loại vận chuyển cho nhiều sản phẩm cùng lúc.
 *
 * Có mặt vì `cargoType` là dữ liệu mới, cần khởi tạo cho toàn bộ danh mục —
 * sửa từng sản phẩm sẽ quá tốn công. Kết hợp bộ lọc nhóm hàng ở sidebar để
 * gán nhanh theo cả nhóm.
 */
export function BulkCargoTypeModal({
  productIds,
  onClose,
  onDone,
}: BulkCargoTypeModalProps) {
  const [cargoType, setCargoType] = useState<"COLD" | "NORMAL">("NORMAL");
  const mutation = useBulkUpdateCargoType();

  const handleSubmit = async () => {
    if (productIds.length === 0) return;
    await mutation.mutateAsync({ productIds, cargoType });
    onDone?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-800">
            Gán loại vận chuyển
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Áp dụng cho{" "}
            <span className="font-semibold text-gray-900">
              {productIds.length}
            </span>{" "}
            sản phẩm đang chọn.
          </p>

          <div className="space-y-2">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = cargoType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCargoType(option.value)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    isActive
                      ? option.activeClass
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs opacity-70">
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-500">
            Loại vận chuyển quyết định thời gian dự kiến khi điều chuyển hàng
            giữa các kho, dùng cho tính toán đề xuất đặt hàng nhập.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending || productIds.length === 0}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
          >
            {mutation.isPending ? "Đang lưu..." : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
}
