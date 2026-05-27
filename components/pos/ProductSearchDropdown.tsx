"use client";

import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { Search, Barcode } from "lucide-react";
import { usePriceBook } from "@/lib/hooks/usePriceBooks";
import { toast } from "sonner";

interface ProductSearchDropdownProps {
  onAddProduct: (
    product: any,
    conditionType?: string,
    quantity?: number
  ) => void;
  selectedPriceBookId?: number | null;
}

type ConditionType = string | undefined;

export function ProductSearchDropdown({
  onAddProduct,
  selectedPriceBookId,
}: ProductSearchDropdownProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Keyboard navigation
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [subOptionIndex, setSubOptionIndex] = useState(0);

  // Quantity mode (toggled by barcode icon)
  const [showQuantityInput, setShowQuantityInput] = useState(false);
  const [quantityDisplay, setQuantityDisplay] = useState("1");
  const [selectedProduct, setSelectedProduct] = useState<{
    product: any;
    conditionType?: string;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const activePriceBookId =
    selectedPriceBookId && selectedPriceBookId > 0 ? selectedPriceBookId : null;
  const { data: activePriceBook } = usePriceBook(activePriceBookId);
  const isStrictPriceBook =
    !!activePriceBook && !activePriceBook.allowNonListedProducts;
  const shouldWarnNonListed =
    !!activePriceBook &&
    activePriceBook.allowNonListedProducts &&
    activePriceBook.warnNonListedProducts;

  const { data: productsData } = useProducts({
    search: searchDebounced,
    limit: 100,
    branchId: selectedBranch?.id,
    priceBookId: activePriceBookId ?? undefined,
    onlyInPriceBook: isStrictPriceBook ? true : undefined,
  });

  const products = productsData?.data || [];

  const isProductInPriceBook = (productId: number) => {
    if (!activePriceBook?.priceBookDetails) return true;
    return activePriceBook.priceBookDetails.some(
      (d: any) => d.productId === productId && d.isActive
    );
  };

  const getDisplayPrice = (product: any): number => {
    if (activePriceBook?.priceBookDetails) {
      const detail = activePriceBook.priceBookDetails.find(
        (d: any) => d.productId === product.id && d.isActive
      );
      if (detail) return Number(detail.price);
    }
    return Number(product.basePrice);
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      if (search && !selectedProduct) {
        setShowDropdown(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedProduct]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset highlight when search results change
  useEffect(() => {
    setHighlightedIndex(-1);
    setSubOptionIndex(0);
  }, [searchDebounced, products.length]);

  // Auto scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const getInventoryQuantity = (product: any) => {
    if (!selectedBranch) return 0;
    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === selectedBranch.id
    );
    return inventory ? Number(inventory.onHand) : 0;
  };

  const getInventoryReserved = (product: any) => {
    if (!selectedBranch) return 0;
    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === selectedBranch.id
    );
    return inventory ? Number(inventory.reserved) : 0;
  };

  const getInventoryOnOrder = (product: any) => {
    if (!selectedBranch) return 0;
    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === selectedBranch.id
    );
    return inventory ? Number(inventory.onOrder) : 0;
  };

  const getInventoryCondition = (product: any) => {
    if (!selectedBranch) return { damaged: 0, nearExpiry: 0 };
    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === selectedBranch.id
    );
    return {
      damaged: inventory ? Number(inventory.damagedQuantity || 0) : 0,
      nearExpiry: inventory ? Number(inventory.nearExpiryQuantity || 0) : 0,
    };
  };

  // List of available sub-options for a product (normal + damaged? + near_expiry?)
  const getAvailableSubOptions = (product: any): ConditionType[] => {
    const condition = getInventoryCondition(product);
    const options: ConditionType[] = [undefined];
    if (condition.damaged > 0) options.push("damaged");
    if (condition.nearExpiry > 0) options.push("near_expiry");
    return options;
  };

  const currentHighlightedCondition: ConditionType =
    highlightedIndex >= 0 && products[highlightedIndex]
      ? getAvailableSubOptions(products[highlightedIndex])[subOptionIndex]
      : undefined;

  const resetAll = () => {
    setSearch("");
    setSearchDebounced("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setSubOptionIndex(0);
    setSelectedProduct(null);
    setQuantityDisplay("1");
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const safeAdd = (
    product: any,
    conditionType?: string,
    quantity: number = 1
  ): boolean => {
    if (isStrictPriceBook && !isProductInPriceBook(product.id)) {
      toast.error(
        `Sản phẩm "${product.name}" không có trong bảng giá đang chọn`
      );
      return false;
    }
    if (shouldWarnNonListed && !isProductInPriceBook(product.id)) {
      toast.warning(
        `Sản phẩm "${product.name}" không có trong bảng giá đang chọn`
      );
    }
    onAddProduct(product, conditionType, quantity);
    return true;
  };

  const handleClickAdd = (product: any, conditionType?: string) => {
    if (!safeAdd(product, conditionType, 1)) return;
    setSearch("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setSubOptionIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (selectedProduct) {
        // Cancel selection, back to empty search state
        resetAll();
      } else {
        setShowDropdown(false);
        setHighlightedIndex(-1);
        setSubOptionIndex(0);
      }
      return;
    }

    // Arrow/Enter/Tab only work when dropdown is open with items
    if (!showDropdown || products.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev + 1 >= products.length ? products.length - 1 : prev + 1
      );
      setSubOptionIndex(0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 < 0 ? 0 : prev - 1));
      setSubOptionIndex(0);
    } else if (e.key === "Tab") {
      if (highlightedIndex < 0) return;
      const product = products[highlightedIndex];
      const subOptions = getAvailableSubOptions(product);
      if (subOptions.length <= 1) return; // let Tab behave normally
      e.preventDefault();
      setSubOptionIndex((prev) => (prev + 1) % subOptions.length);
    } else if (e.key === "Enter") {
      if (highlightedIndex < 0) return;
      e.preventDefault();
      const product = products[highlightedIndex];
      const subOptions = getAvailableSubOptions(product);
      const conditionType = subOptions[subOptionIndex];

      if (showQuantityInput) {
        // Enter quantity-entry flow
        setSelectedProduct({ product, conditionType });
        setSearch(`${product.code} ${product.name}`);
        setShowDropdown(false);
        setQuantityDisplay("1");
        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 0);
      } else {
        if (!safeAdd(product, conditionType, 1)) return;
        resetAll();
      }
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!selectedProduct) return;
      const qty = parseInt(quantityDisplay, 10);
      if (!qty || qty < 1) return;
      if (!safeAdd(selectedProduct.product, selectedProduct.conditionType, qty))
        return;
      resetAll();
    } else if (e.key === "Escape") {
      e.preventDefault();
      resetAll();
    }
  };

  return (
    <div className="relative w-full flex items-center gap-2" ref={dropdownRef}>
      <div className="relative flex-1">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Tìm hàng hóa (F3)"
          value={search}
          readOnly={!!selectedProduct}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search && !selectedProduct && setShowDropdown(true)}
          onKeyDown={handleSearchKeyDown}
          className={`w-full bg-white border-0 rounded-lg px-3 lg:px-4 py-1.5 lg:py-2 pl-9 lg:pl-10 pr-9 lg:pr-10 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-white/50 ${
            selectedProduct ? "bg-gray-50" : ""
          }`}
        />

        <Search className="absolute left-2.5 lg:left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
        <button
          type="button"
          onClick={() => setShowQuantityInput((prev) => !prev)}
          title="Nhập số lượng bằng bàn phím"
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
            showQuantityInput
              ? "bg-blue-100 text-blue-600"
              : "text-gray-500 hover:bg-gray-100"
          }`}>
          <Barcode className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>

        {showDropdown && products.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            {products.map((product, idx) => {
              const condition = getInventoryCondition(product);
              const hasDamaged = condition.damaged > 0;
              const hasNearExpiry = condition.nearExpiry > 0;
              const isHighlighted = idx === highlightedIndex;

              let rowRing = "";
              if (isHighlighted) {
                if (currentHighlightedCondition === "damaged") {
                  rowRing = "ring-2 ring-inset ring-red-500";
                } else if (currentHighlightedCondition === "near_expiry") {
                  rowRing = "ring-2 ring-inset ring-amber-500";
                } else {
                  rowRing = "ring-2 ring-inset ring-blue-500";
                }
              }

              return (
                <div
                  key={product.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  className={`px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 ${rowRing}`}>
                  <div
                    onClick={() => handleClickAdd(product)}
                    className="flex items-start gap-3 cursor-pointer">
                    <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0].image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.code}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 flex-wrap">
                        <span>Tồn: {getInventoryQuantity(product)}</span>
                        <span className="text-gray-300">|</span>
                        <span>Đặt NCC: {getInventoryOnOrder(product)}</span>
                        <span className="text-gray-300">|</span>
                        <span>Khách đặt: {getInventoryReserved(product)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-blue-600 font-medium">
                        {getDisplayPrice(product).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {(hasDamaged || hasNearExpiry) && (
                    <div className="flex gap-2 mt-2 pl-[60px]">
                      {hasDamaged && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickAdd(product, "damaged");
                          }}
                          className={`px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 border transition-colors ${
                            isHighlighted &&
                            currentHighlightedCondition === "damaged"
                              ? "border-red-500 ring-2 ring-red-300"
                              : "border-red-200 hover:bg-red-100"
                          }`}>
                          Bục rách: {condition.damaged}
                        </button>
                      )}
                      {hasNearExpiry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickAdd(product, "near_expiry");
                          }}
                          className={`px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-600 border transition-colors ${
                            isHighlighted &&
                            currentHighlightedCondition === "near_expiry"
                              ? "border-amber-500 ring-2 ring-amber-300"
                              : "border-amber-200 hover:bg-amber-100"
                          }`}>
                          Cận date: {condition.nearExpiry}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
          className="w-16 lg:w-20 bg-white rounded-lg px-2 lg:px-3 py-1.5 lg:py-2 text-center text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-white/50"
        />
      )}
    </div>
  );
}
