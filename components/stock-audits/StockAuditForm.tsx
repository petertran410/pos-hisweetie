"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useBranchStore } from "@/lib/store/branch";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCreateStockAudit } from "@/lib/hooks/useStockAudits";
import { Search, Trash2, Loader2, X } from "lucide-react";

interface AuditItem {
  productId: number;
  productCode: string;
  productName: string;
  unit: string;
  onHand: number;
  cost: number;
  actualQuantity: string;
  note: string;
}

export function StockAuditForm({ onClose }: { onClose: () => void }) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const createAudit = useCreateStockAudit();

  const [selectedBranchLocal, setSelectedBranchLocal] =
    useState(selectedBranch);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [note, setNote] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: productsData } = useProducts({
    search: search.length >= 1 ? search : undefined,
    limit: 20,
    branchId: selectedBranchLocal?.id,
  });

  const products = productsData?.data || [];

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addProduct = (product: any) => {
    if (items.some((i) => i.productId === product.id)) return;

    const inv = product.inventories?.find(
      (i: any) => i.branchId === selectedBranchLocal?.id
    );

    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit: product.unit || "",
        onHand: inv ? Number(inv.onHand) : 0,
        cost: inv ? Number(inv.cost) : 0,
        actualQuantity: String(inv ? Number(inv.onHand) : 0), // Default = tồn kho hiện tại
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
    field: keyof AuditItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, [field]: value } : i
      )
    );
  };

  const handleSubmit = () => {
    if (!selectedBranchLocal || items.length === 0) return;

    createAudit.mutate(
      {
        branchId: selectedBranchLocal.id,
        note: note || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          actualQuantity: parseFloat(i.actualQuantity) || 0,
          note: i.note || undefined,
        })),
      },
      { onSuccess: () => onClose() }
    );
  };

  // Tính tổng
  const totals = useMemo(() => {
    let totalDiff = 0;
    let totalDiffValue = 0;
    for (const item of items) {
      const actual = parseFloat(item.actualQuantity) || 0;
      const diff = actual - item.onHand;
      totalDiff += diff;
      totalDiffValue += diff * item.cost;
    }
    return { totalDiff, totalDiffValue };
  }, [items]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Tạo phiếu kiểm kho</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Branch selector */}
        <div className="px-6 py-3 border-b flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Chi nhánh:
          </label>
          <select
            value={selectedBranchLocal?.id || ""}
            onChange={(e) => {
              const b = branches?.find(
                (b: any) => b.id === Number(e.target.value)
              );
              if (b) setSelectedBranchLocal(b);
              setItems([]); // Reset items khi đổi branch
            }}
            className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
            {(branches || []).map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm sản phẩm theo mã hoặc tên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => search && setShowDropdown(true)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {showDropdown && products.length > 0 && (
            <div className="border rounded-lg mt-1 max-h-48 overflow-y-auto bg-white shadow-lg">
              {products.map((p: any) => {
                const already = items.some((i) => i.productId === p.id);
                const inv = p.inventories?.find(
                  (i: any) => i.branchId === selectedBranchLocal?.id
                );
                return (
                  <button
                    key={p.id}
                    onClick={() => !already && addProduct(p)}
                    disabled={already}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm border-t first:border-t-0 ${
                      already
                        ? "opacity-50 cursor-not-allowed bg-gray-50"
                        : "hover:bg-gray-50"
                    }`}>
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {p.code}
                      </span>
                      {p.unit && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({p.unit})
                        </span>
                      )}
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
        <div className="flex-1 overflow-auto px-6 py-3">
          {items.length > 0 ? (
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-center">ĐVT</th>
                    <th className="px-3 py-2 text-right">Tồn kho</th>
                    <th className="px-3 py-2 text-center">Thực tế</th>
                    <th className="px-3 py-2 text-right">SL lệch</th>
                    <th className="px-3 py-2 text-right">Giá trị lệch</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const actual = parseFloat(item.actualQuantity) || 0;
                    const diff = actual - item.onHand;
                    const diffValue = diff * item.cost;

                    return (
                      <tr key={item.productId} className="border-t">
                        <td className="px-3 py-2 text-xs">
                          {item.productCode}
                        </td>
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {item.unit || "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.onHand.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item.actualQuantity}
                            onChange={(e) =>
                              updateItem(
                                item.productId,
                                "actualQuantity",
                                e.target.value
                              )
                            }
                            min="0"
                            className="w-20 border rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            diff < 0
                              ? "text-red-600"
                              : diff > 0
                                ? "text-green-600"
                                : ""
                          }`}>
                          {diff > 0
                            ? `+${diff.toLocaleString()}`
                            : diff.toLocaleString()}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${
                            diffValue < 0
                              ? "text-red-600"
                              : diffValue > 0
                                ? "text-green-600"
                                : ""
                          }`}>
                          {diffValue !== 0
                            ? (diffValue > 0 ? "+" : "") +
                              diffValue.toLocaleString() +
                              " đ"
                            : "-"}
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
                <tfoot className="bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right">
                      Tổng:
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        totals.totalDiff < 0
                          ? "text-red-600"
                          : totals.totalDiff > 0
                            ? "text-green-600"
                            : ""
                      }`}>
                      {totals.totalDiff > 0 ? "+" : ""}
                      {totals.totalDiff.toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        totals.totalDiffValue < 0
                          ? "text-red-600"
                          : totals.totalDiffValue > 0
                            ? "text-green-600"
                            : ""
                      }`}>
                      {totals.totalDiffValue !== 0
                        ? (totals.totalDiffValue > 0 ? "+" : "") +
                          totals.totalDiffValue.toLocaleString() +
                          " đ"
                        : "-"}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 text-sm">
              Tìm và thêm sản phẩm cần kiểm kho ở trên
            </div>
          )}
        </div>

        {/* Note */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú cho phiếu kiểm kho..."
            maxLength={1000}
            rows={2}
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
              disabled={items.length === 0 || createAudit.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {createAudit.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Lưu tạm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
