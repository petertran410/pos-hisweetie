import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  vehiclesApi,
  type VehicleInput,
  type VehicleUpdateInput,
} from "@/lib/api/vehicles";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useVehicles(
  params: { branchId?: number; includeInactive?: boolean } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: () => vehiclesApi.list(params),
    enabled,
  });
}

const invalidateVehicles = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  // Ngưỡng đ/km và tên xe ảnh hưởng tới cột kiểm tra của phiếu xăng.
  queryClient.invalidateQueries({ queryKey: ["vehicle-entries"] });
  queryClient.invalidateQueries({ queryKey: ["warehouse-expenses"] });
};

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehicleInput) => vehiclesApi.create(payload),
    onSuccess: () => {
      invalidateVehicles(queryClient);
      toast.success("Đã thêm xe");
    },
    onError: (error) => toast.error(errorMessage(error, "Thêm xe thất bại")),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: VehicleUpdateInput;
    }) => vehiclesApi.update(id, payload),
    onSuccess: () => {
      invalidateVehicles(queryClient);
      toast.success("Đã cập nhật xe");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Cập nhật xe thất bại")),
  });
}
