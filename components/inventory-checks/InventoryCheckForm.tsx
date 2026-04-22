"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Plus, Trash2, Loader2 } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCreateInventoryCheck } from "@/lib/hooks/useInventoryChecks";

interface CheckItem {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  onHand: number;
  currentDamaged: number;
  currentNearExpiry: number;
  damagedQuantity: string;
  nearExpiryQuantity: string;
  note: string;
}

interface Props {
  onClose: () => void;
}

export function InventoryCheckForm({ onClose }: Props) {
  const { selectedBranch } = useBranchStore();
  const createCheck = useCreateInventoryCheck();

  const [items, setItems] = useState<CheckItem[]>([]);
  const [note, setNote] = useState("");
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
    const t = setTimeout(() => {
      setSearchDebounced(search);
      if (search) setShowDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addProduct = (product: any) => {
    if (items.some((i) => i.productId === product.id)) {
      setSearch("");
      setShowDropdown(false);
      return;
    }

    const inv = product.inventories?.find(
      (i: any) => i.branchId === selectedBranch?.id
    );

    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit: product.unit,
        onHand: inv ? Number(inv.onHand) : 0,
        currentDamaged: inv ? Number(inv.damagedQuantity || 0) : 0,
        currentNearExpiry: inv ? Number(inv.nearExpiryQuantity || 0) : 0,
        damagedQuantity: String(inv ? Number(inv.damagedQuantity || 0) : 0),
        nearExpiryQuantity: String(
          inv ? Number(inv.nearExpiryQuantity || 0) : 0
        ),
        note: "",
      },
    ]);

    setSearch("");
    setShowDropdown(false);
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateItem = (
    productId: number,
    field: keyof CheckItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, [field]: value } : i
      )
    );
  };

  const handleSubmit = () => {
    if (!selectedBranch) return;
    if (items.length === 0) return;

    // Validate
    for (const item of items) {
      const damaged = parseInt(item.damagedQuantity) || 0;
      const nearExpiry = parseInt(item.nearExpiryQuantity) || 0;
      if (damaged + nearExpiry > item.onHand) {
        alert(
          `${item.productName}: Tổng loại B (${damaged}) + cận date (${nearExpiry}) = ${damaged + nearExpiry} vượt quá tồn kho (${item.onHand})`
        );
        return;
      }
    }

    createCheck.mutate(
      {
        branchId: selectedBranch.id,
        note: note || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          damagedQuantity: parseInt(i.damagedQuantity) || 0,
          nearExpiryQuantity: parseInt(i.nearExpiryQuantity) || 0,
          note: i.note || undefined,
        })),
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">
            Tạo phiếu kiểm hàng loại B
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {/* Branch + Note */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chi nhánh
              </label>
              <input
                type="text"
                value={selectedBranch?.name || ""}
                disabled
                className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
              />
            </div>
          </div>

          {/* Product search */}
          <div className="relative mb-4" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm sản phẩm theo mã hoặc tên..."
                className="w-full border rounded px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {showDropdown && products.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-b shadow-lg z-10 max-h-60 overflow-auto">
                {products.map((p) => {
                  const already = items.some((i) => i.productId === p.id);
                  const inv = p.inventories?.find(
                    (i: any) => i.branchId === selectedBranch?.id
                  );
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={already}
                      className={`w-full text-left px-3 py-2 border-b last:border-b-0 flex items-center justify-between ${
                        already
                          ? "opacity-50 cursor-not-allowed bg-gray-50"
                          : "hover:bg-gray-50"
                      }`}>
                      <div>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {p.code}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Tồn: {inv ? Number(inv.onHand).toLocaleString() : 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-right">Tồn kho</th>
                    <th className="px-3 py-2 text-right">Loại B hiện tại</th>
                    <th className="px-3 py-2 text-right">Cận date hiện tại</th>
                    <th className="px-3 py-2 text-center">Loại B mới</th>
                    <th className="px-3 py-2 text-center">Cận date mới</th>
                    <th className="px-3 py-2 text-center">Hàng tốt</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const damaged = parseInt(item.damagedQuantity) || 0;
                    const nearExpiry = parseInt(item.nearExpiryQuantity) || 0;
                    const goodStock = item.onHand - damaged - nearExpiry;
                    const isOverflow = damaged + nearExpiry > item.onHand;

                    return (
                      <tr key={item.productId} className="border-t">
                        <td className="px-3 py-2 text-xs">
                          {item.productCode}
                        </td>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">
                          {item.onHand.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {item.currentDamaged.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {item.currentNearExpiry.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="text"
                            value={item.damagedQuantity}
                            onChange={(e) =>
                              updateItem(
                                item.productId,
                                "damagedQuantity",
                                e.target.value.replace(/[^\d]/g, "")
                              )
                            }
                            className={`w-16 border rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 ${
                              isOverflow
                                ? "border-red-400 focus:ring-red-300"
                                : "focus:ring-blue-400"
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="text"
                            value={item.nearExpiryQuantity}
                            onChange={(e) =>
                              updateItem(
                                item.productId,
                                "nearExpiryQuantity",
                                e.target.value.replace(/[^\d]/g, "")
                              )
                            }
                            className={`w-16 border rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 ${
                              isOverflow
                                ? "border-red-400 focus:ring-red-300"
                                : "focus:ring-blue-400"
                            }`}
                          />
                        </td>
                        <td
                          className={`px-3 py-2 text-center font-medium ${isOverflow ? "text-red-600" : "text-green-600"}`}>
                          {isOverflow
                            ? "Vượt quá!"
                            : goodStock.toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.note}
                            onChange={(e) =>
                              updateItem(item.productId, "note", e.target.value)
                            }
                            placeholder="..."
                            className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              Tìm và thêm sản phẩm cần kiểm tra ở trên
            </div>
          )}
        </div>

        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú cho phiếu kiểm..."
            maxLength={1000}
            rows={3}
            className="w-full border rounded px-3 py-2 resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50 rounded-b-lg">
          <span className="text-sm text-gray-500">{items.length} sản phẩm</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={items.length === 0 || createCheck.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {createCheck.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Tạo phiếu kiểm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
