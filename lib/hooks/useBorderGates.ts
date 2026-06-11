import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { borderGatesApi } from "../api/border-gates";
import { toast } from "sonner";

export function useBorderGates(includeInactive = false) {
  return useQuery({
    queryKey: ["border-gates", includeInactive],
    queryFn: () => borderGatesApi.getAll(includeInactive),
    staleTime: 60_000,
  });
}

export function useCreateBorderGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: borderGatesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["border-gates"] });
      toast.success("Đã thêm cửa khẩu");
    },
    onError: (e: any) => toast.error(e.message || "Không thể thêm cửa khẩu"),
  });
}

export function useUpdateBorderGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      borderGatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["border-gates"] });
      toast.success("Đã cập nhật cửa khẩu");
    },
    onError: (e: any) => toast.error(e.message || "Không thể cập nhật cửa khẩu"),
  });
}

export function useDeleteBorderGate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => borderGatesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["border-gates"] });
      toast.success("Đã xóa cửa khẩu");
    },
    onError: (e: any) => toast.error(e.message || "Không thể xóa cửa khẩu"),
  });
}
