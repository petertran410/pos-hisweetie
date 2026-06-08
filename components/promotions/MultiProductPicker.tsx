"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useCategories } from "@/lib/hooks/useCategories";
import { PromotionProductRef } from "@/lib/types/promotion";
import { ProductPicker } from "./ProductPicker";

interface Props {
  label: string;
  /** Danh sách item (SP hoặc category) đang chọn */
  items: PromotionProductRef[];
  /** label hiển thị cho productId (map id -> "name (code)") */
  productLabels: Record<number, string>;
  onChange: (items: PromotionProductRef[], productLabels: Record<number, string>) => void;
}

/** Chọn nhiều sản phẩm cụ thể HOẶC nhiều nhóm hàng (category) cho X / Y. */
export function MultiProductPicker({
  label,
  items,
  productLabels,
  onChange,
}: Props) {
  const [mode, setMode] = useState<"product" | "category">("product");
  const { data: parent } = useCategories("parent");
  const { data: middle } = useCategories("middle");
  const { data: child } = useCategories("child");

  const allCategories: string[] = [
    ...(parent || []),
    ...(middle || []),
    ...(child || []),
  ].map((c: any) => c.name);
  const uniqueCategories = [...new Set(allCategories)];

  const addProduct = (p: { id: number; name: string; code: string }) => {
    if (items.some((it) => it.productId === p.id)) return;
    onChange(
      [...items, { productId: p.id }],
      { ...productLabels, [p.id]: `${p.name} (${p.code})` },
    );
  };

  const addCategory = (name: string) => {
    if (!name || items.some((it) => it.categoryName === name)) return;
    onChange([...items, { categoryName: name }], productLabels);
  };

  const removeAt = (idx: number) => {
    onChange(
      items.filter((_, i) => i !== idx),
      productLabels,
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-500">{label}</label>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode("product")}
          className={`rounded px-3 py-1 text-xs ${
            mode === "product" ? "bg-blue-500 text-white" : "bg-gray-100"
          }`}
        >
          Sản phẩm
        </button>
        <button
          type="button"
          onClick={() => setMode("category")}
          className={`rounded px-3 py-1 text-xs ${
            mode === "category" ? "bg-blue-500 text-white" : "bg-gray-100"
          }`}
        >
          Nhóm hàng
        </button>
      </div>

      {mode === "product" ? (
        <ProductPicker value={null} onChange={(p) => p && addProduct(p)} />
      ) : (
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value=""
          onChange={(e) => addCategory(e.target.value)}
        >
          <option value="">-- Chọn nhóm hàng --</option>
          {uniqueCategories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, idx) => (
            <span
              key={idx}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs"
            >
              {it.productId
                ? productLabels[it.productId] || `SP#${it.productId}`
                : `🏷 ${it.categoryName}`}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
