"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { useBranchStore } from "@/lib/store/branch";

interface ProductInventoryModalProps {
  product: any;
  onClose: () => void;
}

export function ProductInventoryModal({
  product,
  onClose,
}: ProductInventoryModalProps) {
  const [mounted, setMounted] = useState(false);
  const { selectedBranch } = useBranchStore();

  useEffect(() => {
    setMounted(true);
    // Close on ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      setMounted(false);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const { data: fullProduct, isLoading } = useQuery({
    queryKey: ["product", product.id, "all-inventories"],
    queryFn: () => productsApi.getProduct(product.id),
    staleTime: 30_000,
  });

  // Lọc chỉ các chi nhánh đang active
  const inventories: any[] = (fullProduct?.inventories ?? [])
    .filter((inv: any) => inv.branch?.isActive !== false)
    .sort((a: any, b: any) => a.branchId - b.branchId);

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

  const productLabel = [product.name, product.unit && `(${product.unit})`]
    .filter(Boolean)
    .join(" - ");

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900 text-sm truncate pr-4">
            {productLabel}
          </h3>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-brand text-white">
                <th className="text-left px-4 py-2 font-medium">Chi nhánh</th>
                <th className="text-right px-3 py-2 font-medium">Tồn</th>
                <th className="text-right px-3 py-2 font-medium">Đặt NCC</th>
                <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                  Tổng KH đặt
                </th>
                <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                  Có thể bán
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Tổng cộng */}
              <tr className="border-b bg-gray-50">
                <td className="px-4 py-2 font-semibold text-gray-700">
                  Tổng cộng
                </td>
                <td className="text-right px-3 py-2 font-semibold">
                  {totals.onHand}
                </td>
                <td className="text-right px-3 py-2 font-semibold">
                  {totals.onOrder}
                </td>
                <td className="text-right px-3 py-2 font-semibold">
                  {totals.reserved}
                </td>
                <td className="text-right px-3 py-2 font-semibold">
                  {totals.canSell}
                </td>
              </tr>

              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                    <span className="text-xs">Đang tải...</span>
                  </td>
                </tr>
              ) : inventories.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-gray-400 text-xs">
                    Không có dữ liệu tồn kho
                  </td>
                </tr>
              ) : (
                inventories.map((inv: any) => {
                  const isCurrent = inv.branchId === selectedBranch?.id;
                  const onHand = Number(inv.onHand) || 0;
                  const onOrder = Number(inv.onOrder) || 0;
                  const reserved = Number(inv.reserved) || 0;
                  const canSell = Math.max(0, onHand - reserved);

                  return (
                    <tr
                      key={inv.id ?? inv.branchId}
                      className={`border-b transition-colors ${
                        isCurrent ? "bg-brand-soft" : "hover:bg-gray-50"
                      }`}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`${isCurrent ? "font-semibold text-brand-dark" : "text-gray-700"}`}>
                            {inv.branchName}
                          </span>
                          {isCurrent && (
                            <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td
                        className={`text-right px-3 py-2 ${onHand < 0 ? "text-red-600" : ""}`}>
                        {onHand}
                      </td>
                      <td className="text-right px-3 py-2 text-gray-600">
                        {onOrder}
                      </td>
                      <td className="text-right px-3 py-2 text-gray-600">
                        {reserved}
                      </td>
                      <td
                        className={`text-right px-3 py-2 font-medium ${
                          canSell <= 0 ? "text-red-500" : "text-gray-900"
                        }`}>
                        {canSell}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
