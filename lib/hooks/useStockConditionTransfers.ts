import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  stockConditionTransfersApi,
  StockConditionTransferQueryParams,
  CreateStockConditionTransferDto,
} from "@/lib/api/stock-condition-transfers";
import { toast } from "sonner";
import { useState } from "react";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";

export function useStockConditionTransfers(
  params?: StockConditionTransferQueryParams
) {
  return useQuery({
    queryKey: ["stock-condition-transfers", params],
    queryFn: () => stockConditionTransfersApi.getAll(params),
  });
}

export function useStockConditionTransfer(id: number) {
  return useQuery({
    queryKey: ["stock-condition-transfer", id],
    queryFn: () => stockConditionTransfersApi.getOne(id),
    enabled: !!id,
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["stock-condition-transfers"] });
  queryClient.invalidateQueries({ queryKey: ["stock-condition-transfer"] });
  queryClient.invalidateQueries({ queryKey: ["products"] });
  queryClient.invalidateQueries({ queryKey: ["product"] });
  queryClient.invalidateQueries({ queryKey: ["product-condition-logs"] });
  queryClient.invalidateQueries({ queryKey: ["product-condition-summary"] });
  queryClient.invalidateQueries({ queryKey: ["near-expiry-lots"] });
}

export function useCreateStockConditionTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStockConditionTransferDto) =>
      stockConditionTransfersApi.create(data),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success("Tạo phiếu chuyển loại tồn thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu thất bại");
    },
  });
}

export function useApproveStockConditionTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockConditionTransfersApi.approve(id),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success("Duyệt phiếu thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Duyệt phiếu thất bại");
    },
  });
}

export function useCancelStockConditionTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockConditionTransfersApi.cancel(id),
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success("Hủy phiếu thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu thất bại");
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

type ExportFilters = Partial<
  Omit<StockConditionTransferQueryParams, "page" | "limit">
>;

export function useExportStockConditionTransfers() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToFile = async (filters: ExportFilters) => {
    setIsExporting(true);
    try {
      const url = new URL(`${API_URL}/stock-condition-transfers/export`);
      Object.entries(filters).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        url.searchParams.append(k, String(v));
      });
      await downloadExcelFromUrl(url, `ChuyenLoaiTon_${Date.now()}.xlsx`);
      toast.success("Xuất file thành công");
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi xuất dữ liệu");
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToFile, isExporting };
}
