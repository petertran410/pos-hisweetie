"use client";

import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useBranchStore } from "@/lib/store/branch";
import { toast } from "sonner";
import { X, Minus, Plus } from "lucide-react";
import { CartItem } from "@/app/(dashboard)/ban-hang/page";

interface ProductSearchProps {
  onAddProduct: (product: any) => void;
  cartItems: CartItem[];
  onUpdateItem: (productId: number, updates: Partial<CartItem>) => void;
  onRemoveItem: (productId: number) => void;
}

export function ProductSearch({
  onAddProduct,
  cartItems,
  onUpdateItem,
  onRemoveItem,
}: ProductSearchProps) {
  const { selectedBranch } = useBranchStore();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
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
    <div className="w-1/2 bg-white p-4 flex flex-col h-full">
      <div className="relative mb-4" ref={dropdownRef}>
        <input
          type="text"
          placeholder="Tìm hàng hóa (F3)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => search && setShowDropdown(true)}
          className="w-full border rounded-xl px-3 py-2 pr-10"
        />

        {showDropdown && products.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg max-h-96 overflow-y-auto z-50">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddProduct(product)}
                className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 cursor-pointer border-b last:border-b-0">
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
                    <span className="text-xs text-gray-600">KH đặt: 0</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-blue-600 font-medium">
                    {Number(product.basePrice).toLocaleString()}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Hộp");
                      }}
                      className="px-2 py-0.5 text-xs border rounded hover:bg-gray-100 cursor-pointer inline-block">
                      Hộp
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-center">
            <div>
              {search && products.length === 0 && searchDebounced ? (
                <div>Không tìm thấy sản phẩm</div>
              ) : (
                <div>Nhập tên hoặc mã sản phẩm để tìm kiếm</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="border-2 rounded-xl divide-y">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="p-3 hover:bg-gray-50 relative"
                  onMouseEnter={() => setHoveredItemId(item.product.id)}
                  onMouseLeave={() => setHoveredItemId(null)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex">
                      <div className="flex-1">
                        <div className="font-medium text-md">
                          {item.product.code}
                        </div>
                        <div className="border-t mt-2"></div>
                        <div className="text-md mt-2 text-black">
                          {item.product.name}
                        </div>
                        {item.note ? (
                          <div className="text-xs text-gray-500 italic mt-1">
                            {item.note}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic mt-1"></div>
                        )}
                      </div>

                      <div className="flex items-center justify-between ml-10">
                        <button
                          onClick={() =>
                            onUpdateItem(item.product.id, {
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="p-2 hover:bg-gray-200 rounded">
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            onUpdateItem(item.product.id, {
                              quantity: Math.max(1, Number(e.target.value)),
                            })
                          }
                          className="w-16 text-center border rounded px-1 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <button
                          onClick={() =>
                            onUpdateItem(item.product.id, {
                              quantity: item.quantity + 1,
                            })
                          }
                          className="p-2 hover:bg-gray-200 rounded">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div className="text-blue-600 font-medium text-xl">
                        {(
                          item.quantity * item.price -
                          item.discount
                        ).toLocaleString()}
                      </div>
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="text-gray-400 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onUpdateItem(item.product.id, {
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                        className="p-1 hover:bg-gray-200 rounded">
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateItem(item.product.id, {
                            quantity: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-16 text-center border rounded px-1 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <button
                        onClick={() =>
                          onUpdateItem(item.product.id, {
                            quantity: item.quantity + 1,
                          })
                        }
                        className="p-1 hover:bg-gray-200 rounded">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div> */}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
