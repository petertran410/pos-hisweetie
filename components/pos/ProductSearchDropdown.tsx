"use client";

import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { Search } from "lucide-react";

interface ProductSearchDropdownProps {
  onAddProduct: (product: any, conditionType?: string) => void;
}

export function ProductSearchDropdown({
  onAddProduct,
}: ProductSearchDropdownProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: productsData } = useProducts({
    search: searchDebounced,
    limit: 10,
    branchId: selectedBranch?.id,
  });

  const products = productsData?.data || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      if (search) {
        setShowDropdown(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

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

  const handleAddProduct = (product: any) => {
    onAddProduct(product);
    setSearch("");
    setShowDropdown(false);
  };

  const getInventoryQuantity = (product: any) => {
    if (!selectedBranch) return 0;
    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === selectedBranch.id
    );
    return inventory ? Number(inventory.onHand) : 0;
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

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Tìm hàng hóa (F3)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search && setShowDropdown(true)}
          className="w-full bg-white border-0 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-white/50"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      </div>

      {showDropdown && products.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {products.map((product) => {
            const condition = getInventoryCondition(product);
            const hasDamaged = condition.damaged > 0;
            const hasNearExpiry = condition.nearExpiry > 0;

            return (
              <div
                key={product.id}
                className="px-4 py-3 hover:bg-gray-50 border-b last:border-b-0">
                {/* Dòng chính - click để thêm hàng thường */}
                <div
                  onClick={() => handleAddProduct(product)}
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
                    <div className="text-xs text-gray-500">{product.code}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      <span>Tồn: {getInventoryQuantity(product)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-blue-600 font-medium">
                      {Number(product.basePrice).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Badges bục rách / cận date — chỉ hiện khi có */}
                {(hasDamaged || hasNearExpiry) && (
                  <div className="flex gap-2 mt-2 ml-15 pl-[60px]">
                    {hasDamaged && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddProduct(product, "damaged");
                          setSearch("");
                          setShowDropdown(false);
                        }}
                        className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                        Bục rách: {condition.damaged}
                      </button>
                    )}
                    {hasNearExpiry && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddProduct(product, "near_expiry");
                          setSearch("");
                          setShowDropdown(false);
                        }}
                        className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors">
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
  );
}
