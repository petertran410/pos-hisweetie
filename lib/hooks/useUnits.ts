import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { unitsApi } from "../api/units";

export function useUnits(includeInactive = false) {
  return useQuery({
    queryKey: ["units", { includeInactive }],
    queryFn: () => unitsApi.getAll(includeInactive),
    staleTime: 5 * 60_000,
  });
}

/**
 * Đổi tên / gộp đơn vị cũng đổi Đơn vị tính của sản phẩm → làm mới cả danh
 * sách sản phẩm.
 */
function useUnitMutation<TVars, TData = unknown>(
  mutationFn: (vars: TVars) => Promise<TData>,
  successMessage?: string,
  options?: { silentError?: boolean },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error: Error) => {
      if (!options?.silentError) toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export const useCreateUnit = () =>
  useUnitMutation((name: string) => unitsApi.create(name), "Đã thêm đơn vị");

// Lỗi 409 (tên trùng → cần xác nhận gộp) do nơi gọi tự xử lý.
export const useUpdateUnit = () =>
  useUnitMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; isActive?: boolean; confirmMerge?: boolean };
    }) => unitsApi.update(id, data),
    "Đã cập nhật đơn vị",
    { silentError: true },
  );

export const useDeleteUnit = () =>
  useUnitMutation((id: number) => unitsApi.remove(id), "Đã xóa đơn vị");

export const useReorderUnits = () =>
  useUnitMutation((ids: number[]) => unitsApi.reorder(ids));
