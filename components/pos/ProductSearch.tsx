"use client";

import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { toast } from "sonner";

interface ProductSearchProps {
  onAddProduct: (product: any) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
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

  return (
    <div className="w-1/2 bg-white p-4 overflow-hidden flex flex-col">
      <div className="relative mb-4" ref={dropdownRef}>
        <input
          type="text"
          placeholder="Tìm hàng hóa (F3)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search && setShowDropdown(true)}
          className="w-full border rounded px-3 py-2 pr-10"
        />

        {showDropdown && products.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-96 overflow-y-auto z-50">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left border-b last:border-b-0">
                <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0].image}
                      alt={product.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500">{product.code}</div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-600">
                      Tồn: {getInventoryQuantity(product)}
                    </span>
                    <span className="text-xs">|</span>
                    <span className="text-xs text-gray-600">
                      Đặt NCC: {product.supplierOrder || 0}
                    </span>
                    <span className="text-xs">|</span>
                    <span className="text-xs text-gray-600">KH đặt: 0</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-blue-600 font-medium">
                    {Number(product.basePrice).toLocaleString()}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Hộp");
                      }}
                      className="px-2 py-0.5 text-xs border rounded hover:bg-gray-100">
                      Hộp
                    </button>
                  </div>
                </div>
              </button>
            ))}
            <button className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 border-t">
              + Thêm mới hàng hóa
            </button>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-500 text-center py-8">
        {search && products.length === 0 && searchDebounced && (
          <div>Không tìm thấy sản phẩm</div>
        )}
        {!search && <div>Nhập tên hoặc mã sản phẩm để tìm kiếm</div>}
      </div>
    </div>
  );
}
