"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Barcode } from "lucide-react";
import { useProducts } from "@/lib/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";

interface ProductPickerDropdownProps {
  branchId?: number;
  disabled?: boolean;
  placeholder?: string;
  onAddProduct: (product: any, quantity?: number) => void;
}

export function ProductPickerDropdown({
  branchId,
  disabled,
  placeholder = "Tìm sản phẩm theo mã hoặc tên... (F3)",
  onAddProduct,
}: ProductPickerDropdownProps) {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Quantity-entry mode (toggled by Barcode icon)
  const [showQuantityInput, setShowQuantityInput] = useState(false);
  const [quantityDisplay, setQuantityDisplay] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const { data: productsData } = useProducts({
    search: searchDebounced,
    limit: 500,
    branchId,
    isActive: true,
  });
  const products = productsData?.data || [];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      if (search && !selectedProduct) setShowDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedProduct]);

  // Click outside closes dropdown
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchDebounced, products.length]);

  // Auto scroll highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // F3 keyboard shortcut to focus
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  }, []);

  const getInventoryQuantity = (product: any): number => {
    if (!branchId) return 0;
    const inv = product.inventories?.find(
      (i: any) => i.branchId === branchId
    );
    return inv ? Number(inv.onHand) : 0;
  };

  const getProductCost = (product: any): number => {
    if (!branchId) return Number(product.basePrice || 0);
    const inv = product.inventories?.find(
      (i: any) => i.branchId === branchId
    );
    return inv ? Number(inv.cost) : Number(product.basePrice || 0);
  };

  const resetAll = () => {
    setSearch("");
    setSearchDebounced("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setSelectedProduct(null);
    setQuantityDisplay("1");
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleClickAdd = (product: any) => {
    onAddProduct(product, 1);
    setSearch("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (selectedProduct) {
        resetAll();
      } else {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
      return;
    }

    if (!showDropdown || products.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev + 1 >= products.length ? products.length - 1 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? 0 : prev - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex < 0) return;
      e.preventDefault();
      const product = products[highlightedIndex];

      if (showQuantityInput) {
        setSelectedProduct(product);
        setSearch(`${product.code} ${product.name}`);
        setShowDropdown(false);
        setQuantityDisplay("1");
        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 0);
      } else {
        onAddProduct(product, 1);
        resetAll();
      }
    }
  };

  const handleQuantityKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!selectedProduct) return;
      const qty = parseInt(quantityDisplay, 10);
      if (!qty || qty < 1) return;
      onAddProduct(selectedProduct, qty);
      resetAll();
    } else if (e.key === "Escape") {
      e.preventDefault();
      resetAll();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          readOnly={!!selectedProduct}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search && !selectedProduct && setShowDropdown(true)}
          onKeyDown={handleSearchKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed ${
            selectedProduct ? "bg-gray-50" : "bg-white"
          }`}
        />
        <button
          type="button"
          onClick={() => setShowQuantityInput((p) => !p)}
          title="Nhập số lượng bằng bàn phím"
          disabled={disabled}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors disabled:opacity-50 ${
            showQuantityInput
              ? "bg-brand-soft text-brand"
              : "text-gray-500 hover:bg-gray-100"
          }`}>
          <Barcode className="w-5 h-5" />
        </button>

        {showDropdown && products.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            {products.map((product, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const stock = getInventoryQuantity(product);
              const cost = getProductCost(product);

              return (
                <div
                  key={product.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  onClick={() => handleClickAdd(product)}
                  className={`px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer flex items-start gap-3 ${
                    isHighlighted
                      ? "bg-brand-soft ring-2 ring-inset ring-brand"
                      : ""
                  }`}>
                  <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                    {product.images?.[0]?.image ? (
                      <img
                        src={product.images[0].image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        📦
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500">{product.code}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 flex-wrap">
                      <span>
                        Tồn:{" "}
                        <span className={stock < 0 ? "text-red-600 font-medium" : ""}>
                          {stock.toLocaleString()}
                        </span>
                      </span>
                      {product.unit && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>ĐVT: {product.unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-brand font-medium text-sm">
                      {formatCurrency(cost)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showDropdown && search && products.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-gray-500 text-center">
            Không tìm thấy sản phẩm
          </div>
        )}
      </div>

      {showQuantityInput && (
        <input
          ref={quantityInputRef}
          type="text"
          inputMode="numeric"
          value={quantityDisplay}
          onChange={(e) =>
            setQuantityDisplay(e.target.value.replace(/[^\d]/g, ""))
          }
          onKeyDown={handleQuantityKeyDown}
          placeholder="SL"
          className="w-20 px-3 py-2.5 border rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      )}
    </div>
  );
}
