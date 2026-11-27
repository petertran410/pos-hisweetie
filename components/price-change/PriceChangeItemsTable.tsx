"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { CodeLink } from "@/components/shared/CodeLink";
import { cellDiff, fmtMoney, fmtRatio } from "@/lib/price-change/constants";
import type { PcItem, PcNamed } from "@/lib/types/price-change";

/** Chip chênh lệch ⬆️/⬇️ kèm % (như cột "So với giá cũ" trên Lark). */
export function DiffChip({
  oldValue,
  newValue,
}: {
  oldValue: number | null;
  newValue: number | null;
}) {
  const { diff, ratio } = cellDiff(oldValue, newValue);
  if (diff === null) return null;
  if (diff === 0)
    return (
      <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
        Không đổi
      </span>
    );
  const up = diff > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}>
      <Icon className="w-3 h-3" />
      {fmtMoney(Math.abs(diff))}
      {ratio !== null && ` (${fmtRatio(ratio)})`}
    </span>
  );
}

const TH =
  "px-3 py-2.5 text-left font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide";

/** Bảng sản phẩm × cột (giá vốn theo chi nhánh, giá theo bảng giá): cũ → mới. */
export function PriceChangeItemsTable({
  items,
  costBranches,
  priceBooks,
}: {
  items: PcItem[];
  costBranches: PcNamed[];
  priceBooks: PcNamed[];
}) {
  if (!items.length)
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        Phiếu chưa có sản phẩm nào
      </p>
    );

  const cell = (oldValue: number | null, newValue: number | null) =>
    newValue === null ? (
      <span className="text-gray-400" title="Không đổi">
        {fmtMoney(oldValue)}
      </span>
    ) : (
      <div className="space-y-0.5">
        <div className="whitespace-nowrap">
          <span className="text-gray-400">{fmtMoney(oldValue)}</span>
          <span className="mx-1 text-gray-400">→</span>
          <span className="font-semibold text-gray-900">
            {fmtMoney(newValue)}
          </span>
        </div>
        <DiffChip oldValue={oldValue} newValue={newValue} />
      </div>
    );

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className={TH}>STT</th>
            <th className={TH}>Mã hàng</th>
            <th className={TH}>Tên hàng</th>
            {costBranches.map((b) => (
              <th key={`c${b.id}`} className={TH}>
                Giá vốn · {b.name}
              </th>
            ))}
            {priceBooks.map((p) => (
              <th key={`p${p.id}`} className={TH}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-t align-top">
              <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {item.productId ? (
                  <CodeLink entity="product" code={item.productCode} />
                ) : (
                  <span
                    className="text-amber-700"
                    title="Chưa khớp sản phẩm trên POS">
                    {item.productCode}
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-gray-800 min-w-[200px]">
                {item.productName}
              </td>
              {costBranches.map((b) => {
                const c = item.costs.find((x) => x.branchId === b.id);
                return (
                  <td key={`c${b.id}`} className="px-3 py-2.5">
                    {cell(c?.oldCost ?? null, c?.newCost ?? null)}
                  </td>
                );
              })}
              {priceBooks.map((p) => {
                const line = item.prices.find((x) => x.priceBookId === p.id);
                return (
                  <td key={`p${p.id}`} className="px-3 py-2.5">
                    {cell(line?.oldPrice ?? null, line?.newPrice ?? null)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
