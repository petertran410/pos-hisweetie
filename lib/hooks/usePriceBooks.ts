import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { priceBooksApi } from "@/lib/api/price-books";
import { toast } from "react-hot-toast";

export function usePriceBooks(params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  branchId?: number;
}) {
  return useQuery({
    queryKey: ["price-books", params],
    queryFn: () => priceBooksApi.getPriceBooks(params),
  });
}

export function usePriceBook(id: number | null) {
  return useQuery({
    queryKey: ["price-book", id],
    queryFn: () => priceBooksApi.getPriceBook(id!),
    enabled: !!id,
  });
}

export function useCreatePriceBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: priceBooksApi.createPriceBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-books"] });
      toast.success("Tạo bảng giá thành công");
    },
    onError: () => {
      toast.error("Tạo bảng giá thất bại");
    },
  });
}

export function useUpdatePriceBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      priceBooksApi.updatePriceBook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-books"] });
      queryClient.invalidateQueries({ queryKey: ["price-book"] });
      toast.success("Cập nhật bảng giá thành công");
    },
    onError: () => {
      toast.error("Cập nhật bảng giá thất bại");
    },
  });
}

export function useDeletePriceBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: priceBooksApi.deletePriceBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-books"] });
      toast.success("Xóa bảng giá thành công");
    },
    onError: () => {
      toast.error("Xóa bảng giá thất bại");
    },
  });
}

export function useApplicablePriceBooks(params: {
  branchId?: number;
  customerId?: number;
  userId?: number;
  date?: string;
}) {
  return useQuery({
    queryKey: ["applicable-price-books", params],
    queryFn: () => priceBooksApi.getApplicablePriceBooks(params),
    enabled: !!(params.branchId || params.customerId || params.userId),
  });
}

export function useProductPrice(params: {
  productId: number;
  branchId?: number;
  customerId?: number;
  userId?: number;
}) {
  return useQuery({
    queryKey: ["product-price", params],
    queryFn: () => priceBooksApi.getPriceForProduct(params),
    enabled: !!params.productId,
  });
}

export function usePriceBookProducts(
  priceBookId: number | null,
  search?: string
) {
  return useQuery({
    queryKey: ["price-book-products", priceBookId, search],
    queryFn: () => priceBooksApi.getProductsByPriceBook(priceBookId!, search),
    enabled: !!priceBookId,
  });
}

export function useAddProductsToPriceBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      priceBookId,
      products,
    }: {
      priceBookId: number;
      products: { productId: number; price: number }[];
    }) => priceBooksApi.addProductsToPriceBook(priceBookId, products),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-book-products"] });
      queryClient.invalidateQueries({ queryKey: ["price-book"] });
      toast.success("Thêm sản phẩm thành công");
    },
    onError: () => {
      toast.error("Thêm sản phẩm thất bại");
    },
  });
}

export function useRemoveProductsFromPriceBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      priceBookId,
      productIds,
    }: {
      priceBookId: number;
      productIds: number[];
    }) => priceBooksApi.removeProductsFromPriceBook(priceBookId, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-book-products"] });
      queryClient.invalidateQueries({ queryKey: ["price-book"] });
      toast.success("Xóa sản phẩm thành công");
    },
    onError: () => {
      toast.error("Xóa sản phẩm thất bại");
    },
  });
}

export function useUpdateProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      priceBookId,
      productId,
      price,
    }: {
      priceBookId: number;
      productId: number;
      price: number;
    }) => priceBooksApi.updateProductPrice(priceBookId, productId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-book-products"] });
      queryClient.invalidateQueries({ queryKey: ["price-book"] });
      toast.success("Cập nhật giá thành công");
    },
    onError: () => {
      toast.error("Cập nhật giá thất bại");
    },
  });
}

export function useProductsWithPrices(params: {
  priceBookIds: number[];
  search?: string;
  categoryId?: number;
}) {
  return useQuery({
    queryKey: ["products-with-prices", params],
    queryFn: () => priceBooksApi.getProductsWithPrices(params),
    enabled: params.priceBookIds.length > 0,
  });
}
