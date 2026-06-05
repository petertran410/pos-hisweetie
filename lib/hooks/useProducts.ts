import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductQueryParams, productsApi } from "@/lib/api/products";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";

export function useProducts(params?: ProductQueryParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsApi.getAll(params),
  });
}

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

export function useUpdateProductRetailPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, basePrice }: { id: number; basePrice: number }) =>
      productsApi.updateRetailPrice(id, basePrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-with-prices"] });
      toast.success("Cập nhật giá bán thành công");
    },
    onError: () => {
      toast.error("Cập nhật giá bán thất bại");
    },
  });
}

export function useProductInventoryLogs(
  productId: number,
  branchId?: number,
  page = 1,
  limit = 5
) {
  return useQuery({
    queryKey: ["product-inventory-logs", productId, branchId, page, limit],
    queryFn: () =>
      productsApi.getInventoryLogs(productId, branchId, page, limit),
    enabled: !!productId,
  });
}

export function useUpdateProductCondition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      branchId,
      data,
    }: {
      productId: number;
      branchId: number;
      data: { damagedQuantity?: number; nearExpiryQuantity?: number };
    }) => productsApi.updateProductCondition(productId, branchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Cập nhật tình trạng hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật tình trạng hàng thất bại");
    },
  });
}

/**
 * Xuất danh sách sản phẩm ra Excel.
 * - `filters`: bộ lọc hiện tại của bảng (search, category, status, stockStatus...).
 * - `columns`: danh sách key cột cần xuất (CSV gửi lên backend).
 * Xuất theo chi nhánh đang chọn (gửi qua header X-Branch-Id + query branchId).
 */
export function useExportProducts() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (
    filters: Record<string, any>,
    columns: string[]
  ) => {
    setIsExporting(true);
    try {
      const token = useAuthStore.getState().token;
      const selectedBranch = useBranchStore.getState().selectedBranch;

      const url = new URL(`${API_URL}/products/export`);

      // Bỏ các param phân trang / meta chỉ dùng ở client.
      const { page: _p, limit: _l, ...exportFilters } = filters || {};
      Object.entries(exportFilters).forEach(([k, v]) => {
        if (k.startsWith("_")) return;
        if (v === undefined || v === null || v === "") return;
        if (Array.isArray(v)) {
          v.forEach((item) => url.searchParams.append(k, String(item)));
        } else {
          url.searchParams.append(k, String(v));
        }
      });

      if (selectedBranch?.id) {
        url.searchParams.set("branchId", String(selectedBranch.id));
      }
      url.searchParams.set("columns", columns.join(","));

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(selectedBranch?.id
            ? { "X-Branch-Id": String(selectedBranch.id) }
            : {}),
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Lỗi khi xuất dữ liệu");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename=([^;]+)/);
      const filename = match
        ? match[1].trim()
        : `DanhSachSanPham_${Date.now()}.xlsx`;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}
