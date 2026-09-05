"use client";

import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  transfersApi,
  type DraftTransferCandidate,
} from "@/lib/api/transfers";
import { productsApi } from "@/lib/api/products";
import type { TransferPlanningItem } from "@/lib/types/transfer-planning";
import { TransferPreviewPopup } from "./TransferPreviewPopup";

const HN_BRANCH_ID = 6;
const SG_BRANCH_ID = 1;

// ── vi-VN number helpers ──
// Quy tắc: , = dấu thập phân, . = phân cách hàng nghìn

function formatViInteger(n: number): string {
  if (!Number.isFinite(n)) return "";
  return Math.round(n).toLocaleString("vi-VN");
}

function formatViDecimal(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function parseViNumber(str: string): number {
  const s = str.trim();
  if (!s) return NaN;
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

interface AddToTransferModalProps {
  item: TransferPlanningItem;
  onClose: () => void;
}

export function AddToTransferModal({ item, onClose }: AddToTransferModalProps) {
  const queryClient = useQueryClient();
  const packSize = item.packSize > 1 ? item.packSize : 1;
  const hasCarton = packSize > 1;

  const [quantity, setQuantity] = useState<string>(
    formatViInteger(Math.round(item.computed.suggestedQuantity))
  );
  const [cartonQuantity, setCartonQuantity] = useState<string>(() =>
    hasCarton
      ? formatViDecimal(item.computed.suggestedQuantity / packSize, 1)
      : ""
  );
  const [selectedId, setSelectedId] = useState<number | "new">("new");
  const [previewTransferId, setPreviewTransferId] = useState<number | null>(null);

  const { data: candidatesData, isLoading: isLoadingCandidates } = useQuery({
    queryKey: ["transfer-draft-candidates"],
    queryFn: () => transfersApi.getDraftCandidates(),
    staleTime: 30_000,
  });

  const candidates: DraftTransferCandidate[] = candidatesData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async (qty: number) => {
      const product = await productsApi.getProduct(item.id);
      const hnInventory = product.inventories?.find(
        (inv: any) => inv.branchId === HN_BRANCH_ID
      );
      const price = Number(hnInventory?.cost || 0);

      return transfersApi.create({
        fromBranchId: HN_BRANCH_ID,
        toBranchId: SG_BRANCH_ID,
        status: 1,
        transferDetails: [
          {
            productId: item.id,
            productCode: item.sku,
            sendQuantity: qty,
            price,
          },
        ],
      });
    },
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success(`Đã tạo phiếu ${transfer.code} thành công`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Không thể tạo phiếu chuyển hàng");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      transferId,
      qty,
    }: {
      transferId: number;
      qty: number;
    }) => {
      const existing = await transfersApi.getById(transferId);
      const existingDetail = existing.details.find(
        (d) => d.productId === item.id
      );

      let mergedDetails;
      if (existingDetail) {
        mergedDetails = existing.details.map((d) =>
          d.productId === item.id
            ? {
                productCode: d.productCode,
                productId: d.productId,
                sendQuantity: Number(d.sendQuantity) + qty,
                price: Number(d.sendPrice),
              }
            : {
                productCode: d.productCode,
                productId: d.productId,
                sendQuantity: Number(d.sendQuantity),
                price: Number(d.sendPrice),
              }
        );
      } else {
        const product = await productsApi.getProduct(item.id);
        const hnInventory = product.inventories?.find(
          (inv: any) => inv.branchId === HN_BRANCH_ID
        );
        const price = Number(hnInventory?.cost || 0);

        mergedDetails = [
          ...existing.details.map((d) => ({
            productCode: d.productCode,
            productId: d.productId,
            sendQuantity: Number(d.sendQuantity),
            price: Number(d.sendPrice),
          })),
          {
            productId: item.id,
            productCode: item.sku,
            sendQuantity: qty,
            price,
          },
        ];
      }

      return transfersApi.update(transferId, {
        fromBranchId: existing.fromBranchId,
        toBranchId: existing.toBranchId,
        transferDetails: mergedDetails,
      });
    },
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success(`Đã thêm vào phiếu ${transfer.code} thành công`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Không thể cập nhật phiếu chuyển hàng");
    },
  });

  const parsedQty = parseViNumber(quantity);
  const isValidQty = Number.isFinite(parsedQty) && parsedQty > 0 && Number.isInteger(parsedQty);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleQuantityChange = useCallback((val: string) => {
    // Chỉ cho phép chữ số và tối đa 1 dấu phẩy (thập phân). Không cho gõ dấu chấm.
    let cleaned = val.replace(/[^0-9,]/g, "");
    const firstComma = cleaned.indexOf(",");
    if (firstComma >= 0) {
      cleaned = cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
      const afterComma = cleaned.slice(firstComma + 1);
      if (afterComma.length > 1) {
        cleaned = cleaned.slice(0, firstComma + 2);
      }
    }
    setQuantity(cleaned);
    if (hasCarton) {
      const num = parseViNumber(cleaned);
      if (!isNaN(num) && num >= 0) {
        setCartonQuantity(formatViDecimal(num / packSize, 1));
      } else {
        setCartonQuantity("");
      }
    }
  }, [hasCarton, packSize]);

  const handleQuantityBlur = useCallback(() => {
    const num = parseViNumber(quantity);
    if (!isNaN(num) && num > 0) {
      setQuantity(formatViDecimal(num, 1));
    }
  }, [quantity]);

  const handleCartonChange = useCallback((val: string) => {
    // Cho phép chữ số và tối đa 1 dấu phẩy (thập phân). Không cho gõ dấu chấm.
    let cleaned = val.replace(/[^0-9,]/g, "");
    const firstComma = cleaned.indexOf(",");
    if (firstComma >= 0) {
      cleaned = cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
      const afterComma = cleaned.slice(firstComma + 1);
      if (afterComma.length > 1) {
        cleaned = cleaned.slice(0, firstComma + 2);
      }
    }
    setCartonQuantity(cleaned);
    const num = parseViNumber(cleaned);
    if (!isNaN(num) && num >= 0) {
      const unitQty = num * packSize;
      setQuantity(formatViDecimal(unitQty, 1));
    } else {
      setQuantity("");
    }
  }, [packSize]);

  const handleCartonBlur = useCallback(() => {
    const num = parseViNumber(cartonQuantity);
    if (!isNaN(num) && num > 0) {
      setCartonQuantity(formatViDecimal(num, 1));
      const unitQty = num * packSize;
      setQuantity(formatViDecimal(unitQty, 1));
    }
  }, [cartonQuantity, packSize]);

  const handleSubmit = () => {
    if (!isValidQty) return;
    if (selectedId === "new") {
      createMutation.mutate(parsedQty);
    } else {
      updateMutation.mutate({ transferId: selectedId, qty: parsedQty });
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isSubmitting ? onClose : undefined}
      />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">
            Thêm vào danh sách chuyển kho
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Product info */}
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                {item.sku}
              </span>
              <span className="text-xs text-gray-500">{item.unit}</span>
            </div>
            <div className="text-sm font-medium text-gray-900 leading-snug truncate">
              {item.name}
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Số lượng chuyển
            </label>
            {hasCarton ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    onBlur={handleQuantityBlur}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-12 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder={`Số ${item.unit}...`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    {item.unit}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cartonQuantity}
                    onChange={(e) => handleCartonChange(e.target.value)}
                    onBlur={handleCartonBlur}
                    disabled={isSubmitting}
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-12 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="Số thùng..."
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    Thùng
                  </span>
                </div>
              </div>
            ) : (
              <input
                type="text"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onBlur={handleQuantityBlur}
                disabled={isSubmitting}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Nhập số lượng..."
              />
            )}
            {!isValidQty && quantity.trim() !== "" && (
              <p className="text-xs text-red-500 mt-1">
                Số lượng đơn vị gốc phải là số nguyên lớn hơn 0
              </p>
            )}
          </div>

          {/* Transfer selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Chọn phiếu đích
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {/* Option: Create new */}
              <button
                type="button"
                onClick={() => setSelectedId("new")}
                disabled={isSubmitting}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                  selectedId === "new"
                    ? "border-brand bg-brand-soft ring-1 ring-brand"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                } disabled:opacity-50`}>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedId === "new"
                      ? "border-brand"
                      : "border-gray-300"
                  }`}>
                  {selectedId === "new" && (
                    <div className="w-2 h-2 rounded-full bg-brand" />
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Plus className="w-4 h-4 text-brand flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">
                    Tạo phiếu chuyển mới
                  </span>
                </div>
              </button>

              {/* Options: Existing draft transfers */}
              {isLoadingCandidates ? (
                <div className="flex items-center justify-center py-3 text-gray-400 text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải danh sách phiếu...
                </div>
              ) : candidates.length === 0 ? (
                <div className="py-3 text-center text-xs text-gray-400">
                  Chưa có phiếu tạm nào (HN → SG)
                </div>
              ) : (
                candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedId(candidate.id)}
                    disabled={isSubmitting}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                      selectedId === candidate.id
                        ? "border-brand bg-brand-soft ring-1 ring-brand"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    } disabled:opacity-50`}>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedId === candidate.id
                          ? "border-brand"
                          : "border-gray-300"
                      }`}>
                      {selectedId === candidate.id && (
                        <div className="w-2 h-2 rounded-full bg-brand" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSubmitting) setPreviewTransferId(candidate.id);
                          }}
                          className="text-sm font-medium text-brand hover:underline cursor-pointer truncate">
                          {candidate.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                        <span>{formatDate(candidate.createdAt)}</span>
                        <span>·</span>
                        <span>{candidate.itemCount} mặt hàng</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition disabled:opacity-50">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValidQty || isSubmitting}
            className="px-5 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận thêm"
            )}
          </button>
        </div>
      </div>

      {/* Transfer Preview Popup */}
      {previewTransferId !== null && (
        <TransferPreviewPopup
          transferId={previewTransferId}
          onClose={() => setPreviewTransferId(null)}
        />
      )}
    </div>
  );
}
