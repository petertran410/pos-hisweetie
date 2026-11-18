import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { vpsgCashApi } from "../api/vpsg-cash";

/** Tài khoản quỹ tiền mặt VPSG và quyền của user (không có quyền: rỗng). */
export function useVpsgCashAccess() {
  return useQuery({
    queryKey: ["vpsg-cash-access"],
    queryFn: () => vpsgCashApi.access(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Dòng quỹ đã ghi cho các giao dịch tài khoản VPSG đang hiện. */
export function useVpsgCashRecords(ids: number[], enabled: boolean) {
  return useQuery({
    queryKey: ["vpsg-cash-records", ids],
    queryFn: () => vpsgCashApi.records(ids),
    enabled: enabled && ids.length > 0,
    placeholderData: (prev) => prev,
  });
}

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useRecordVpsgCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vpsgCashApi.record(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vpsg-cash-records"] });
      qc.invalidateQueries({ queryKey: ["internal-fund"] });
      toast.success("Đã ghi vào quỹ tiền mặt VPSG");
    },
    onError: (error: unknown) =>
      toast.error(errorText(error, "Ghi vào quỹ VPSG thất bại")),
  });
}

export function useCancelVpsgCash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; reason: string }) =>
      vpsgCashApi.cancel(vars.id, vars.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vpsg-cash-records"] });
      qc.invalidateQueries({ queryKey: ["internal-fund"] });
      toast.success("Đã hủy ghi quỹ VPSG");
    },
    onError: (error: unknown) =>
      toast.error(errorText(error, "Hủy ghi quỹ VPSG thất bại")),
  });
}
