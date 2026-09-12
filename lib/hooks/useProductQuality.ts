"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  productQualityApi,
  type CreateProductQualityPayload,
  type AssignProductQualityPayload,
  type UpdateProductQualityTaskPayload,
} from "../api/product-quality";
import type { ProductQualityFilters } from "../types/product-quality";
import { API_URL } from "../config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useProductQualityTickets(filters?: ProductQualityFilters) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["product-quality-tickets", filters],
    queryFn: () => productQualityApi.getAll(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useProductQualitySummary(filters?: ProductQualityFilters) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["product-quality-summary", filters],
    queryFn: () => productQualityApi.getSummary(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useProductQualityTicket(id: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["product-quality-ticket", id],
    queryFn: () => productQualityApi.getById(id),
    enabled: !!id && hasHydrated && isAuthenticated,
  });
}

export function useCreateProductQualityTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductQualityPayload) =>
      productQualityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      toast.success("Tạo phiếu sự cố chất lượng thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu thất bại");
    },
  });
}

export function useUpdateProductQualityTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productQualityApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      queryClient.invalidateQueries({
        queryKey: ["product-quality-ticket", variables.id],
      });
      toast.success("Cập nhật phiếu thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu thất bại");
    },
  });
}

export function useAssignProductQualityTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AssignProductQualityPayload }) =>
      productQualityApi.assign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      queryClient.invalidateQueries({
        queryKey: ["product-quality-ticket", variables.id],
      });
      toast.success("Cập nhật hướng xử lý & phân công thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Phân công thất bại");
    },
  });
}

export function useMoveToRemediatingProductQualityTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productQualityApi.moveToRemediating(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-ticket", id] });
      toast.success("Đã chuyển phiếu sang Đang khắc phục");
    },
    onError: (error: any) => {
      toast.error(error.message || "Chuyển sang Đang khắc phục thất bại");
    },
  });
}

export function useUpdateProductQualityTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      department,
      data,
    }: {
      id: number;
      department: string;
      data: UpdateProductQualityTaskPayload;
    }) => productQualityApi.updateTask(id, department, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      queryClient.invalidateQueries({
        queryKey: ["product-quality-ticket", variables.id],
      });
      toast.success(`Cập nhật bộ phận ${variables.department} thành công`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật nhiệm vụ thất bại");
    },
  });
}

export function useCloseProductQualityTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      productQualityApi.close(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      queryClient.invalidateQueries({
        queryKey: ["product-quality-ticket", variables.id],
      });
      toast.success("Đã hủy phiếu thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu thất bại");
    },
  });
}

export function useProductQualityRoutingConfigs() {
  return useQuery({
    queryKey: ["product-quality-routing-configs"],
    queryFn: () => productQualityApi.getRoutingConfigs(),
  });
}

export function useUpsertProductQualityRoutingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productQualityApi.upsertRoutingConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-quality-routing-configs"],
      });
      toast.success("Cập nhật cấu hình routing thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Lỗi cập nhật cấu hình routing");
    },
  });
}

export function useProductQualityDepartmentMembers(branchId?: number) {
  return useQuery({
    queryKey: ["product-quality-dept-members", branchId],
    queryFn: () => productQualityApi.getDepartmentMembers(branchId),
  });
}

export function useUpsertProductQualityDepartmentMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productQualityApi.upsertDepartmentMember,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-quality-dept-members"],
      });
      toast.success("Cập nhật thành viên bộ phận thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Lỗi cập nhật thành viên");
    },
  });
}

export function useDeleteProductQualityDepartmentMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => productQualityApi.deleteDepartmentMember(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["product-quality-dept-members"],
      });
      toast.success("Đã xóa thành viên khỏi bộ phận");
    },
  });
}

export function useImportLarkQualityTickets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productQualityApi.importFromLark,
    onSuccess: (res) => {
      if (!res.dryRun) {
        queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
        queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
        toast.success(`Đã import thành công ${res.importedCount} phiếu từ LarkBase`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Import từ LarkBase thất bại");
    },
  });
}

export function useProductQualityImportPreview() {
  return useMutation({
    mutationFn: productQualityApi.importPreview,
    onError: (error: any) => {
      toast.error(error.message || "Kiểm tra file import thất bại");
    },
  });
}

export function useProductQualityImportCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productQualityApi.importCommit,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["product-quality-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["product-quality-summary"] });
      toast.success(
        `Import hoàn tất: ${data.importedCount} tạo mới, ${data.updatedCount} cập nhật`
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Import dữ liệu thất bại");
    },
  });
}

async function downloadExcelFromUrl(url: URL, filename: string) {
  const token = useAuthStore.getState().token;
  const selectedBranch = useBranchStore.getState().selectedBranch;

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
  const finalName = match ? match[1].trim() : filename;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

function buildQualityExportUrl(
  path: string,
  filters: ProductQualityFilters
): URL {
  const { page: _p, limit: _l, ...exportFilters } = filters;
  const url = new URL(`${API_URL}${path}`);
  Object.entries(exportFilters).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      if (v.length > 0) url.searchParams.append(k, v.join(","));
    } else {
      url.searchParams.append(k, String(v));
    }
  });
  return url;
}

export function useExportProductQualityTickets() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: ProductQualityFilters) => {
    setIsExporting(true);
    try {
      const url = buildQualityExportUrl(
        "/product-quality-tickets/export",
        filters
      );
      await downloadExcelFromUrl(
        url,
        `ChatLuongSanPham_${Date.now()}.xlsx`
      );
      toast.success("Xuất file tổng quan thành công");
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (filters: ProductQualityFilters) => {
    setIsExporting(true);
    try {
      const url = buildQualityExportUrl(
        "/product-quality-tickets/export-detail",
        filters
      );
      await downloadExcelFromUrl(
        url,
        `ChatLuongSanPham_ChiTiet_${Date.now()}.xlsx`
      );
      toast.success("Xuất file chi tiết thành công");
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}

/**
 * Tra cứu nhà máy đang hoạt động cho bước nhập hướng xử lý.
 * Chỉ fetch khi từ khóa đủ dài hoặc khi bắt buộc (prefetch).
 */
export function useProductQualityFactorySearch(
  search?: string,
  options?: { enabled?: boolean }
) {
  const keyword = (search || "").trim();
  return useQuery({
    queryKey: ["product-quality-factories", keyword],
    queryFn: () =>
      productQualityApi.searchFactories({ search: keyword || undefined, limit: 20 }),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Tra cứu hóa đơn cho bước tạo mới / nhập hướng xử lý.
 */
export function useProductQualityInvoiceSearch(params: {
  search?: string;
  customerId?: number;
  enabled?: boolean;
}) {
  const keyword = (params.search || "").trim();
  return useQuery({
    queryKey: [
      "product-quality-invoices",
      keyword,
      params.customerId ?? null,
    ],
    queryFn: () =>
      productQualityApi.searchRelatedInvoices({
        search: keyword || undefined,
        customerId: params.customerId,
        limit: 15,
      }),
    staleTime: 30_000,
    enabled: params.enabled ?? true,
  });
}
