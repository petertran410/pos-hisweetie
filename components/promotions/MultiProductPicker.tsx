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
  /** Hiện ô nhập "trần SL tặng" cho từng dòng (chỉ dùng cho nhóm quà Y). */
  showRewardLimit?: boolean;
}

/** Chọn nhiều sản phẩm cụ thể HOẶC nhiều nhóm hàng (category) cho X / Y. */
export function MultiProductPicker({
  label,
  items,
  productLabels,
  onChange,
  showRewardLimit = false,
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

  const setLimitAt = (idx: number, value: string) => {
    const rewardLimit = value === "" ? null : Number(value);
    onChange(
      items.map((it, i) => (i === idx ? { ...it, rewardLimit } : it)),
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

      {items.length > 0 &&
        (showRewardLimit ? (
          <div className="space-y-1.5">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs"
              >
                <span className="flex-1 truncate">
                  {it.productId
                    ? productLabels[it.productId] || `SP#${it.productId}`
                    : `🏷 ${it.categoryName}`}
                </span>
                <span className="text-gray-400">Trần SL:</span>
                <input
                  type="number"
                  min={0}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                  placeholder="∞"
                  value={it.rewardLimit ?? ""}
                  onChange={(e) => setLimitAt(idx, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <p className="text-[11px] text-gray-400">
              Trần SL = số quà tối đa được tặng cho dòng này trong suốt chương
              trình (để trống = không giới hạn riêng).
            </p>
          </div>
        ) : (
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
        ))}
    </div>
  );
}
