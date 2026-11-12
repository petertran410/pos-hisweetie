"use client";

import type { ProductFormula } from "@/lib/api/products";
import { currencySymbol, nsxRawAmount } from "@/lib/utils/nsx-pricing";

const num = (value: number, digits = 4) =>
  value.toLocaleString("vi-VN", { maximumFractionDigits: digits });

/** Xem nhanh phần gửi đi sản xuất của một công thức: nguyên liệu NSX + phí / 1 sp. */
export function FormulaNsxSummary({
  formula,
  outputUnit,
}: {
  formula: ProductFormula;
  outputUnit?: string | null;
}) {
  if (!formula.isExternal) return null;
  const sym = currencySymbol(formula.currency);
  const unit = outputUnit || "sp";
  const lines = formula.nsxLines ?? [];
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-gray-800">Gửi đi sản xuất</span>
        <span className="text-gray-600">
          Phí gia công / 1 {unit}:{" "}
          <b className="text-gray-800">
            {num(Number(formula.processingFeePerUnit ?? 0), 6)} {sym}
          </b>
        </span>
      </div>
      {lines.length ? (
        <ul className="space-y-1.5">
          {lines.map((line) => {
            const amount = nsxRawAmount({
              quantity: Number(line.quantity),
              unit: line.unit,
              unitPrice: Number(line.unitPrice),
              priceUnit: line.priceUnit,
            });
            return (
              <li
                key={line.id ?? line.productId}
                className="flex flex-wrap justify-between gap-x-3 gap-y-0.5">
                <span className="min-w-0 text-gray-800">
                  <span className="mr-1.5 font-mono text-xs text-gray-400">
                    {line.product?.code}
                  </span>
                  {line.product?.name ?? `#${line.productId}`}
                </span>
                <span className="tabular-nums text-gray-600">
                  {num(Number(line.quantity), 6)} {line.unit} ×{" "}
                  {num(Number(line.unitPrice), 6)} {sym}/{line.priceUnit} ={" "}
                  <b className="text-gray-800">
                    {num(amount)} {sym}
                  </b>{" "}
                  / {unit}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-500">
          Không dùng nguyên liệu NSX — chỉ gửi gia công
        </p>
      )}
    </div>
  );
}
