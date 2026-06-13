import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi, supplierGroupsApi } from "@/lib/api/suppliers";
import { Supplier, SupplierFilters } from "@/lib/types/supplier";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: ["suppliers", filters],
    queryFn: () => suppliersApi.getSuppliers(filters),
  });
}

export function useSupplier(id?: number) {
  return useQuery({
    queryKey: ["suppliers", id],
    queryFn: () => suppliersApi.getSupplier(id!),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      return await suppliersApi.createSupplier(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Tạo nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Supplier>;
    }) => {
      return await suppliersApi.updateSupplier(id, data);
    },
    onSuccess: (updatedSupplier, variables) => {
      queryClient.setQueryData(["suppliers", variables.id], updatedSupplier);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Cập nhật nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await suppliersApi.deleteSupplier(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Xóa nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useSupplierGroups() {
  return useQuery({
    queryKey: ["supplier-groups"],
    queryFn: () => supplierGroupsApi.getSupplierGroups(),
  });
}

export function useCreateSupplierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await supplierGroupsApi.createSupplierGroup(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
      toast.success("Tạo nhóm nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useUpdateSupplierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; description?: string };
    }) => {
      return await supplierGroupsApi.updateSupplierGroup(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
      toast.success("Cập nhật nhóm nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useDeleteSupplierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await supplierGroupsApi.deleteSupplierGroup(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-groups"] });
      toast.success("Xóa nhóm nhà cung cấp thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useSupplierDebtTimeline(supplierId: number) {
  return useQuery({
    queryKey: ["supplier-debt-timeline", supplierId],
    queryFn: () => suppliersApi.getDebtTimeline(supplierId),
    enabled: !!supplierId,
  });
}

export function useImportSupplierBalanceAdjustments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { rows: any[] }) =>
      suppliersApi.importBalanceAdjustments(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-debt-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Import thất bại");
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

export function useExportSupplierDebtTimeline() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (supplierId: number) => {
    setIsExporting(true);
    try {
      const url = new URL(
        `${API_URL}/suppliers/${supplierId}/export-debt-timeline`
      );
      await downloadExcelFromUrl(url, `LichSuThanhToan_NCC${supplierId}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}

export function useExportSupplierDebt() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (
    supplierId: number,
    opts: {
      fromDate?: string;
      toDate?: string;
      includeDetails?: boolean;
      showUnit?: boolean;
      showQty?: boolean;
      showPrice?: boolean;
      showDiscount?: boolean;
      showTotal?: boolean;
      showNote?: boolean;
    } = {}
  ) => {
    setIsExporting(true);
    try {
      const selectedBranch = useBranchStore.getState().selectedBranch;
      const url = new URL(`${API_URL}/suppliers/${supplierId}/export-debt`);
      if (selectedBranch?.id) {
        url.searchParams.set("branchId", String(selectedBranch.id));
      }
      Object.entries(opts).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
      await downloadExcelFromUrl(url, `CongNoChiTiet_NCC${supplierId}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}

/**
 * Xuất toàn bộ danh sách nhà cung cấp (theo bộ lọc hiện tại) ra file Excel.
 * Đối xứng với useExportCustomers ở useCustomers.ts.
 */
export function useExportSuppliers() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: SupplierFilters) => {
    setIsExporting(true);
    try {
      const { pageSize: _ps, currentItem: _ci, ...exportFilters } = filters;

      const url = new URL(`${API_URL}/suppliers/export`);
      Object.entries(exportFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.append(k, String(v));
        }
      });

      await downloadExcelFromUrl(url, `DanhSachNhaCungCap_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}
