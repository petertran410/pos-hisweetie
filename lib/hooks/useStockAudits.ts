import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stockAuditsApi } from "@/lib/api/stock-audits";
import { toast } from "sonner";
import {
  StockAuditQueryParams,
  CreateStockAuditDto,
  UpdateStockAuditDto,
} from "../types/stock-audit";

export function useStockAudits(params?: StockAuditQueryParams) {
  return useQuery({
    queryKey: ["stock-audits", params],
    queryFn: () => stockAuditsApi.getAll(params),
  });
}

export function useStockAudit(id: number) {
  return useQuery({
    queryKey: ["stock-audit", id],
    queryFn: () => stockAuditsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStockAuditDto) => stockAuditsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      toast.success("Tạo phiếu kiểm kho thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu kiểm kho thất bại");
    },
  });
}

export function useUpdateStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateStockAuditDto }) =>
      stockAuditsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      qc.invalidateQueries({ queryKey: ["stock-audit"] });
      toast.success("Cập nhật phiếu kiểm kho thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật thất bại");
    },
  });
}

export function useCompleteStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockAuditsApi.complete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      qc.invalidateQueries({ queryKey: ["stock-audit"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Hoàn thành phiếu kiểm kho — đã điều chỉnh tồn kho");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hoàn thành thất bại");
    },
  });
}

export function useCancelStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockAuditsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-audits"] });
      qc.invalidateQueries({ queryKey: ["stock-audit"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Hủy phiếu kiểm kho thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Hủy phiếu kiểm thất bại");
    },
  });
}
