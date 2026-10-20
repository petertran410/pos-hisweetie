import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cashAdvanceRefundsApi,
  cashAdvancesApi,
  type CashAdvanceAttachment,
  type CashAdvanceInput,
  type CashAdvanceQuery,
  type CashAdvanceRefundInput,
  type CashAdvanceRefundQuery,
} from "@/lib/api/cash-advances";
import { invalidateInternalFinance } from "@/lib/hooks/useInternalFinance";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** Tạm ứng đổi thì quỹ, phiếu chi kho và hoàn ứng cũng đổi theo. */
export function invalidateCashAdvances(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  // Gồm cả cash-advances / cash-advance-refunds.
  invalidateInternalFinance(queryClient);
}

export function useCashAdvances(params: CashAdvanceQuery, enabled = true) {
  return useQuery({
    queryKey: ["cash-advances", "list", params],
    queryFn: () => cashAdvancesApi.list(params),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useCashAdvance(id: number | null) {
  return useQuery({
    queryKey: ["cash-advances", "detail", id],
    queryFn: () => cashAdvancesApi.get(id as number),
    enabled: id != null,
  });
}

/** Người nhận đang bị chặn tạm ứng mới vì quá hạn hoàn ứng. */
export function useRecipientAdvanceStatus(recipientId: number | null) {
  return useQuery({
    queryKey: ["cash-advances", "recipient-status", recipientId],
    queryFn: () => cashAdvancesApi.recipientStatus(recipientId as number),
    enabled: recipientId != null && recipientId > 0,
    staleTime: 15_000,
  });
}

export function useCashAdvanceFundBalance(branchId: number | null) {
  return useQuery({
    queryKey: ["cash-advances", "fund-balance", branchId],
    queryFn: () => cashAdvancesApi.fundBalance(branchId as number),
    enabled: branchId != null,
    retry: false,
  });
}

export function useRefundableAdvances(
  params: { branchId?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ["cash-advances", "refundable", params],
    queryFn: () => cashAdvancesApi.refundableAdvances(params),
    enabled,
  });
}

export function useCreateCashAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CashAdvanceInput) => cashAdvancesApi.create(payload),
    onSuccess: (row) => {
      invalidateCashAdvances(queryClient);
      toast.success(`Đã tạo phiếu tạm ứng ${row.code}`);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu tạm ứng thất bại")),
  });
}

export function useUpdateCashAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof cashAdvancesApi.update>[1];
    }) => cashAdvancesApi.update(id, payload),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã lưu phiếu tạm ứng");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Lưu phiếu tạm ứng thất bại")),
  });
}

export function useConfirmCashAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cashAdvancesApi.confirm(id),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã xác nhận giao tiền và trừ quỹ kho");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Xác nhận giao tiền thất bại")),
  });
}

export function useUploadSignedCashAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      attachments,
    }: {
      id: number;
      attachments: CashAdvanceAttachment[];
    }) => cashAdvancesApi.uploadSigned(id, attachments),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã lưu phiếu tạm ứng đã ký");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Upload phiếu đã ký thất bại")),
  });
}

export function useCancelCashAdvance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      cashAdvancesApi.cancel(id, reason),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã hủy phiếu tạm ứng");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Hủy phiếu tạm ứng thất bại")),
  });
}

/** Bỏ Đã chi của phiếu chi kho đã chi từ tạm ứng. */
export function useReleaseAdvanceExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, reason }: { entryId: number; reason: string }) =>
      cashAdvancesApi.releaseEntry(entryId, reason),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã bỏ Đã chi của phiếu chi kho");
    },
    onError: (error) => toast.error(errorMessage(error, "Bỏ Đã chi thất bại")),
  });
}

export function useCashAdvanceRefunds(
  params: CashAdvanceRefundQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: ["cash-advance-refunds", "list", params],
    queryFn: () => cashAdvanceRefundsApi.list(params),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useCreateCashAdvanceRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CashAdvanceRefundInput) =>
      cashAdvanceRefundsApi.create(payload),
    onSuccess: (row) => {
      invalidateCashAdvances(queryClient);
      toast.success(`Đã tạo phiếu hoàn ứng ${row.code}`);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu hoàn ứng thất bại")),
  });
}

export function useUpdateCashAdvanceRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof cashAdvanceRefundsApi.update>[1];
    }) => cashAdvanceRefundsApi.update(id, payload),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã lưu phiếu hoàn ứng");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Lưu phiếu hoàn ứng thất bại")),
  });
}

export function useConfirmCashAdvanceRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cashAdvanceRefundsApi.confirm(id),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã xác nhận nhận tiền hoàn ứng vào quỹ kho");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Xác nhận nhận tiền thất bại")),
  });
}

export function useUploadSignedCashAdvanceRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      attachments,
    }: {
      id: number;
      attachments: CashAdvanceAttachment[];
    }) => cashAdvanceRefundsApi.uploadSigned(id, attachments),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã lưu phiếu hoàn ứng đã ký");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Upload phiếu đã ký thất bại")),
  });
}

export function useCancelCashAdvanceRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      cashAdvanceRefundsApi.cancel(id, reason),
    onSuccess: () => {
      invalidateCashAdvances(queryClient);
      toast.success("Đã hủy phiếu hoàn ứng");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Hủy phiếu hoàn ứng thất bại")),
  });
}
