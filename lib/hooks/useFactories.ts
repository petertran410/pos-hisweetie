import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { factoriesApi, FactoryPayload, FactoryQueryParams, Factory } from "../api/factories";
import { toast } from "sonner";

/**
 * Hook list nhà máy với filter (supplierId, country, search, includeInactive,
 * paginate, sort). Trả về response có data/total/page/limit.
 *
 * Nếu code cũ cần truyền boolean (includeInactive) thì dùng `useFactoriesLegacy`.
 */
export function useFactories(params?: FactoryQueryParams) {
  const query = useQuery({
    queryKey: ["factories", params ?? {}],
    queryFn: () => factoriesApi.getAll(params),
    staleTime: 60_000,
  });
  // Trả về object { data, total, page, limit } hoặc undefined nếu đang loading
  return query.data;
}

/**
 * Hook backward-compatible cho code cũ gọi `useFactories(includeInactive: boolean)`.
 * Trả về mảng Factory[] trực tiếp.
 */
export function useFactoriesLegacy(includeInactive = false): Factory[] | undefined {
  const query = useQuery({
    queryKey: ["factories", "legacy", { includeInactive }],
    queryFn: () => factoriesApi.getAll(includeInactive),
    staleTime: 60_000,
  });
  const data = query.data;
  if (Array.isArray(data)) return data;
  return data?.data;
}

/**
 * Hook lấy chi tiết 1 nhà máy (kèm supplier + count sản phẩm primary/backup).
 */
export function useFactory(id?: number) {
  return useQuery({
    queryKey: ["factories", "detail", id],
    queryFn: () => factoriesApi.getById(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/**
 * Hook lấy tất cả nhà máy (active) thuộc 1 NCC — dùng cho dropdown trong
 * OrderSupplierForm / ProductForm.
 */
export function useFactoriesBySupplier(supplierId?: number) {
  return useQuery({
    queryKey: ["factories", "by-supplier", supplierId],
    queryFn: () => factoriesApi.getBySupplier(supplierId!),
    enabled: !!supplierId,
    staleTime: 60_000,
  });
}

export function useCreateFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: factoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      toast.success("Đã thêm nhà máy");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Không thể thêm nhà máy"),
  });
}

export function useUpdateFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FactoryPayload> }) =>
      factoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      toast.success("Đã cập nhật nhà máy");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Không thể cập nhật nhà máy"),
  });
}

export function useDeleteFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => factoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      toast.success("Đã xóa nhà máy");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Không thể xóa nhà máy"),
  });
}