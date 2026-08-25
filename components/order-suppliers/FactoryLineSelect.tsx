"use client";

import type { ReferencePriceInfo } from "@/lib/api/factory-products";

interface FactoryLineSelectProps {
  value: number | null;
  /** Nhà máy khả dụng cho sản phẩm này, đã lọc theo NCC của phiếu. */
  candidates?: ReferencePriceInfo[];
  disabled?: boolean;
  /** Phiếu đã chọn NCC chưa — chưa chọn thì không tra được nhà máy. */
  hasSupplier: boolean;
  onChange: (factoryId: number | null) => void;
}

/**
 * Chọn nhà máy cho một dòng phiếu đặt hàng nhập.
 *
 * Một sản phẩm có thể gia công ở nhiều nhà máy của cùng một NCC, nên nhà máy
 * phải chọn theo từng dòng chứ không suy ra được từ sản phẩm. Nhà máy đã chọn
 * quyết định MOQ nào được áp cho dòng đó.
 *
 * Hiển thị theo số ứng viên:
 *  - chưa chọn NCC → nhắc chọn NCC trước
 *  - 0 ứng viên    → sản phẩm chưa gắn nhà máy nào thuộc NCC này
 *  - 1 ứng viên    → hiện tên, không cần chọn (đã tự gán)
 *  - ≥2 ứng viên   → dropdown
 */
export function FactoryLineSelect({
  value,
  candidates,
  disabled = false,
  hasSupplier,
  onChange,
}: FactoryLineSelectProps) {
  if (!hasSupplier) {
    return <span className="text-xs text-gray-400">Chọn NCC trước</span>;
  }

  // `undefined` = chưa tải xong; `[]` = đã tải và không có nhà máy nào.
  if (!candidates) {
    return <span className="text-xs text-gray-400">Đang tải...</span>;
  }

  if (candidates.length === 0) {
    return (
      <span
        className="text-xs text-amber-600"
        title="Sản phẩm chưa được gắn nhà máy nào thuộc nhà cung cấp này">
        Chưa gắn nhà máy
      </span>
    );
  }

  if (candidates.length === 1) {
    return (
      <span className="text-sm text-gray-700">{candidates[0].factoryName}</span>
    );
  }

  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
      className={`w-full border rounded px-2 py-2 text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand disabled:bg-gray-100 disabled:cursor-default ${
        value == null ? "border-amber-400 text-amber-700" : "border-gray-300"
      }`}>
      <option value="">— Chọn nhà máy —</option>
      {candidates.map((candidate) => (
        <option key={candidate.factoryId} value={candidate.factoryId}>
          {candidate.factoryName}
          {candidate.role === "backup" ? " (backup)" : ""}
        </option>
      ))}
    </select>
  );
}
