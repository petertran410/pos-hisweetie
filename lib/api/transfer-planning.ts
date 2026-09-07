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
} from "@/lib/types/transfer-planning";

export const transferPlanningApi = {
  getPlanning: (
    filters: TransferPlanningFilters
  ): Promise<TransferPlanningResponse> =>
    apiClient.get<TransferPlanningResponse>("/transfers/planning-summary", {
      search: filters.search || undefined,
      parentNames: filters.parentNames?.length ? filters.parentNames : undefined,
      middleNames: filters.middleNames?.length ? filters.middleNames : undefined,
      childNames: filters.childNames?.length ? filters.childNames : undefined,
      cargoType: filters.cargoType || undefined,
      tradeMarkIds: filters.tradeMarkIds?.length ? filters.tradeMarkIds : undefined,
      excludeTradeMarkIds: filters.excludeTradeMarkIds?.length
        ? filters.excludeTradeMarkIds
        : undefined,
      alertFilter: filters.alertFilter !== "ALL" ? filters.alertFilter : undefined,
      page: filters.page || 1,
      limit: filters.limit || 25,
      sortBy: filters.sortBy || "suggestedQuantity",
      sortDirection: filters.sortDirection || "desc",
    }),
};

export function useTransferPlanning(filters: TransferPlanningFilters) {
  return useQuery({
    queryKey: ["transfer-planning", filters],
    queryFn: () => transferPlanningApi.getPlanning(filters),
    staleTime: 30_000,
  });
}
