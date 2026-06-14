import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { consignmentsApi } from "../api/consignments";
import type { ConsignmentFilters } from "../types/consignment";
import { toast } from "sonner";

export function useConsignments(params?: ConsignmentFilters) {
  return useQuery({
    queryKey: ["consignments", params],
    queryFn: () => consignmentsApi.getAll(params),
  });
}

export function useConsignmentsTotals(params?: ConsignmentFilters) {
  return useQuery({
    queryKey: ["consignments-totals", params],
    queryFn: () => consignmentsApi.getTotals(params),
  });
}

export function useConsignment(id: number) {
  return useQuery({
    queryKey: ["consignments", id],
    queryFn: () => consignmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateConsignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: consignmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      toast.success("Tạo phiếu ký gửi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu ký gửi thất bại");
    },
  });
}

export function useUpdateConsignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      consignmentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      queryClient.invalidateQueries({
        queryKey: ["consignments", variables.id],
      });
      toast.success("Cập nhật phiếu ký gửi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu ký gửi thất bại");
    },
  });
}

/** B2 — danh sách phiếu ký gửi đủ điều kiện xử lý kho (cho bao-don). */
export function useConsignmentsForPacking(params?: {
  branchId?: number;
  pageSize?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ["consignments-for-packing", params],
    queryFn: () => consignmentsApi.getForPacking(params),
  });
}

export function useCancelConsignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      consignmentsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Hủy phiếu ký gửi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy phiếu ký gửi");
    },
  });
}

/** B3 — xuất hóa đơn từ phiếu ký gửi. */
export function useCreateInvoiceFromConsignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ consignmentId, data }: { consignmentId: number; data: any }) =>
      consignmentsApi.createInvoiceFromConsignment(consignmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Xuất hóa đơn từ phiếu ký gửi thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xuất hóa đơn thất bại");
    },
  });
}

/** Tổng số lượng đang ký gửi tại khách cho 1 batch productIds (cột "Ký gửi"). */
export function useConsignmentSummary(productIds: number[], branchId?: number) {
  const sortedKey = [...productIds].sort((a, b) => a - b).join(",");
  return useQuery({
    queryKey: ["consignment-summary", sortedKey, branchId ?? null],
    queryFn: () => consignmentsApi.getConsignmentSummary(productIds, branchId),
    enabled: productIds.length > 0,
    staleTime: 30_000,
  });
}

/** Chi tiết phiếu ký gửi đang còn hàng tại khách cho 1 product (modal). */
export function useConsignmentByProduct(
  productId: number | null,
  branchId?: number
) {
  return useQuery({
    queryKey: ["consignment-by-product", productId, branchId ?? null],
    queryFn: () =>
      consignmentsApi.getConsignmentByProduct(productId as number, branchId),
    enabled: !!productId,
  });
}
