"use client";

import { PackageOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { NumericInput } from "@/components/ui/NumericInput";
import { ProductPicker } from "./ProductionPickers";
import {
  isLegacyMaterial,
  materialTotal,
  type ManufacturerMaterial,
} from "@/lib/api/manufacturers";
import {
  NSX_UNITS,
  compatiblePriceUnits,
  currencySymbol,
  defaultNsxUnits,
  nsxRawAmount,
  priceUnitLabel,
  type NsxUnit,
} from "@/lib/utils/nsx-pricing";

export const numericClass =
  "w-full min-w-20 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-right text-sm text-gray-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-gray-50";

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-gray-50";

const formatAmount = (value: number, digits = 2) =>
  // Cùng kiểu phân cách (dấu phẩy) với ô nhập lượng / đơn giá.
  value.toLocaleString("en-US", { maximumFractionDigits: digits });

/**
 * Bảng nguyên liệu NSX bổ sung — dùng chung cho công thức (định lượng / 1 sp)
 * và phiếu gửi / nhận hàng (lượng cả lô). Mỗi dòng là một sản phẩm có trên hệ
 * thống, tính theo lượng × đơn giá với đơn vị g | kg | gói.
 * Dòng cũ (không mã / "Tổng tiền") chỉ hiển thị, vẫn giữ khi nhận hàng.
 */
export function ManufacturerMaterialsEditor({
  value,
  onChange,
  currency,
  disabled,
  variant = "slip",
  outputUnit,
  title = "Nguyên liệu NSX bổ sung",
}: {
  value: ManufacturerMaterial[];
  onChange: (value: ManufacturerMaterial[]) => void;
  currency: string;
  disabled?: boolean;
  variant?: "slip" | "formula";
  /** Đơn vị thành phẩm, hiện ở tiêu đề cột "Định lượng / 1 …" (công thức). */
  outputUnit?: string;
  title?: string;
}) {
  const isFormula = variant === "formula";
  const change = (index: number, patch: Partial<ManufacturerMaterial>) =>
    onChange(
      value.map((line, position) =>
        position === index ? { ...line, ...patch } : line,
      ),
    );
  const changeUnit = (index: number, unit: NsxUnit) => {
    const line = value[index];
    const priceUnit = compatiblePriceUnits(unit).includes(
      line.priceUnit as NsxUnit,
    )
      ? line.priceUnit
      : unit;
    change(index, { unit, priceUnit });
  };
  const add = (product: {
    id: number;
    code: string;
    name: string;
    unit?: string;
  }) => {
    if (value.some((line) => line.productId === product.id)) {
      toast.error("Nguyên liệu NSX đã có trong bảng");
      return;
    }
    onChange([
      ...value,
      {
        productId: product.id,
        productCode: product.code,
        description: product.name,
        pricingMode: "UNIT_PRICE",
        quantity: 0,
        unitPrice: 0,
        amount: 0,
        ...defaultNsxUnits(product.unit),
      },
    ]);
  };
  const lineAmount = (line: ManufacturerMaterial) =>
    isFormula ? nsxRawAmount(line) : materialTotal(line);

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <span className="text-xs text-gray-400">{value.length} dòng</span>
        </div>
        {!disabled && (
          <div className="w-full sm:w-80">
            <ProductPicker label="Thêm nguyên liệu NSX" onChange={add} />
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="w-28 px-3 py-2.5">Mã hàng</th>
              <th className="px-3 py-2.5">Tên hàng</th>
              <th className="w-32 px-3 py-2.5">
                {isFormula
                  ? `Định lượng / 1 ${outputUnit || "sp"}`
                  : "Số lượng"}
              </th>
              <th className="w-24 px-3 py-2.5">Đơn vị</th>
              <th
                className="w-32 px-3 py-2.5"
                title="Nhập đúng giá NSX báo, vd 205,200 nếu NSX báo 205,200 đ/kg">
                Giá NSX báo
              </th>
              <th
                className="w-28 px-3 py-2.5"
                title="Giá trên mỗi g / kg / gói — hệ thống tự quy đổi theo đơn vị lượng">
                Tính trên
              </th>
              <th className="w-36 px-3 py-2.5 text-right">
                {isFormula ? `Tiền / 1 ${outputUnit || "sp"}` : "Thành tiền"} (
                {currencySymbol(currency)})
              </th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {value.map((line, index) => {
              const legacy = !isFormula && isLegacyMaterial(line);
              const locked = disabled || legacy;
              return (
                <tr
                  key={`${line.productId ?? "legacy"}-${index}`}
                  className="align-middle hover:bg-gray-50/70">
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-500">
                    {line.productCode || "-"}
                  </td>
                  <td className="px-3 py-2.5 text-gray-800">
                    <span>{line.description}</span>
                    {legacy && (
                      <span
                        title="Dòng tạo trước khi bắt buộc chọn sản phẩm / tính theo g, kg, gói — chỉ xem hoặc xóa"
                        className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                        Dòng cũ
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {line.pricingMode === "TOTAL" ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <NumericInput
                        className={numericClass}
                        value={Number(line.quantity ?? 0)}
                        disabled={locked}
                        maxFractionDigits={isFormula ? 6 : 4}
                        formatWhileTyping
                        onValueChange={(quantity) =>
                          change(index, { quantity })
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {legacy ? (
                      <span className="text-gray-600">{line.unit || "-"}</span>
                    ) : (
                      <select
                        aria-label={`Đơn vị nguyên liệu NSX ${index + 1}`}
                        className={selectClass}
                        value={line.unit ?? "g"}
                        disabled={locked}
                        onChange={(event) =>
                          changeUnit(index, event.target.value as NsxUnit)
                        }>
                        {NSX_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {line.pricingMode === "TOTAL" ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <NumericInput
                        className={numericClass}
                        value={Number(line.unitPrice)}
                        disabled={locked}
                        maxFractionDigits={6}
                        formatWhileTyping
                        onValueChange={(unitPrice) =>
                          change(index, { unitPrice })
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {legacy ? (
                      <span className="text-gray-400">
                        {line.pricingMode === "TOTAL"
                          ? "Tổng tiền"
                          : `/${line.unit || "-"}`}
                      </span>
                    ) : (
                      <select
                        aria-label={`Đơn giá theo ${index + 1}`}
                        className={selectClass}
                        value={line.priceUnit ?? line.unit ?? "kg"}
                        disabled={locked}
                        onChange={(event) =>
                          change(index, {
                            priceUnit: event.target.value as NsxUnit,
                          })
                        }>
                        {compatiblePriceUnits(line.unit).map((unit) => (
                          <option key={unit} value={unit}>
                            {priceUnitLabel(currency, unit)}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-800">
                    {formatAmount(lineAmount(line), isFormula ? 4 : 2)}
                    {/* Phép tính để thấy hệ thống đã quy đổi g ↔ kg: 250 g × 205,200 đ/kg. */}
                    {!legacy &&
                      line.pricingMode !== "TOTAL" &&
                      Number(line.quantity) > 0 &&
                      Number(line.unitPrice) > 0 && (
                        <span className="block text-xs font-normal text-gray-400">
                          {formatAmount(Number(line.quantity), 6)} {line.unit} ×{" "}
                          {formatAmount(Number(line.unitPrice), 6)}{" "}
                          {priceUnitLabel(currency, line.priceUnit ?? line.unit ?? "")}
                        </span>
                      )}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {!disabled && (
                      <button
                        type="button"
                        title="Xóa nguyên liệu NSX"
                        aria-label={`Xóa nguyên liệu NSX ${index + 1}`}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        onClick={() =>
                          onChange(
                            value.filter((_, position) => position !== index),
                          )
                        }>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!value.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="sticky left-0 w-[calc(100vw-2rem)] sm:w-auto">
                    <PackageOpen
                      size={24}
                      className="mx-auto mb-2 text-gray-300"
                    />
                    <p className="text-sm text-gray-400">
                      Không dùng nguyên liệu NSX — chỉ gửi gia công
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
