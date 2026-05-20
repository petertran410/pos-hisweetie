"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { useBranchStore } from "@/lib/store/branch";

interface ProductInventoryMobileSheetProps {
  product: any;
  onClose: () => void;
}

export function ProductInventoryMobileSheet({
  product,
  onClose,
}: ProductInventoryMobileSheetProps) {
  const [mounted, setMounted] = useState(false);
  const { selectedBranch } = useBranchStore();

  useEffect(() => {
    setMounted(true);
    // Khoá scroll body khi sheet mở
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      setMounted(false);
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const { data: fullProduct, isLoading } = useQuery({
    queryKey: ["product", product.id, "all-inventories"],
    queryFn: () => productsApi.getProduct(product.id),
    staleTime: 30_000,
  });

  // Lọc chỉ chi nhánh isActive
  const inventories: any[] = (fullProduct?.inventories ?? [])
    .filter((inv: any) => inv.branch?.isActive !== false)
    .sort((a: any, b: any) => a.branchId - b.branchId);

  // Chi nhánh hiện tại lên đầu
  const sorted = [...inventories].sort((a, b) => {
    if (a.branchId === selectedBranch?.id) return -1;
    if (b.branchId === selectedBranch?.id) return 1;
    return 0;
  });

  const totals = inventories.reduce(
    (acc, inv) => {
      const onHand = Number(inv.onHand) || 0;
      const onOrder = Number(inv.onOrder) || 0;
      const reserved = Number(inv.reserved) || 0;
      return {
        onHand: acc.onHand + onHand,
        onOrder: acc.onOrder + onOrder,
        reserved: acc.reserved + reserved,
        canSell: acc.canSell + Math.max(0, onHand - reserved),
      };
    },
    { onHand: 0, onOrder: 0, reserved: 0, canSell: 0 }
  );

  if (!mounted) return null;

  const productLabel = product.name;
  const productUnit = product.unit ? `(${product.unit})` : "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative bg-white w-full flex flex-col rounded-t-2xl max-h-[80dvh]">
        {/* Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-1 pb-3 border-b flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900 truncate">
                {productLabel}
              </span>
              {productUnit && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {productUnit}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 pl-5.5">
              {product.code}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tổng cộng banner */}
        <div className="flex-shrink-0 px-4 py-2.5 bg-gray-50 border-b">
          <p className="text-xs font-medium text-gray-500 mb-1.5">
            Tổng tất cả chi nhánh
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Tồn", value: totals.onHand },
              { label: "Đặt NCC", value: totals.onOrder },
              { label: "KH đặt", value: totals.reserved },
              { label: "Có thể bán", value: totals.canSell, highlight: true },
            ].map((col) => (
              <div key={col.label} className="text-center">
                <p
                  className={`text-base font-bold ${
                    col.highlight ? "text-blue-600" : "text-gray-800"
                  }`}>
                  {col.value}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{col.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Branch list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Đang tải tồn kho...</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <span className="text-xs">Không có dữ liệu tồn kho</span>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sorted.map((inv: any) => {
                const isCurrent = inv.branchId === selectedBranch?.id;
                const onHand = Number(inv.onHand) || 0;
                const onOrder = Number(inv.onOrder) || 0;
                const reserved = Number(inv.reserved) || 0;
                const canSell = Math.max(0, onHand - reserved);

                return (
                  <li
                    key={inv.id ?? inv.branchId}
                    className={`px-4 py-3 ${isCurrent ? "bg-blue-50" : ""}`}>
                    {/* Branch name */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {isCurrent && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          isCurrent ? "text-blue-700" : "text-gray-800"
                        }`}>
                        {inv.branchName}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                          Hiện tại
                        </span>
                      )}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-white rounded-lg px-2 py-1.5 border border-gray-100 text-center">
                        <p
                          className={`text-sm font-bold ${
                            onHand < 0 ? "text-red-500" : "text-gray-800"
                          }`}>
                          {onHand}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Tồn</p>
                      </div>
                      <div className="bg-white rounded-lg px-2 py-1.5 border border-gray-100 text-center">
                        <p className="text-sm font-bold text-gray-800">
                          {onOrder}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Đặt NCC
                        </p>
                      </div>
                      <div className="bg-white rounded-lg px-2 py-1.5 border border-gray-100 text-center">
                        <p className="text-sm font-bold text-gray-800">
                          {reserved}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          KH đặt
                        </p>
                      </div>
                      <div
                        className={`rounded-lg px-2 py-1.5 text-center border ${
                          canSell <= 0
                            ? "bg-red-50 border-red-100"
                            : "bg-blue-50 border-blue-100"
                        }`}>
                        <p
                          className={`text-sm font-bold ${
                            canSell <= 0 ? "text-red-500" : "text-blue-600"
                          }`}>
                          {canSell}
                        </p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            canSell <= 0 ? "text-red-400" : "text-blue-400"
                          }`}>
                          Có thể bán
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer safe area */}
        <div className="flex-shrink-0 h-safe-bottom pb-2" />
      </div>
    </div>,
    document.body
  );
}
