import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api/categories";
import { toast } from "sonner";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getCategories,
  });
};

export const useRootCategories = () => {
  return useQuery({
    queryKey: ["categories", "roots"],
    queryFn: categoriesApi.getRootCategories,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoriesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Tạo nhóm hàng thành công");
    },
    onError: () => {
      toast.error("Tạo nhóm hàng thất bại");
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      categoriesApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Cập nhật nhóm hàng thành công");
    },
    onError: () => {
      toast.error("Cập nhật nhóm hàng thất bại");
    },
  });
};
