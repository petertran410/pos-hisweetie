import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inventoryPromoChecksApi,
  InventoryPromoCheckQueryParams,
  CreateInventoryPromoCheckDto,
} from "@/lib/api/inventory-promo-checks";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useInventoryPromoChecks(
  params?: InventoryPromoCheckQueryParams
) {
  return useQuery({
    queryKey: ["inventory-promo-checks", params],
    queryFn: () => inventoryPromoChecksApi.getAll(params),
  });
}

export function useInventoryPromoCheck(id: number) {
  return useQuery({
    queryKey: ["inventory-promo-check", id],
    queryFn: () => inventoryPromoChecksApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateInventoryPromoCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInventoryPromoCheckDto) =>
      inventoryPromoChecksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-promo-checks"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-stats"] });
      toast.success("Tạo phiếu kiểm hàng khuyến mãi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu kiểm thất bại");
    },
  });
}

export function useCancelInventoryPromoCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => inventoryPromoChecksApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-promo-checks"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-promo-check"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-stats"] });
      toast.success("Hủy phiếu kiểm thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu kiểm thất bại");
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

type InventoryPromoCheckExportFilters = Partial<
  Omit<InventoryPromoCheckQueryParams, "page" | "limit">
>;

function buildExportUrl(
  path: string,
  filters: InventoryPromoCheckExportFilters
): URL {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.append(k, String(v));
  });
  return url;
}

export function useExportInventoryPromoChecks() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: InventoryPromoCheckExportFilters) => {
    setIsExporting(true);
    try {
      const url = buildExportUrl("/inventory-promo-checks/export", filters);
      await downloadExcelFromUrl(url, `KiemHangKhuyenMai_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  const exportDetailToFile = async (
    filters: InventoryPromoCheckExportFilters
  ) => {
    setIsExporting(true);
    try {
      const url = buildExportUrl(
        "/inventory-promo-checks/export-detail",
        filters
      );
      await downloadExcelFromUrl(
        url,
        `KiemHangKhuyenMai_ChiTiet_${Date.now()}.xlsx`
      );
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, exportDetailToFile, isExporting };
}
