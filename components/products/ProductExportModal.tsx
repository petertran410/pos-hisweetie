"use client";

import { useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useExportProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";

interface ProductExportModalProps {
  /** Bộ lọc hiện tại của bảng để xuất đúng tập dữ liệu đang xem. */
  filters: Record<string, any>;
  onClose: () => void;
}

interface ColumnOption {
  key: string;
  label: string;
  /** Cột bắt buộc — luôn được tick và không thể bỏ chọn. */
  required?: boolean;
}

interface ColumnGroup {
  title: string;
  options: ColumnOption[];
}

// Key phải khớp với ALL_COLUMNS ở backend (products.service.ts).
const COLUMN_GROUPS: ColumnGroup[] = [
  {
    title: "Hàng hóa",
    options: [
      { key: "type", label: "Loại hàng", required: true },
      { key: "categoryPath", label: "Nhóm hàng(3 Cấp)" },
      { key: "code", label: "Mã hàng", required: true },
      { key: "name", label: "Tên hàng", required: true },
      { key: "tradeMark", label: "Thương hiệu" },
      { key: "images", label: "Hình ảnh (url1,url2...)" },
      { key: "isDirectSale", label: "Được bán trực tiếp" },
      { key: "isActive", label: "Đang kinh doanh" },
    ],
  },
  {
    title: "Giá bán & Tồn kho",
    options: [
      { key: "basePrice", label: "Giá bán" },
      { key: "cost", label: "Giá vốn" },
      { key: "stock", label: "Tồn kho" },
      { key: "customerOrder", label: "Khách đặt" },
      { key: "supplierOrder", label: "Đặt NCC" },
      { key: "minStock", label: "Tồn nhỏ nhất" },
      { key: "maxStock", label: "Tồn lớn nhất" },
    ],
  },
  {
    title: "Đơn vị tính",
    options: [{ key: "unit", label: "ĐVT" }],
  },
  {
    title: "Thông tin khác",
    options: [
      { key: "weight", label: "Trọng lượng" },
      { key: "description", label: "Mô tả" },
      { key: "components", label: "Hàng thành phần" },
      { key: "createdAt", label: "Thời gian tạo" },
    ],
  },
];

const REQUIRED_KEYS = COLUMN_GROUPS.flatMap((g) =>
  g.options.filter((o) => o.required).map((o) => o.key)
);

const ALL_KEYS = COLUMN_GROUPS.flatMap((g) => g.options.map((o) => o.key));

// Cột tick sẵn khi mở modal (giống mặc định KiotViet).
const DEFAULT_SELECTED = [
  "type",
  "categoryPath",
  "code",
  "name",
  "basePrice",
  "cost",
  "stock",
  "minStock",
  "maxStock",
  "unit",
  "images",
  "isDirectSale",
  "weight",
  "createdAt",
];

export function ProductExportModal({
  filters,
  onClose,
}: ProductExportModalProps) {
  const { selectedBranch } = useBranchStore();
  const { exportToFile, isExporting } = useExportProducts();

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([...DEFAULT_SELECTED, ...REQUIRED_KEYS])
  );

  const toggle = (key: string) => {
    if (REQUIRED_KEYS.includes(key)) return; // không cho bỏ cột bắt buộc
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allSelected = useMemo(
    () => ALL_KEYS.every((k) => selected.has(k)),
    [selected]
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set(REQUIRED_KEYS));
    } else {
      setSelected(new Set(ALL_KEYS));
    }
  };

  const handleExport = () => {
    if (selected.size === 0) return;
    // Giữ đúng thứ tự đã khai báo trong các nhóm.
    const orderedKeys = ALL_KEYS.filter((k) => selected.has(k));
    exportToFile(filters, orderedKeys);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Tùy chọn cột hiển thị</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Chọn ít nhất 1 cột để xuất file
              {selectedBranch?.name ? (
                <span className="ml-1">
                  · Chi nhánh:{" "}
                  <span className="font-medium text-gray-700">
                    {selectedBranch.name}
                  </span>
                </span>
              ) : null}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {COLUMN_GROUPS.map((group) => {
            const total = group.options.length;
            const count = group.options.filter((o) =>
              selected.has(o.key)
            ).length;
            return (
              <div key={group.title}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-sm text-gray-800">
                    {group.title}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                    {count}/{total}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                  {group.options.map((opt) => {
                    const checked = selected.has(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-2 text-sm ${
                          opt.required
                            ? "cursor-not-allowed text-gray-500"
                            : "cursor-pointer text-gray-700"
                        }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={opt.required}
                          onChange={() => toggle(opt.key)}
                          className="cursor-pointer disabled:cursor-not-allowed accent-brand w-4 h-4"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
          <button
            onClick={toggleSelectAll}
            className="text-sm text-brand hover:text-brand-dark font-medium">
            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
              Bỏ qua
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || selected.size === 0}
              className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isExporting ? "Đang xuất..." : "Xuất file"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
