import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { promotionsApi } from "@/lib/api/promotions";
import {
  PromotionFilters,
  CreatePromotionPayload,
  EvaluateItem,
} from "@/lib/types/promotion";
import { useAuthStore } from "../store/auth";

export function usePromotions(filters?: PromotionFilters) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["promotions", filters],
    queryFn: () => promotionsApi.list(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function usePromotion(id?: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["promotion", id],
    queryFn: () => promotionsApi.detail(id!),
    enabled: hasHydrated && isAuthenticated && !!id,
  });
}

export function usePromotionLogs(id?: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ["promotion-logs", id],
    queryFn: () => promotionsApi.logs(id!),
    enabled: isAuthenticated && !!id,
  });
}

export function usePromotionUsage(id?: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ["promotion-usage", id],
    queryFn: () => promotionsApi.usage(id!),
    enabled: isAuthenticated && !!id,
  });
}

export function usePromotionStats(id?: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return useQuery({
    queryKey: ["promotion-stats", id],
    queryFn: () => promotionsApi.stats(id!),
    enabled: isAuthenticated && !!id,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePromotionPayload) => promotionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Tạo chương trình khuyến mãi thành công");
    },
    onError: (e: Error) => toast.error(e.message || "Có lỗi xảy ra"),
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreatePromotionPayload>;
    }) => promotionsApi.update(id, data),
    onSuccess: (_res, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotion", id] });
      toast.success("Cập nhật chương trình khuyến mãi thành công");
    },
    onError: (e: Error) => toast.error(e.message || "Có lỗi xảy ra"),
  });
}

export function useTogglePromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      promotionsApi.toggle(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Đã cập nhật trạng thái chương trình");
    },
    onError: (e: Error) => toast.error(e.message || "Có lỗi xảy ra"),
  });
}

export function useStopPromotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => promotionsApi.stop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Đã ngừng chương trình khuyến mãi");
    },
    onError: (e: Error) => toast.error(e.message || "Có lỗi xảy ra"),
  });
}

/** Đánh giá khuyến mãi cho giỏ hàng hiện tại (dùng ở màn POS, có debounce phía gọi). */
export function useEvaluatePromotions() {
  return useMutation({
    mutationFn: (payload: {
      branchId: number;
      customerId?: number;
      userId?: number;
      purchaseDate?: string;
      items: EvaluateItem[];
    }) => promotionsApi.evaluate(payload),
  });
}
