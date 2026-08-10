/**
 * React Query hooks — Module Purchasing Planning
 *
 * Chỉ lo việc lấy dữ liệu và cache. KHÔNG chứa business logic.
 */
import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { purchasingPlanningApi } from "@/lib/api/purchasing-planning";
import type {
  CreatePurchasingConfigRequest,
  PurchasingConfigPatch,
  PurchasingConfigScope,
  RecommendationFilters,
} from "@/lib/types/purchasing-planning";

const KEY = "purchasing-planning";

/** Danh sách đề xuất đặt hàng */
export function useRecommendations(filters: RecommendationFilters = {}) {
  return useQuery({
    queryKey: [KEY, "recommendations", filters],
    queryFn: () => purchasingPlanningApi.getRecommendations(filters),
    // Giữ dữ liệu cũ khi đổi filter/trang → tránh nháy trắng bảng
    placeholderData: keepPreviousData,
    // Snapshot chỉ đổi 1 lần/ngày nên không cần refetch liên tục
    staleTime: 5 * 60 * 1000,
  });
}

/** Chi tiết 1 đề xuất — chỉ fetch khi panel mở */
export function useRecommendationDetail(itemId: number | null) {
  return useQuery({
    queryKey: [KEY, "detail", itemId],
    queryFn: () => purchasingPlanningApi.getRecommendationDetail(itemId!),
    enabled: itemId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchasingConfigs() {
  return useQuery({
    queryKey: [KEY, "configs"],
    queryFn: () => purchasingPlanningApi.getConfigs(),
  });
}

export function useResolvedPurchasingConfig(
  scope: PurchasingConfigScope,
  entityId?: number
) {
  return useQuery({
    queryKey: [KEY, "resolved", scope, entityId ?? null],
    queryFn: () => purchasingPlanningApi.getResolvedConfig(
      scope === "SKU"
        ? { skuId: entityId }
        : scope === "SUPPLIER"
          ? { supplierId: entityId }
          : scope === "CATEGORY"
            ? { categoryId: entityId }
            : {}
    ),
    enabled: scope === "GLOBAL" || entityId !== undefined,
  });
}

function useInvalidatePurchasingPlanning() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY, "configs"] });
    queryClient.invalidateQueries({ queryKey: [KEY, "resolved"] });
    queryClient.invalidateQueries({ queryKey: [KEY, "detail"] });
  };
}

export function useSavePurchasingConfig() {
  const invalidate = useInvalidatePurchasingPlanning();
  return useMutation({
    mutationFn: ({
      configId,
      data,
    }: {
      configId: string | null;
      data: CreatePurchasingConfigRequest | PurchasingConfigPatch;
    }) => purchasingPlanningApi.saveConfig(configId, data),
    onSuccess: invalidate,
  });
}

export function useDeletePurchasingConfig() {
  const invalidate = useInvalidatePurchasingPlanning();
  return useMutation({
    mutationFn: (configId: string) =>
      purchasingPlanningApi.deleteConfig(configId),
    onSuccess: invalidate,
  });
}
