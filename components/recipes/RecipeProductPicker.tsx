"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Search, X } from "lucide-react";
import type { RecipeIngredientProduct } from "@/lib/api/recipes";
import { useRecipeIngredientProducts } from "@/lib/hooks/useRecipes";
import { useDropdownPosition } from "@/components/ui/filters/useDropdownPosition";

const money = (value?: number | null) =>
  value == null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(value))}đ`;

export function RecipeProductPicker({
  value,
  selectedProduct,
  disabled,
  showCost,
  onChange,
}: {
  value?: number;
  selectedProduct?: RecipeIngredientProduct;
  disabled?: boolean;
  showCost: boolean;
  onChange: (product?: RecipeIngredientProduct) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const pos = useDropdownPosition(open, triggerRef, 320, 420);
  const { data: products = [], isFetching } = useRecipeIngredientProducts(query || undefined, open);
  const queryPending = input.trim() !== query;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setHighlightedIndex(-1);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const selectedLabel = selectedProduct
    ? `${selectedProduct.code} - ${selectedProduct.name}`
    : value ? `Sản phẩm #${value}` : "";
  const select = (product: RecipeIngredientProduct) => {
    onChange(product);
    setInput("");
    setQuery("");
    setOpen(false);
  };
  const clear = () => {
    onChange(undefined);
    setInput("");
    setQuery("");
    setHighlightedIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (input) setInput("");
      else setOpen(false);
      return;
    }
    if (!open || queryPending || isFetching || !products.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) => Math.min(index + 1, products.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      select(products[highlightedIndex]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div ref={triggerRef} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          disabled={disabled}
          value={open ? input : selectedLabel}
          onFocus={() => { setInput(""); setQuery(""); setOpen(true); }}
          onChange={(event) => { setInput(event.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label="Tìm sản phẩm theo mã hoặc tên"
          placeholder="Tìm mã hoặc tên sản phẩm..."
          className="w-full rounded-lg border bg-white py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50 disabled:text-gray-500"
          style={{ borderColor: "var(--dt-border)" }}
        />
        {!disabled && value && !open && <button type="button" onClick={clear} aria-label="Bỏ chọn sản phẩm" className="absolute right-2 top-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button>}
      </div>
      {open && !disabled && pos && typeof document !== "undefined" && createPortal(
        <div id={listboxId} ref={panelRef} role="listbox" className="fixed z-[1000] overflow-y-auto rounded-xl border bg-white shadow-xl" style={{ left: pos.left, width: pos.width, maxHeight: pos.maxHeight, borderColor: "var(--dt-border)", ...(pos.dropUp ? { top: pos.top, transform: "translateY(-100%)" } : { top: pos.top }) }}>
          {selectedProduct && !input.trim() && <div className="border-b bg-cyan-50/60 px-3 py-2 text-xs font-medium text-[#3A6B74]" style={{ borderColor: "var(--dt-border)" }}>Đang chọn: {selectedLabel}</div>}
          {(queryPending || isFetching) ? <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-brand" />Đang tìm sản phẩm...</div> : products.length === 0 ? <div className="px-3 py-8 text-center text-sm text-gray-500">{query ? "Không tìm thấy sản phẩm" : "Nhập mã hoặc tên để tìm sản phẩm"}</div> : products.map((product, index) => (
            <button key={product.id} ref={(element) => { itemRefs.current[index] = element; }} type="button" role="option" aria-selected={product.id === value} onMouseEnter={() => setHighlightedIndex(index)} onClick={() => select(product)} className={`flex w-full items-start justify-between gap-3 border-b px-3 py-2.5 text-left last:border-0 ${index === highlightedIndex ? "bg-cyan-50" : "hover:bg-gray-50"}`} style={{ borderColor: "var(--dt-border)" }}>
              <span className="min-w-0"><span className="block truncate text-sm font-medium text-gray-900">{product.name}</span><span className="font-mono text-xs text-gray-500">{product.code}</span></span>
              <span className="flex shrink-0 items-center gap-2 text-right text-xs text-gray-500">{showCost && <span><span className="block font-mono font-medium text-[#0D3B42]">{money(product.unitCost)}</span><span>{product.netWeightGram ? `${new Intl.NumberFormat("vi-VN").format(product.netWeightGram)} gram` : "Thiếu khối lượng"}</span></span>}{product.id === value && <Check className="h-4 w-4 text-brand" />}</span>
            </button>
          ))}
        </div>, document.body,
      )}
    </div>
  );
}
