"use client";

import { Plus, Trash2 } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import { ProductPicker } from "./ProductionPickers";
import { materialTotal, type ManufacturerMaterial } from "@/lib/api/manufacturers";

export const numericClass = "w-full min-w-20 rounded border border-gray-300 px-2 py-2 text-right text-sm";

export function ManufacturerMaterialsEditor({ value, onChange, currency, disabled }: {
  value: ManufacturerMaterial[]; onChange: (value: ManufacturerMaterial[]) => void; currency: string; disabled?: boolean;
}) {
  const change = (index: number, patch: Partial<ManufacturerMaterial>) =>
    onChange(value.map((line, position) => position === index ? { ...line, ...patch } : line));
  return <section className="min-w-0 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">Phần NSX bổ sung</h3>
      {!disabled && <button type="button" className="flex items-center gap-1 rounded border px-2 py-1 text-sm"
        onClick={() => onChange([...value, { description: "Nguyên liệu NSX bổ sung", pricingMode: "TOTAL", quantity: null, unit: null, unitPrice: 0, amount: 0 }])}>
        <Plus size={15} />Thêm phần bổ sung
      </button>}
    </div>
    <div className="overflow-x-auto border">
      <table className="w-full min-w-[850px] text-sm">
        <thead className="bg-gray-50 text-left"><tr>
          <th className="p-2 w-64">Nguyên liệu</th><th className="p-2 w-36">Cách tính</th><th className="p-2 w-28">Số lượng</th>
          <th className="p-2 w-24">Đơn vị</th><th className="p-2 w-32">Đơn giá</th><th className="p-2 w-36">Thành tiền ({currency})</th><th className="w-10" />
        </tr></thead>
        <tbody>{value.map((line, index) => <tr key={index} className="border-t align-top">
          <td className="p-2 space-y-1">
            <ProductPicker value={line.productId} disabled={disabled} label={`Mã nguyên liệu NSX ${index + 1}`}
              onChange={(product) => change(index, { productId: product.id, description: product.name, unit: product.unit || "unit" })} />
            <input aria-label={`Mô tả phần bổ sung ${index + 1}`} className="w-full rounded border px-2 py-1.5" value={line.description}
              disabled={disabled} onChange={(event) => change(index, { description: event.target.value })} />
            {line.productId && !disabled && <button type="button" className="text-xs text-gray-500 underline" onClick={() => change(index, { productId: null })}>Bỏ liên kết mã hàng</button>}
          </td>
          <td className="p-2"><select aria-label={`Cách tính ${index + 1}`} className="w-full rounded border p-2" value={line.pricingMode} disabled={disabled}
            onChange={(event) => change(index, { pricingMode: event.target.value as ManufacturerMaterial["pricingMode"] })}>
            <option value="TOTAL">Tổng tiền</option><option value="UNIT_PRICE">Lượng × đơn giá</option>
          </select></td>
          <td className="p-2"><NumericInput className={numericClass} value={Number(line.quantity ?? 0)} disabled={disabled}
            onValueChange={(quantity) => change(index, { quantity })} maxFractionDigits={4} /></td>
          <td className="p-2"><input aria-label={`Đơn vị bổ sung ${index + 1}`} className="w-full rounded border p-2" value={line.unit ?? ""} disabled={disabled}
            onChange={(event) => change(index, { unit: event.target.value })} /></td>
          <td className="p-2">{line.pricingMode === "UNIT_PRICE" ? <NumericInput className={numericClass} value={Number(line.unitPrice)}
            disabled={disabled} maxFractionDigits={6} onValueChange={(unitPrice) => change(index, { unitPrice })} /> : <span className="text-gray-400">-</span>}</td>
          <td className="p-2 text-right">{line.pricingMode === "TOTAL" ? <NumericInput className={numericClass} value={Number(line.amount)}
            maxFractionDigits={2} disabled={disabled} onValueChange={(amount) => change(index, { amount })} /> : materialTotal(line).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
          <td className="p-2">{!disabled && <button type="button" title="Xóa phần bổ sung" aria-label={`Xóa phần bổ sung ${index + 1}`} className="p-1 text-red-600"
            onClick={() => onChange(value.filter((_, position) => position !== index))}><Trash2 size={16} /></button>}</td>
        </tr>)}
        {!value.length && <tr><td colSpan={7} className="p-4 text-center text-gray-500">Không có nguyên liệu NSX bổ sung</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
