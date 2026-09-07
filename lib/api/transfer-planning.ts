/**
 * Client API & React Query Hooks — Module Dự kiến chuyển kho (Hà Nội → Sài Gòn)
 *
 * Toàn bộ số liệu do backend `/transfers/planning-summary` tính. KHÔNG có
 * fallback dữ liệu tĩnh: nếu backend lỗi thì lỗi được đẩy lên react-query để
 * UI hiển thị trạng thái lỗi, thay vì âm thầm render số liệu sai.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/config/api";
import type {
  TransferPlanningFilters,
  TransferPlanningResponse,
  TempTransferDraftResponse,
} from "@/lib/types/transfer-planning";

const pendingTempSaves = new Map<number, Promise<unknown>>();

async function waitForPendingTempSaves() {
  while (pendingTempSaves.size > 0) {
    await Promise.all(pendingTempSaves.values());
  }
}

export const transferPlanningApi = {
  getPlanning: (
    filters: TransferPlanningFilters,
  ): Promise<TransferPlanningResponse> =>
    apiClient.get<TransferPlanningResponse>("/transfers/planning-summary", {
      search: filters.search || undefined,
      parentNames: filters.parentNames?.length
        ? filters.parentNames
        : undefined,
      middleNames: filters.middleNames?.length
        ? filters.middleNames
        : undefined,
      childNames: filters.childNames?.length ? filters.childNames : undefined,
      cargoType: filters.cargoType || undefined,
      tradeMarkIds: filters.tradeMarkIds?.length
        ? filters.tradeMarkIds
        : undefined,
      excludeTradeMarkIds: filters.excludeTradeMarkIds?.length
        ? filters.excludeTradeMarkIds
        : undefined,
      alertFilter:
        filters.alertFilter !== "ALL" ? filters.alertFilter : undefined,
      page: filters.page || 1,
      limit: filters.limit || 25,
      sortBy: filters.sortBy || "suggestedQuantity",
      sortDirection: filters.sortDirection || "desc",
    }),
  saveTempQuantity: (productId: number, quantity: number) => {
    const request = apiClient.put<{ productId: number; quantity: number }>(
      "/transfers/temp-quantity",
      { productId, quantity },
    );
    pendingTempSaves.set(productId, request);
    const clearPending = () => {
      if (pendingTempSaves.get(productId) === request) {
        pendingTempSaves.delete(productId);
      }
    };
    void request.then(clearPending, clearPending);
    return request;
  },
  getTempQuantities: async () => {
    await waitForPendingTempSaves();
    return apiClient.get<TempTransferDraftResponse>(
      "/transfers/temp-quantities",
    );
  },
  resetTempQuantities: async () => {
    await waitForPendingTempSaves();
    return apiClient.delete<{ resetCount: number }>(
      "/transfers/temp-quantities",
    );
  },
  quickCreate: async (data: { productIds: number[]; transferId?: number }) => {
    await waitForPendingTempSaves();
    return apiClient.post<{
      transfer: { id: number; code: string };
      createdNew: boolean;
      itemCount: number;
    }>("/transfers/quick-create", data);
  },
};

export function useTransferPlanning(filters: TransferPlanningFilters) {
  return useQuery({
    queryKey: ["transfer-planning", filters],
    queryFn: () => transferPlanningApi.getPlanning(filters),
    staleTime: 30_000,
  });
}

export function useTempTransferDrafts(enabled = true) {
  return useQuery({
    queryKey: ["transfer-temp-quantities"],
    queryFn: transferPlanningApi.getTempQuantities,
    enabled,
    staleTime: 15_000,
  });
}
