import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  internalFinanceApi,
  type InternalFinanceQuery,
  type VehicleEntryQuery,
  type VehicleEntryUpdateInput,
  type WarehouseExpenseInput,
  type WarehouseExpenseQuery,
  type WarehouseReceiptInput,
  type WarehouseReceiptQuery,
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

export function useWarehouseExpenses(params: WarehouseExpenseQuery) {
  return useQuery({
    queryKey: ["warehouse-expenses", params],
    queryFn: () => internalFinanceApi.warehouseExpenses(params),
    placeholderData: (previous) => previous,
  });
}

export function useWarehouseExpenseBatches(params: InternalFinanceQuery) {
  return useQuery({
    queryKey: ["warehouse-expenses", "weekly-batches", params],
    queryFn: () => internalFinanceApi.warehouseExpenseBatches(params),
  });
}

export function useWarehouseExpenseBatch(id: number | null) {
  return useQuery({
    queryKey: ["warehouse-expenses", "weekly-batch", id],
    queryFn: () => internalFinanceApi.warehouseExpenseBatch(id as number),
    enabled: id != null,
  });
}

export function useCreateWarehouseExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WarehouseExpenseInput) =>
      internalFinanceApi.createWarehouseExpense(payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo khoản chi");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo khoản chi thất bại")),
  });
}

export function useUpdateWarehouseExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Parameters<typeof internalFinanceApi.updateWarehouseExpense>[1];
    }) => internalFinanceApi.updateWarehouseExpense(id, payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã cập nhật khoản chi");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Cập nhật khoản chi thất bại")),
  });
}

export function usePrepareWarehouseExpenseBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalFinanceApi.prepareWarehouseExpenseBatch,
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tổng hợp phiếu chi tuần");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tổng hợp phiếu chi thất bại")),
  });
}

export function useCreateWarehouseExpenseApproval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload?: { detailUrl?: string; viewUrl?: string };
    }) => internalFinanceApi.createWarehouseExpenseApproval(id, payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã gửi Approval lên Lark");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Gửi Approval thất bại")),
  });
}

export function useMarkWarehouseExpenseIssued() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cashIssued,
    }: {
      id: number;
      cashIssued: boolean;
    }) => internalFinanceApi.markWarehouseExpenseIssued(id, cashIssued),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã xác nhận chi và ghi sổ quỹ");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Xác nhận Đã chi thất bại")),
  });
}

export function invalidateInternalFinance(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ["internal-finance"] });
  queryClient.invalidateQueries({ queryKey: ["warehouse-receipts"] });
  queryClient.invalidateQueries({ queryKey: ["warehouse-expenses"] });
  queryClient.invalidateQueries({ queryKey: ["vehicle-entries"] });
  queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  queryClient.invalidateQueries({ queryKey: ["internal-fund"] });
  queryClient.invalidateQueries({ queryKey: ["cashflows"] });
  queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
  queryClient.invalidateQueries({ queryKey: ["invoices"] });
}

export function useLarkImportStatus(enabled = true) {
  return useQuery({
    queryKey: ["internal-finance", "lark-import", "status"],
    queryFn: () => internalFinanceApi.larkImportStatus(),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.running ? 3000 : false,
    refetchIntervalInBackground: true,
  });
}

export function useStartLarkImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { dryRun: boolean; sources?: string[] }) =>
      internalFinanceApi.startLarkImport(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["internal-finance", "lark-import", "status"],
        data,
      );
      toast.success(
        data.dryRun
          ? "Đang kiểm tra dữ liệu Lark..."
          : "Đang đồng bộ dữ liệu Lark...",
      );
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Không bắt đầu được đồng bộ Lark")),
  });
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

export function useVehicleEntries(params: VehicleEntryQuery, enabled = true) {
  return useQuery({
    queryKey: ["vehicle-entries", params],
    queryFn: () => internalFinanceApi.vehicleEntries(params),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useUpdateVehicleEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: VehicleEntryUpdateInput;
    }) => internalFinanceApi.updateVehicleEntry(id, payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã cập nhật phiếu xe");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Cập nhật phiếu xe thất bại")),
  });
}

export function useCancelVehicleEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => internalFinanceApi.cancelVehicleEntry(id),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã hủy phiếu xe");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Hủy phiếu xe thất bại")),
  });
}

export function useBackfillExpenseMetadata() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dryRun: boolean) =>
      internalFinanceApi.backfillExpenseMetadata(dryRun),
    onSuccess: (report) => {
      if (!report.dryRun) invalidateInternalFinance(queryClient);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Bổ sung dữ liệu phiếu chi thất bại")),
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

export function useWarehouseReceipts(params: WarehouseReceiptQuery) {
  return useQuery({
    queryKey: ["warehouse-receipts", params],
    queryFn: () => internalFinanceApi.warehouseReceipts(params),
    placeholderData: (previous) => previous,
  });
}

export function useWarehouseReceipt(id: number | null) {
  return useQuery({
    queryKey: ["warehouse-receipts", "detail", id],
    queryFn: () => internalFinanceApi.warehouseReceipt(id as number),
    enabled: id != null,
  });
}

export function useCreateWarehouseReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WarehouseReceiptInput) =>
      internalFinanceApi.createWarehouseReceipt(payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã tạo phiếu tiền mặt");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Tạo phiếu tiền mặt thất bại")),
  });
}

export function useUpdateWarehouseReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<WarehouseReceiptInput>;
    }) => internalFinanceApi.updateWarehouseReceipt(id, payload),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã cập nhật phiếu tiền mặt");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Cập nhật phiếu tiền mặt thất bại")),
  });
}

export function usePostWarehouseReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      allocations,
    }: {
      id: number;
      allocations: Array<{
        customerId: number;
        amount: number;
        invoices: Array<{ invoiceId: number; amount: number }>;
      }>;
    }) => internalFinanceApi.postWarehouseReceipt(id, { allocations }),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      toast.success("Đã lập phiếu thu");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Lập phiếu thu thất bại")),
  });
}

export function useCancelWarehouseReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      cancelCashFlows,
    }: {
      id: number;
      cancelCashFlows: boolean;
    }) => internalFinanceApi.cancelWarehouseReceipt(id, { cancelCashFlows }),
    onSuccess: () => {
      invalidateInternalFinance(queryClient);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["debt-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["sepay-transactions"] });
      toast.success("Đã hủy phiếu tiền mặt kho");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Hủy phiếu tiền mặt kho thất bại")),
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
