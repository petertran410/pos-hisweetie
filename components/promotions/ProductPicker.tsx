"use client";

import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { Search } from "lucide-react";

interface ProductPickerProps {
  value?: number | null;
  productLabel?: string;
  placeholder?: string;
  onChange: (product: { id: number; name: string; code: string; basePrice: number } | null) => void;
}

/** Ô tìm + chọn 1 sản phẩm, dùng trong form khuyến mãi. */
export function ProductPicker({
  value,
  productLabel,
  placeholder = "Tìm sản phẩm theo tên / mã...",
  onChange,
}: ProductPickerProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useProducts({
    search: debounced || undefined,
    limit: 20,
    branchId: selectedBranch?.id,
  } as any);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const products = (data?.data || []) as any[];

  return (
    <div className="relative" ref={ref}>
      {value && productLabel ? (
        <div className="flex items-center justify-between gap-2 rounded border border-gray-300 px-3 py-2 text-sm">
          <span className="truncate">{productLabel}</span>
          <button
            type="button"
            className="text-red-500 hover:underline"
            onClick={() => onChange(null)}
          >
            Bỏ chọn
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            className="w-full text-sm outline-none"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>
      )}

      {open && !value && products.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded border border-gray-200 bg-white shadow-lg">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
              onClick={() => {
                onChange({
                  id: p.id,
                  name: p.name,
                  code: p.code,
                  basePrice: Number(p.basePrice) || 0,
                });
                setOpen(false);
                setSearch("");
              }}
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-xs text-gray-500">
                {p.code} · {Number(p.basePrice || 0).toLocaleString("vi-VN")}đ
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
