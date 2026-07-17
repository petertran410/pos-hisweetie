"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useProducts } from "@/lib/hooks/useProducts";
import { useDropdownPosition } from "./useDropdownPosition";

interface FilterProductSearchProps {
  value: number | undefined;
  onChange: (productId: number | undefined) => void;
}

/** Select one product to filter documents that contain that product. */
export function FilterProductSearch({ value, onChange }: FilterProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pos = useDropdownPosition(open, triggerRef, 320);

  const { data: productsData } = useProducts(
    { search: searchDebounced, limit: 50, isActive: true },
    { enabled: !!searchDebounced }
  );
  const products = productsData?.data || [];

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const clear = () => {
    setSelectedProduct(null);
    setSearch("");
    setSearchDebounced("");
    onChange(undefined);
  };

  const select = (product: any) => {
    setSelectedProduct(product);
    setSearch("");
    setSearchDebounced("");
    onChange(product.id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div
        ref={triggerRef}
        className={`w-full flex items-center gap-2 border rounded-lg px-2 py-1 bg-white transition-colors ${
          open ? "border-brand ring-2 ring-brand-soft" : "hover:border-gray-400"
        }`}>
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={selectedProduct ? `${selectedProduct.code} - ${selectedProduct.name}` : search}
          placeholder="Tìm sản phẩm..."
          readOnly={!!selectedProduct}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          className="min-w-0 flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Bỏ lọc sản phẩm"
            className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] overflow-y-auto"
            style={{
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              ...(pos.dropUp
                ? { top: pos.top, transform: "translateY(-100%)" }
                : { top: pos.top }),
            }}>
            {!searchDebounced ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                Nhập mã hoặc tên sản phẩm
              </div>
            ) : products.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                Không tìm thấy sản phẩm
              </div>
            ) : (
              products.map((product: any) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => select(product)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 border-b last:border-b-0 border-gray-50">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{product.code}</div>
                  </div>
                  {value === product.id && <Check className="w-4 h-4 text-brand flex-shrink-0" />}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
