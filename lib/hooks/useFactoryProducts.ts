import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  factoryProductsApi,
  FactoryProductPayload,
  FactoryProductQueryParams,
  PriceHistorySeriesParams,
} from "../api/factory-products";

/**
 * Invalidate mọi query liên quan mapping nhà máy × sản phẩm.
 * Gọi thêm `factories` vì bảng nhà máy hiển thị số lượng mapping trong _count.
 */
function useInvalidateFactoryProducts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["factory-products"] });
    queryClient.invalidateQueries({ queryKey: ["factories"] });
  };
}

/**
 * List mapping theo nhà máy hoặc theo sản phẩm.
 * Truyền `factoryId` khi mở chi tiết nhà máy, `productId` khi xem 1 sản phẩm
 * được sản xuất ở những nhà máy nào.
 */
export function useFactoryProductMappings(
  params?: FactoryProductQueryParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["factory-products", params ?? {}],
    queryFn: () => factoryProductsApi.getAll(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
}

/**
 * Lịch sử thay đổi giá tham chiếu của 1 dòng mapping (mới nhất trước).
 * Chỉ fetch khi người dùng bấm xem lịch sử.
 */
export function useFactoryProductPriceHistory(id?: number) {
  return useQuery({
    queryKey: ["factory-products", "price-history", id],
    queryFn: () => factoryProductsApi.getPriceHistory(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useFactoryPriceSeries(params?: PriceHistorySeriesParams) {
  return useQuery({
    queryKey: ["factory-products", "price-history-series", params ?? null],
    queryFn: () => factoryProductsApi.getPriceHistorySeries(params!),
    enabled: !!params?.productId,
    staleTime: 30_000,
  });
}

/**
 * Giá tham chiếu theo productId — dùng ở form đặt hàng nhập để hiện chênh lệch
 * giữa đơn giá thực tế và giá tham chiếu đã thiết lập.
 *
 * Không gate quyền: endpoint trả giá nền, tầng render mới quyết định ẩn/hiện.
 */
export function useReferencePrices(
  productIds: number[],
  opts?: { supplierId?: number; factoryId?: number }
) {
  const ids = Array.from(
    new Set(productIds.filter((id) => Number.isFinite(id) && id > 0))
  ).sort((a, b) => a - b);

  const query = useQuery({
    queryKey: [
      "factory-products",
      "reference-prices",
      ids.join(","),
      opts?.supplierId ?? null,
      opts?.factoryId ?? null,
    ],
    queryFn: () => factoryProductsApi.getReferencePrices(ids, opts),
    enabled: ids.length > 0 && (!!opts?.supplierId || !!opts?.factoryId),
    staleTime: 30_000,
  });

  return { referenceByProduct: query.data ?? {}, isLoading: query.isLoading };
}

export function useCreateFactoryProduct() {
  const invalidate = useInvalidateFactoryProducts();
  return useMutation({
    mutationFn: (data: FactoryProductPayload) =>
      factoryProductsApi.create(data),
    onSuccess: () => {
      invalidate();
      toast.success("Đã gắn sản phẩm vào nhà máy");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Không thể gắn sản phẩm"),
  });
}

export function useUpdateFactoryProduct() {
  const invalidate = useInvalidateFactoryProducts();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<FactoryProductPayload>;
    }) => factoryProductsApi.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Đã cập nhật mapping nhà máy");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật mapping"),
  });
}

export function useDeleteFactoryProduct() {
  const invalidate = useInvalidateFactoryProducts();
  return useMutation({
    mutationFn: (id: number) => factoryProductsApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Đã bỏ gắn sản phẩm khỏi nhà máy");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Không thể bỏ gắn sản phẩm"),
  });
}
