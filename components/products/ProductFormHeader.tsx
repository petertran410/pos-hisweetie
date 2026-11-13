"use client";

import { Boxes, Factory, Package, Wrench, X } from "lucide-react";

const TYPE_ICON = { 1: Boxes, 2: Package, 3: Wrench, 4: Factory } as const;

interface ProductFormHeaderProps {
  title: string;
  /** Loại sản phẩm: 1 combo, 2 hàng hóa, 3 dịch vụ, 4 hàng sản xuất */
  productType: number;
  /** Có khi đang sửa: hiện "Mã · Tên" dưới tiêu đề */
  code?: string;
  name?: string;
  onClose: () => void;
}

/** Header dùng chung cho modal tạo/sửa sản phẩm (style ở product-form.css). */
export function ProductFormHeader({
  title,
  productType,
  code,
  name,
  onClose,
}: ProductFormHeaderProps) {
  const Icon = TYPE_ICON[productType as keyof typeof TYPE_ICON] ?? Package;
  const sub = code ? [code, name].filter(Boolean).join(" · ") : "Sản phẩm mới";

  return (
    <div className="pf-header">
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="pf-header-icon" aria-hidden>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="pf-header-title">{title}</h2>
          <p className="pf-header-sub" title={sub}>
            {sub}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="pf-close"
        aria-label="Đóng">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
