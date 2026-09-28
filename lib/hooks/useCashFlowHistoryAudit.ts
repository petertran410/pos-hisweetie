import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cashFlowHistoryAuditApi,
  type CashFlowHistoryImportResult,
} from "@/lib/api/cashflow-history-audit";

export function useCashFlowHistoryAudit(pageToken?: string) {
  return useQuery({
    queryKey: ["cashflow-history-audit", pageToken],
    queryFn: () => cashFlowHistoryAuditApi.preview({ pageToken, pageSize: 50 }),
    staleTime: 30_000,
  });
}

export function useImportCashFlowHistory() {
  const queryClient = useQueryClient();

  return useMutation<
    CashFlowHistoryImportResult,
    unknown,
    { recordIds: string[]; confirm?: boolean }
  >({
    mutationFn: ({ recordIds, confirm = true }) =>
      cashFlowHistoryAuditApi.import(recordIds, confirm),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["cashflow-history-audit"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success(
        result.created.length > 0
          ? `Đã import ${result.created.length} dòng lịch sử vào sổ quỹ`
          : "Không có dòng lịch sử mới được import",
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Import lịch sử Lark thất bại",
      );
    },
  });
}
