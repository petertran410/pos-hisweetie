import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { factoriesApi } from "../api/factories";
import { toast } from "sonner";

export function useFactories(includeInactive = false) {
  return useQuery({
    queryKey: ["factories", includeInactive],
    queryFn: () => factoriesApi.getAll(includeInactive),
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
    onError: (e: any) => toast.error(e.message || "Không thể thêm nhà máy"),
  });
}

export function useUpdateFactory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      factoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factories"] });
      toast.success("Đã cập nhật nhà máy");
    },
    onError: (e: any) => toast.error(e.message || "Không thể cập nhật nhà máy"),
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
    onError: (e: any) => toast.error(e.message || "Không thể xóa nhà máy"),
  });
}
