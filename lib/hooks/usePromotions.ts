import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { promotionsApi } from "@/lib/api/promotions";
import {
  PromotionFilters,
  CreatePromotionPayload,
  EvaluateItem,
} from "@/lib/types/promotion";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";
import { API_URL } from "../config/api";

async function downloadExcelFromUrl(url: URL, filename: string) {
  const token = useAuthStore.getState().token;
  const selectedBranch = useBranchStore.getState().selectedBranch;

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(selectedBranch?.id
        ? { "X-Branch-Id": String(selectedBranch.id) }
        : {}),
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Lỗi khi xuất dữ liệu");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename=([^;]+)/);
  const finalName = match ? match[1].trim() : filename;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

function buildPromotionExportUrl(
  path: string,
  filters: PromotionFilters
): URL {
  const { page: _p, pageSize: _ps, ...exportFilters } = filters;
  const url = new URL(`${API_URL}${path}`);
  Object.entries(exportFilters).forEach(([k, v]) => {
    if (k.startsWith("_")) return;
    if (v === undefined || v === null || v === "") return;
    url.searchParams.append(k, String(v));
  });
  return url;
}

/**
 * Xuất Excel chương trình khuyến mãi (theo bộ lọc hiện tại):
 *   - exportToFile: xuất TỔNG QUAN (mỗi CTKM 1 dòng)
 *   - exportDetailToFile: xuất CHI TIẾT (mỗi dòng reward 1 dòng)
 */
export function useExportPromotions() {
  const [isExportingOverview, setIsExportingOverview] = useState(false);
  const [isExportingDetail, setIsExportingDetail] = useState(false);

  const exportToFile = async (filters: PromotionFilters) => {
    setIsExportingOverview(true);
    try {
      const url = buildPromotionExportUrl("/promotions/export", filters);
      await downloadExcelFromUrl(url, `KhuyenMai_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExportingOverview(false);
    }
  };

  const exportDetailToFile = async (filters: PromotionFilters) => {
    setIsExportingDetail(true);
    try {
      const url = buildPromotionExportUrl("/promotions/export-detail", filters);
      await downloadExcelFromUrl(url, `KhuyenMai_ChiTiet_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExportingDetail(false);
    }
  };

  return {
    exportToFile,
    exportDetailToFile,
    isExportingOverview,
    isExportingDetail,
  };
}

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
