import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  internalFinanceApi,
  type InternalFinanceQuery,
} from "@/lib/api/internal-finance";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useInternalFinance(params: InternalFinanceQuery) {
  return useQuery({
    queryKey: ["internal-finance", params],
    queryFn: () => internalFinanceApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useInternalFinanceSummary(params: InternalFinanceQuery) {
  return useQuery({
    queryKey: ["internal-finance", "summary", params],
    queryFn: () => internalFinanceApi.summary(params),
    staleTime: 15_000,
  });
}

export function useInternalFinanceWeeklyBatches(params: InternalFinanceQuery) {
  return useQuery({
    queryKey: ["internal-finance", "weekly-batches", params],
    queryFn: () => internalFinanceApi.weeklyBatches(params),
  });
}

export function useInternalFinanceWeeklyBatch(id: number | null) {
  return useQuery({
    queryKey: ["internal-finance", "weekly-batch", id],
    queryFn: () => internalFinanceApi.weeklyBatch(id as number),
    enabled: id != null,
  });
}

function invalidateInternalFinance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["internal-finance"] });
  queryClient.invalidateQueries({ queryKey: ["cashflows"] });
  queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
}

export function useCreateManualReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.createManualReceipt,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo phiếu thu nội bộ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu thu thất bại")),
  });
}

export function useCreateManualExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.createManualExpense,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo phiếu chi nội bộ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu chi thất bại")),
  });
}

export function useCreateFuelEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.createFuel,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo phiếu xăng dầu");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu xăng dầu thất bại")),
  });
}

export function useCreateVehicleCareEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.createVehicleCare,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo phiếu chăm sóc xe");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu chăm sóc xe thất bại")),
  });
}

export function useReviewInternalFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      role,
      payload,
    }: {
      id: number;
      role: "accountant" | "manager";
      payload: { decision: string; note?: string; reason?: string; dueAt?: string };
    }) => internalFinanceApi.review(id, role, payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã cập nhật kiểm tra tài chính");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Cập nhật kiểm tra thất bại")),
  });
}

export function usePrepareWeeklyBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.prepareWeeklyBatch,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã chuẩn bị tổng hợp chi phí tuần");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Chuẩn bị batch tuần thất bại")),
  });
}

export function useCreateWeeklyApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload?: { detailUrl?: string; viewUrl?: string };
    }) => internalFinanceApi.createWeeklyApproval(id, payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo Approval tuần");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo Approval tuần thất bại")),
  });
}

export function usePostWeeklyBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.postWeeklyBatch,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã ghi nhận các khoản chi trong tuần");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Ghi nhận batch tuần thất bại")),
  });
}

export function useUpdateInternalFinanceCashIssued() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cashIssued,
    }: {
      id: number;
      cashIssued: boolean;
    }) => internalFinanceApi.updateCashIssued(id, cashIssued),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-finance"] });
      toast.success("Đã cập nhật trạng thái Đã chi");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Cập nhật trạng thái Đã chi thất bại")),
  });
}

export function usePostInternalFinanceEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.postEntry,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã ghi nhận vào sổ quỹ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Ghi nhận dòng tài chính thất bại")),
  });
}

export function useAddInternalFinanceAttachments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      attachments,
    }: {
      id: number;
      attachments: Parameters<typeof internalFinanceApi.addAttachments>[1];
    }) => internalFinanceApi.addAttachments(id, attachments),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã bổ sung chứng từ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Bổ sung chứng từ thất bại")),
  });
}
