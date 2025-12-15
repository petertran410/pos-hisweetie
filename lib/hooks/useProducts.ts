import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { toast } from "sonner";

export const useProducts = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  categoryIds?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.getProducts(params),
  });
};

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productsApi.getProduct(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Tạo sản phẩm thành công");
    },
    onError: () => {
      toast.error("Tạo sản phẩm thất bại");
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productsApi.updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(["product", updatedProduct.id], updatedProduct);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Cập nhật sản phẩm thành công");
    },
    onError: () => {
      toast.error("Cập nhật sản phẩm thất bại");
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Xóa sản phẩm thành công");
    },
    onError: () => {
      toast.error("Xóa sản phẩm thất bại");
    },
  });
};
