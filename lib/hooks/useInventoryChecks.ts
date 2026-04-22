import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inventoryChecksApi,
  InventoryCheckQueryParams,
  CreateInventoryCheckDto,
} from "@/lib/api/inventory-checks";
import { toast } from "sonner";

export function useInventoryChecks(params?: InventoryCheckQueryParams) {
  return useQuery({
    queryKey: ["inventory-checks", params],
    queryFn: () => inventoryChecksApi.getAll(params),
  });
}

export function useInventoryCheck(id: number) {
  return useQuery({
    queryKey: ["inventory-check", id],
    queryFn: () => inventoryChecksApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateInventoryCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInventoryCheckDto) =>
      inventoryChecksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checks"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Tạo phiếu kiểm hàng loại B thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu kiểm thất bại");
    },
  });
}

export function useCancelInventoryCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => inventoryChecksApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-checks"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-check"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Hủy phiếu kiểm thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu kiểm thất bại");
    },
  });
}
