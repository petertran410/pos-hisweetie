"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Layers, Plus, RotateCcw, Trash2 } from "lucide-react";
import { NumericInput } from "@/components/ui/NumericInput";
import type { QuoteCategory, QuoteItem, QuoteTier } from "@/lib/types/quote";
import { QUOTE_CATEGORY_LABEL } from "@/lib/types/quote";
import {
  diffPct,
  fillFromPriceBook,
  formatPct,
  formatVnd,
  tierColumns,
  tierRangeLabel,
} from "@/lib/quotes/pricing";

type Props = {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  onAddGroup: (category: QuoteCategory) => void;
  priceBookName: string;
};

const UNITS = ["thùng", "túi", "hộp", "gói", "bao", "kg"];

/** Ô giá: tô vàng khi Sale sửa tay, kèm % chênh lệch so với bảng giá. */
function PriceCell({
  tier,
  base,
  onPrice,
}: {
  tier: QuoteTier;
  base: number | null;
  onPrice: (price: number) => void;
}) {
  const pct = diffPct(tier.price, base);
  return (
    <div className="flex flex-col items-end gap-0.5">
      <NumericInput
        value={tier.price ?? 0}
        onValueChange={onPrice}
        maxFractionDigits={0}
        formatWhileTyping
        className={`w-24 border rounded-md px-2 py-1 text-right text-sm tabular-nums ${
          tier.manual ? "bg-amber-50 border-amber-400 text-amber-900 font-medium" : "bg-white"
        }`}
      />
      <span
        className={`text-[11px] leading-none tabular-nums ${
          pct == null ? "text-gray-300" : pct < 0 ? "text-red-600" : pct > 0 ? "text-green-700" : "text-gray-400"
        }`}
        title="Chênh lệch so với bảng giá">
        {tier.manual && <span className="text-amber-700 mr-1">sửa tay</span>}
        {pct == null ? "—" : pct === 0 ? "= bảng giá" : formatPct(pct)}
      </span>
    </div>
  );
}

function TierEditor({
  item,
  onItem,
  onApplyAll,
  priceBookName,
}: {
  item: QuoteItem;
  onItem: (item: QuoteItem) => void;
  onApplyAll: () => void;
  priceBookName: string;
}) {
  const setTier = (i: number, patch: Partial<QuoteTier>) =>
    onItem({ ...item, tiers: item.tiers.map((t, k) => (k === i ? { ...t, ...patch } : t)) });

  return (
    <div className="bg-gray-50 border-t border-b px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className="font-medium text-gray-800">Khung giá — {item.productName}</span>
        <span>· Giá {priceBookName}: <b className="tabular-nums">{formatVnd(item.priceBookPrice) || "—"}</b> / {item.unit}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="text-left font-medium py-1">Nhãn khung</th>
            <th className="text-left font-medium py-1 w-20">SL từ</th>
            <th className="text-left font-medium py-1 w-20">SL đến</th>
            <th className="text-left font-medium py-1 w-24">ĐVT khung</th>
            <th className="text-right font-medium py-1 w-36">Đơn giá / {item.unit}</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {item.tiers.map((t, i) => (
            <tr key={i} className="align-top">
              <td className="py-1 pr-2">
                <input
                  value={t.label}
                  onChange={(e) => setTier(i, { label: e.target.value })}
                  aria-label="Nhãn khung"
                  className="w-full border rounded-md px-2 py-1 bg-white"
                />
                <div className="text-[11px] text-gray-400 mt-0.5">{tierRangeLabel(t) || "Không giới hạn số lượng"}</div>
              </td>
              {(["minQty", "maxQty"] as const).map((f) => (
                <td key={f} className="py-1 pr-2">
                  <input
                    type="number"
                    min={0}
                    value={t[f] ?? ""}
                    placeholder="—"
                    aria-label={f === "minQty" ? "Số lượng từ" : "Số lượng đến"}
                    onChange={(e) => setTier(i, { [f]: e.target.value === "" ? null : Number(e.target.value) })}
                    className="w-full border rounded-md px-2 py-1 bg-white"
                  />
                </td>
              ))}
              <td className="py-1 pr-2">
                <select
                  value={t.unit}
                  aria-label="Đơn vị khung"
                  onChange={(e) => setTier(i, { unit: e.target.value })}
                  className="w-full border rounded-md px-1.5 py-1 bg-white">
                  {UNITS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </td>
              <td className="py-1">
                <PriceCell
                  tier={t}
                  base={item.priceBookPrice}
                  onPrice={(price) => setTier(i, { price, manual: true })}
                />
              </td>
              <td className="py-1 pl-2">
                <div className="flex items-center justify-end gap-1">
                  {t.manual && (
                    <button
                      title="Lấy lại giá bảng giá"
                      aria-label="Lấy lại giá bảng giá"
                      onClick={() => setTier(i, { manual: false, price: item.priceBookPrice })}
                      className="p-1.5 rounded hover:bg-gray-200 text-gray-500">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    title="Xoá khung"
                    aria-label="Xoá khung"
                    disabled={item.tiers.length <= 1}
                    onClick={() => onItem({ ...item, tiers: item.tiers.filter((_, k) => k !== i) })}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const last = item.tiers[item.tiers.length - 1];
            const from = last?.maxQty != null ? last.maxQty + 1 : null;
            onItem({
              ...item,
              tiers: [
                ...item.tiers,
                {
                  key: `k${Date.now()}`,
                  label: `Khung ${item.tiers.length + 1}`,
                  minQty: from,
                  maxQty: null,
                  unit: last?.unit ?? "thùng",
                  price: item.priceBookPrice,
                  manual: false,
                },
              ],
            });
          }}
          className="px-2.5 py-1 text-xs rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Thêm khung
        </button>
        <button
          onClick={onApplyAll}
          className="px-2.5 py-1 text-xs rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Áp bộ khung này cho mọi dòng
        </button>
      </div>
    </div>
  );
}

export function QuoteItemsList({ items, onChange, onAddGroup, priceBookName }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [groupMenu, setGroupMenu] = useState(false);
  const cols = tierColumns(items);
  const manualCount = items.reduce((n, it) => n + it.tiers.filter((t) => t.manual).length, 0);

  const setItem = (id: string, next: QuoteItem) => onChange(items.map((it) => (it.id === id ? next : it)));

  /** Chép nhãn / khoảng số lượng của dòng mẫu sang mọi dòng; giá điền theo bảng giá từng dòng. */
  const applyAll = (src: QuoteItem) =>
    onChange(
      items.map((it) => {
        if (it.id === src.id) return it;
        const manual = new Map(it.tiers.filter((t) => t.manual).map((t) => [t.key, t]));
        return fillFromPriceBook(
          {
            ...it,
            tiers: src.tiers.map((t) => {
              const kept = manual.get(t.key);
              return { ...t, price: kept?.price ?? null, manual: !!kept };
            }),
          },
          it.priceBookPrice
        );
      })
    );

  return (
    <div className="w-full flex-1 bg-white flex flex-col min-h-0">
      <div className="px-4 py-2 border-b flex items-center gap-2 text-sm shrink-0">
        <span className="font-medium">{items.length} sản phẩm</span>
        {manualCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            {manualCount} giá sửa tay
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {manualCount > 0 && (
            <button
              onClick={() =>
                onChange(
                  items.map((it) =>
                    fillFromPriceBook({ ...it, tiers: it.tiers.map((t) => ({ ...t, manual: false })) }, it.priceBookPrice)
                  )
                )
              }
              className="px-2.5 py-1 text-xs rounded-lg border hover:bg-gray-50 flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Điền lại toàn bộ theo bảng giá
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setGroupMenu((v) => !v)}
              className="px-2.5 py-1 text-xs rounded-lg border border-brand text-brand hover:bg-brand-soft flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Thêm cả nhóm hàng <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {groupMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-30 py-1">
                {(Object.keys(QUOTE_CATEGORY_LABEL) as QuoteCategory[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setGroupMenu(false);
                      onAddGroup(c);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    {QUOTE_CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-1 p-8 text-center">
            <Layers className="w-8 h-8 opacity-40" />
            Tìm sản phẩm ở ô phía trên, hoặc bấm “Thêm cả nhóm hàng”.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-xs text-gray-500 uppercase tracking-wide">
                <th className="w-8" />
                <th className="px-2 py-2 text-left font-medium w-8">#</th>
                <th className="px-2 py-2 text-left font-medium">Sản phẩm</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-right font-medium whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const expanded = open === it.id;
                return (
                  <Fragment key={it.id}>
                    <tr className={`border-b ${expanded ? "bg-brand-soft" : "hover:bg-gray-50"}`}>
                      <td className="pl-2">
                        <button
                          onClick={() => setOpen(expanded ? null : it.id)}
                          aria-label={expanded ? "Thu gọn khung giá" : "Sửa khung giá"}
                          aria-expanded={expanded}
                          className="p-1 rounded hover:bg-gray-200 text-gray-500">
                          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {it.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.imageUrl} alt="" className="w-11 h-11 rounded-md object-cover border shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-md border bg-gray-50 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium leading-snug">{it.productName}</div>
                            <div className="text-xs text-gray-500">
                              {it.productCode ?? (
                                <span className="text-orange-600">Chưa khớp sản phẩm POS</span>
                              )}{" "}
                              · {it.spec} · giá / {it.unit}
                              {it.comingSoon && <span className="ml-1 text-purple-700 font-medium">· Coming soon</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      {cols.map((c) => {
                        const k = it.tiers.findIndex((t) => t.key === c.key);
                        return (
                          <td key={c.key} className="px-2 py-2">
                            {k < 0 ? (
                              <div className="text-right text-gray-300">—</div>
                            ) : (
                              <PriceCell
                                tier={it.tiers[k]}
                                base={it.priceBookPrice}
                                onPrice={(price) =>
                                  setItem(it.id, {
                                    ...it,
                                    tiers: it.tiers.map((t, j) => (j === k ? { ...t, price, manual: true } : t)),
                                  })
                                }
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="pr-2">
                        <button
                          title="Xoá dòng"
                          aria-label="Xoá dòng"
                          onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={cols.length + 4} className="p-0">
                          <TierEditor
                            item={it}
                            onItem={(next) => setItem(it.id, next)}
                            onApplyAll={() => applyAll(it)}
                            priceBookName={priceBookName}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
