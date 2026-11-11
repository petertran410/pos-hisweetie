"use client";

import { PackageOpen, Plus, Trash2 } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import { ProductPicker } from "./ProductionPickers";
import { materialTotal, type ManufacturerMaterial } from "@/lib/api/manufacturers";

export const numericClass =
  "w-full min-w-20 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-right text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-gray-50";

export function ManufacturerMaterialsEditor({ value, onChange, currency, disabled }: {
  value: ManufacturerMaterial[]; onChange: (value: ManufacturerMaterial[]) => void; currency: string; disabled?: boolean;
}) {
  const change = (index: number, patch: Partial<ManufacturerMaterial>) =>
    onChange(value.map((line, position) => position === index ? { ...line, ...patch } : line));
  return <section className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-800">Phần nhà sản xuất bổ sung</h3>
        <span className="text-xs text-gray-400">{value.length} dòng</span>
      </div>
      {!disabled && <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
        onClick={() => onChange([...value, { description: "Nguyên liệu NSX bổ sung", pricingMode: "TOTAL", quantity: null, unit: null, unitPrice: 0, amount: 0 }])}>
        <Plus size={15} />Thêm dòng
      </button>}
    </div>
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500"><tr>
          <th className="w-64 px-3 py-2.5">Nguyên liệu</th><th className="w-36 px-3 py-2.5">Cách tính</th><th className="w-28 px-3 py-2.5">Số lượng</th>
          <th className="w-24 px-3 py-2.5">Đơn vị</th><th className="w-32 px-3 py-2.5">Đơn giá</th><th className="w-36 px-3 py-2.5 text-right">Thành tiền ({currency})</th><th className="w-12" />
        </tr></thead>
        <tbody className="divide-y divide-gray-100">{value.map((line, index) => <tr key={index} className="align-top hover:bg-gray-50/70">
          <td className="space-y-1.5 px-3 py-2.5">
            <ProductPicker value={line.productId} disabled={disabled} label={`Mã nguyên liệu NSX ${index + 1}`}
              onChange={(product) => change(index, { productId: product.id, description: product.name, unit: product.unit || "unit" })} />
            <input aria-label={`Mô tả phần bổ sung ${index + 1}`} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft" value={line.description}
              disabled={disabled} onChange={(event) => change(index, { description: event.target.value })} />
            {line.productId && !disabled && <button type="button" className="text-xs text-gray-400 hover:text-gray-700 hover:underline" onClick={() => change(index, { productId: null })}>Bỏ liên kết mã hàng</button>}
          </td>
          <td className="px-3 py-2.5"><select aria-label={`Cách tính ${index + 1}`} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft" value={line.pricingMode} disabled={disabled}
            onChange={(event) => change(index, { pricingMode: event.target.value as ManufacturerMaterial["pricingMode"] })}>
            <option value="TOTAL">Tổng tiền</option><option value="UNIT_PRICE">Lượng × đơn giá</option>
          </select></td>
          <td className="px-3 py-2.5"><NumericInput className={numericClass} value={Number(line.quantity ?? 0)} disabled={disabled}
            onValueChange={(quantity) => change(index, { quantity })} maxFractionDigits={4} formatWhileTyping /></td>
          <td className="px-3 py-2.5"><input aria-label={`Đơn vị bổ sung ${index + 1}`} className="w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft" value={line.unit ?? ""} disabled={disabled}
            onChange={(event) => change(index, { unit: event.target.value })} /></td>
          <td className="px-3 py-2.5">{line.pricingMode === "UNIT_PRICE" ? <NumericInput className={numericClass} value={Number(line.unitPrice)}
            disabled={disabled} maxFractionDigits={6} formatWhileTyping onValueChange={(unitPrice) => change(index, { unitPrice })} /> : <span className="text-gray-400">-</span>}</td>
          <td className="px-3 py-2.5 text-right">{line.pricingMode === "TOTAL" ? <NumericInput className={numericClass} value={Number(line.amount)}
            maxFractionDigits={2} formatWhileTyping disabled={disabled} onValueChange={(amount) => change(index, { amount })} /> : materialTotal(line).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
          <td className="px-2 py-2.5 text-center">{!disabled && <button type="button" title="Xóa phần bổ sung" aria-label={`Xóa phần bổ sung ${index + 1}`} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={() => onChange(value.filter((_, position) => position !== index))}><Trash2 size={16} /></button>}</td>
        </tr>)}
        {!value.length && <tr><td colSpan={7} className="px-4 py-10 text-center"><div className="sticky left-0 w-[calc(100vw-2rem)] sm:w-auto"><PackageOpen size={24} className="mx-auto mb-2 text-gray-300" /><p className="text-sm text-gray-400">Không có nguyên liệu nhà sản xuất bổ sung</p></div></td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}
