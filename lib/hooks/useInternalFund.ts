import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/auth";
import {
  internalFundApi,
  type InternalFundQuery,
  type InternalFundReceiptInput,
} from "@/lib/api/internal-fund";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function invalidateInternalFund(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["internal-fund"] });
  queryClient.invalidateQueries({ queryKey: ["internal-finance"] });
  queryClient.invalidateQueries({ queryKey: ["warehouse-expenses"] });
  queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
}

export function useInternalFundTransactions(params: InternalFundQuery, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "transactions", params],
    queryFn: () => internalFundApi.transactions(params),
    enabled: enabled && Boolean(userId),
  });
}

export function useInternalFundDailyClosings(params: InternalFundQuery, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "daily-closings", params],
    queryFn: () => internalFundApi.dailyClosings(params),
    enabled: enabled && Boolean(userId),
  });
}

export function useInternalFundAccess() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ["internal-fund", "access", user?.id, user?.permissions],
    queryFn: internalFundApi.access,
    enabled: Boolean(user),
  });
}

export function useInternalFundSummary(params: InternalFundQuery, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "summary", params],
    queryFn: () => internalFundApi.summary(params),
    enabled: enabled && Boolean(userId),
  });
}

export function useInternalFundApprovals(params: InternalFundQuery, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "approvals", params],
    queryFn: () => internalFundApi.approvals(params),
    refetchInterval: 15000,
    enabled: enabled && Boolean(userId),
  });
}

export function useInternalFundApproval(id: number | null) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "approval", id],
    queryFn: () => internalFundApi.approval(id as number),
    enabled: Boolean(userId && id),
  });
}

export function useInternalFundTransfers(params: InternalFundQuery, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "transfers", params],
    queryFn: () => internalFundApi.transfers(params),
    enabled: enabled && Boolean(userId),
  });
}

export function useInternalFundDailyClosing(id: number | null) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["internal-fund", userId, "daily-closing", id],
    queryFn: () => internalFundApi.dailyClosing(id as number),
    enabled: Boolean(userId && id),
  });
}

export function useCancelInternalFundTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      internalFundApi.cancelTransaction(id, reason),
    onSuccess: () => {
      invalidateInternalFund(client);
      toast.success("Đã hủy giao dịch quỹ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Hủy giao dịch thất bại")),
  });
}

export function useCancelInternalFundTransfer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      internalFundApi.cancelTransfer(id, reason),
    onSuccess: () => {
      invalidateInternalFund(client);
      toast.success("Đã hủy cả hai chiều chuyển tiền");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Hủy chuyển tiền thất bại")),
  });
}

export function useAdjustInternalFundTransaction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      description,
      reason,
    }: {
      id: number;
      description: string;
      reason: string;
    }) => internalFundApi.updateTransaction(id, description, reason),
    onSuccess: () => {
      invalidateInternalFund(client);
      toast.success("Đã lưu điều chỉnh");
    },
    onError: (error) => toast.error(errorMessage(error, "Điều chỉnh thất bại")),
  });
}

export function useCreateInternalFundReceiptApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InternalFundReceiptInput) =>
      internalFundApi.createReceiptApproval(payload),
    onSuccess: () => {
      invalidateInternalFund(queryClient);
      toast.success("Đã gửi phiếu thu nội bộ lên Lark");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Gửi phiếu thu nội bộ thất bại")),
  });
}

export function usePostInternalFundApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFundApi.postApproval,
    onSuccess: () => {
      invalidateInternalFund(queryClient);
      toast.success("Đã ghi nhận vào quỹ nội bộ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Ghi nhận Approval thất bại")),
  });
}

export function useCloseInternalFundDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFundApi.closeDay,
    onSuccess: () => {
      invalidateInternalFund(queryClient);
      toast.success("Đã chốt sổ nội bộ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Chốt sổ nội bộ thất bại")),
  });
}
