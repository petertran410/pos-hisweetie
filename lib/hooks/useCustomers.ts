import { useState } from "react";
import * as XLSX from "xlsx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL, apiClient } from "@/lib/config/api";
import {
  Customer,
  CustomerFilters,
  CustomerGroup,
  CustomerSearchResult,
} from "@/lib/types/customer";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useCustomers(filters?: CustomerFilters) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: Customer[];
        total: number;
        pageSize: number;
      }>("/customers", filters);
      return response;
    },
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useCustomer(id: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const response = await apiClient.get<Customer>(`/customers/${id}`);
      return response;
    },
    enabled: !!id && hasHydrated && isAuthenticated,
  });
}

export function useCustomerGroups() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: CustomerGroup[];
        total: number;
      }>("/customer-groups");
      return response;
    },
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useCustomerDebtTimeline(
  customerId: number,
  includeChildren = false
) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers", customerId, "debt-timeline", includeChildren],
    queryFn: async () => {
      const params: any = {};
      if (includeChildren) params.includeChildren = "true";
      const response = await apiClient.get<{
        data: any[];
      }>(`/customers/${customerId}/debt-timeline`, params);
      return response;
    },
    enabled: !!customerId && hasHydrated && isAuthenticated,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Customer> & { addresses?: any[] }) => {
      return await apiClient.post<Customer>("/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      toast.success("Tạo khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Customer> & { addresses?: any[] };
    }) => {
      return await apiClient.put<Customer>(`/customers/${id}`, data);
    },
    onSuccess: (updatedCustomer, variables) => {
      queryClient.setQueryData(["customers", variables.id], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      toast.success("Cập nhật khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      toast.success("Xóa khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useSearchCustomers(search?: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers-search", search],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      const response = await apiClient.get<{
        data: CustomerSearchResult[];
      }>("/customers/search", params);
      return response;
    },
    enabled: hasHydrated && isAuthenticated,
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

export function useExportCustomerDebtTimeline() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (customerId: number, includeChildren = false) => {
    setIsExporting(true);
    try {
      const url = new URL(
        `${API_URL}/customers/${customerId}/export-debt-timeline`
      );
      if (includeChildren) url.searchParams.set("includeChildren", "true");
      await downloadExcelFromUrl(url, `LichSuThanhToan_KH${customerId}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}

export function useExportCustomerDebt() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (
    customerId: number,
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
      const url = new URL(`${API_URL}/customers/${customerId}/export-debt`);
      if (selectedBranch?.id) {
        url.searchParams.set("branchId", String(selectedBranch.id));
      }
      Object.entries(opts).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
      await downloadExcelFromUrl(url, `CongNoChiTiet_KH${customerId}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}

export function useExportCustomers() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: CustomerFilters) => {
    setIsExporting(true);
    try {
      const { pageSize: _ps, currentItem: _ci, ...exportFilters } = filters;

      const token = useAuthStore.getState().token;
      const selectedBranch = useBranchStore.getState().selectedBranch;

      const url = new URL(`${API_URL}/customers/export`);
      Object.entries(exportFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          url.searchParams.append(k, String(v));
        }
      });

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

      // Lấy filename từ header nếu có, fallback sang tên mặc định
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename=([^;]+)/);
      const filename = filenameMatch
        ? filenameMatch[1].trim()
        : `DanhSachKhachHang_${Date.now()}.xlsx`;

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
