"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useProducts, useConditionSummaryBatch } from "@/lib/hooks/useProducts";
import { useOrdersPendingSummary } from "@/lib/hooks/useOrders";
import { useOrderSuppliersConfirmedSummary } from "@/lib/hooks/useOrderSuppliers";
import { useBranchStore } from "@/lib/store/branch";
import { Search, Barcode } from "lucide-react";
import { usePriceBook } from "@/lib/hooks/usePriceBooks";
import { toast } from "sonner";

interface ProductSearchDropdownProps {
  onAddProduct: (
    product: any,
    conditionType?: string,
    quantity?: number,
    soldExpiryDate?: string
  ) => void;
  selectedPriceBookId?: number | null;
}

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

  const { data: productsData } = useProducts(
    {
      search: searchDebounced,
      limit: 500,
      branchId: selectedBranch?.id,
      priceBookId: activePriceBookId ?? undefined,
      onlyInPriceBook: isStrictPriceBook ? true : undefined,
      // Chỉ cho phép bán những sản phẩm được đánh dấu bán trực tiếp.
      isDirectSale: true,
      // Loại bỏ sản phẩm đã ngừng hoạt động.
      isActive: true,
    },
    // Không fetch khi chưa gõ gì để tránh kéo toàn bộ bảng sản phẩm.
    { enabled: !!searchDebounced }
  );

  const products = productsData?.data || [];

  // Gom id sản phẩm đang hiển thị để lấy số "Khách đặt" / "Đặt NCC" tính động
  // (giống trang /san-pham/danh-sach), thay cho field tồn kho denormalized.
  const productIds = useMemo(() => products.map((p) => p.id), [products]);

  const { data: pendingSummary } = useOrdersPendingSummary(
    productIds,
    selectedBranch?.id
  );
  const pendingMap = pendingSummary || {};

  const { data: supplierSummary } = useOrderSuppliersConfirmedSummary(
    productIds,
    selectedBranch?.id
  );
  const supplierMap = supplierSummary || {};

  // Tồn 3 bucket (bục rách / cận date / KM) lấy TỪ SỔ CÁI cho toàn bộ sản phẩm
  // đang hiển thị — 1 request batch, tránh N+1 và tránh lệch với thẻ kho.
  const { data: conditionSummary } = useConditionSummaryBatch(
    productIds,
    selectedBranch?.id
  );
  const conditionMap = conditionSummary || {};

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

  // Tồn 3 bucket đọc TỪ SỔ CÁI (StockConditionLog) — nguồn chân lý, khớp với
  // tab "Thẻ kho loại tồn". KHÔNG đọc cache Inventory.damagedQuantity/... vì
  // cache có thể trôi khỏi sổ cái (các module trả hàng/trả NCC/trả ký gửi/
  // KLB/KKM/sửa tình trạng thủ công còn ghi trực tiếp vào cột cache).
  const getInventoryCondition = (product: any) => {
    const totals = conditionMap[product.id];
    if (!totals) return { damaged: 0, nearExpiry: 0, promo: 0 };
    return {
      damaged: Number(totals.damaged || 0),
      nearExpiry: Number(totals.nearExpiry || 0),
      // Tồn phân bổ KM (có thể âm khi xuất vượt). Chỉ hiển thị, không chọn được.
      promo: Number(totals.promo || 0),
    };
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

  // Thêm sản phẩm vào giỏ. LUÔN thêm dưới dạng hàng thường (conditionType
  // không truyền) — việc chọn Bục rách / Cận date được làm TRÊN CARD trong giỏ
  // hàng (giống nút khuyến mãi), không chọn ở dropdown tìm kiếm nữa.
  const safeAdd = (product: any, quantity: number = 1): boolean => {
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
    onAddProduct(product, undefined, quantity, undefined);
    return true;
  };

  const handleClickAdd = (product: any) => {
    if (!safeAdd(product, 1)) return;
    setSearch("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
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
      }
      return;
    }

    // Arrow/Enter only work when dropdown is open with items
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
        // Enter quantity-entry flow
        setSelectedProduct({ product });
        setSearch(`${product.code} ${product.name}`);
        setShowDropdown(false);
        setQuantityDisplay("1");
        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 0);
      } else {
        if (!safeAdd(product, 1)) return;
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
      if (!safeAdd(selectedProduct.product, qty)) return;
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
              ? "bg-brand-soft text-brand"
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
              // Hiển thị cả khi âm (xuất vượt phân bổ KM).
              const hasPromo = condition.promo !== 0;
              const isHighlighted = idx === highlightedIndex;

              const rowRing = isHighlighted
                ? "ring-2 ring-inset ring-brand"
                : "";

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
                        <span>
                          Đặt NCC: {(supplierMap[product.id] ?? 0).toLocaleString()}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span>
                          Khách đặt: {(pendingMap[product.id] ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-price font-semibold">
                        {getDisplayPrice(product).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 3 badge loại tồn CHỈ ĐỂ HIỂN THỊ (không bấm được). Việc chọn
                      bán hàng bục rách / cận date được làm trên card sản phẩm
                      trong giỏ hàng, giống cách bật khuyến mãi. */}
                  {(hasDamaged || hasNearExpiry || hasPromo) && (
                    <div className="flex gap-2 mt-2 pl-[60px] flex-wrap">
                      {hasDamaged && (
                        <span
                          title="Chỉ hiển thị — chọn hàng bục rách ở card sản phẩm trong giỏ"
                          className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 border border-red-200 select-none cursor-default">
                          Bục rách: {condition.damaged}
                        </span>
                      )}
                      {hasNearExpiry && (
                        <span
                          title="Chỉ hiển thị — chọn hàng cận date ở card sản phẩm trong giỏ"
                          className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-600 border border-amber-200 select-none cursor-default">
                          Cận date: {condition.nearExpiry}
                        </span>
                      )}
                      {hasPromo && (
                        <span
                          title="Chỉ hiển thị — chọn quà KM từ giỏ hàng (nút khuyến mãi)"
                          className={`px-2 py-0.5 text-xs rounded-full border select-none cursor-default ${
                            condition.promo < 0
                              ? "bg-purple-50 text-purple-700 border-purple-300"
                              : "bg-purple-50 text-purple-600 border-purple-200"
                          }`}>
                          KM: {condition.promo}
                        </span>
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
