import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approvalRequestsApi,
  type ApprovalRequest,
  type ApprovalRequestQuery,
  type CreateApprovalRequestPayload,
} from "@/lib/api/approval-requests";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useApprovalRequest(id: number | null) {
  return useQuery({
    queryKey: ["approval-requests", id],
    queryFn: () => approvalRequestsApi.get(id as number),
    enabled: !!id,
  });
}

export function useApprovalRequests(params?: ApprovalRequestQuery) {
  return useQuery({
    queryKey: ["approval-requests", params],
    queryFn: () => approvalRequestsApi.list(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useReceiptTempAdvances(enabled: boolean) {
  return useQuery({
    queryKey: ["approval-requests", "receipt-temp-advances"],
    queryFn: () => approvalRequestsApi.getTempAdvances(),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation<ApprovalRequest, unknown, CreateApprovalRequestPayload>({
    mutationFn: approvalRequestsApi.create,
    onSuccess: (request) => {
      queryClient.setQueryData(["approval-requests", request.id], request);
      toast.success("Đã gửi phiếu Approval lên Lark");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Gửi phiếu Approval thất bại"));
    },
  });
}

export function useLinkApprovalCashFlow() {
  const queryClient = useQueryClient();
  return useMutation<
    ApprovalRequest,
    unknown,
    { id: number; cashFlowId: number }
  >({
    mutationFn: ({ id, cashFlowId }) =>
      approvalRequestsApi.linkCashFlow(id, cashFlowId),
    onSuccess: (request) => {
      queryClient.setQueryData(["approval-requests", request.id], request);
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Đã liên kết Approval với sổ quỹ");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Liên kết Approval thất bại"));
    },
  });
}

export function usePostApprovalCashFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvalRequestsApi.postCashFlow,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Đã ghi nhận chi vào sổ quỹ");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Ghi nhận chi thất bại"));
    },
  });
}
