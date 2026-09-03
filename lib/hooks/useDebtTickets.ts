import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  debtTicketsApi,
  DebtTicketParams,
  CreateDebtTicketPayload,
  DebtTicketLineStatus,
  DebtTicketStatus,
} from "../api/debt-tickets";

const KEY = "debt-tickets";

/** Sau khi ticket đổi, danh sách công nợ cũng phải refresh (cột Ticket). */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: [KEY] });
  qc.invalidateQueries({ queryKey: ["debt-tracking"] });
}

export function useDebtTickets(params?: DebtTicketParams) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => debtTicketsApi.getList(params),
    placeholderData: (prev) => prev,
  });
}

export function useDebtTicket(id?: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => debtTicketsApi.getOne(id as number),
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.isOpen ? 5000 : false,
  });
}

export function useCreateDebtTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDebtTicketPayload) =>
      debtTicketsApi.create(payload),
    onSuccess: (t) => {
      invalidateAll(qc);
      toast.success(`Đã tạo phiếu ${t.code}`);
      t?.warnings?.forEach((w) => toast.warning(w));
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Tạo phiếu thất bại");
    },
  });
}

export function useUpdateDebtTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      payload: {
        title?: string;
        assigneeId?: number;
        status?: DebtTicketStatus;
        note?: string;
      };
    }) => debtTicketsApi.update(vars.id, vars.payload),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Đã cập nhật phiếu");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    },
  });
}

export function useUpdateDebtTicketLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      customerId: number;
      payload: {
        promisedAmount?: number;
        promisedDate?: string;
        note?: string;
        status?: DebtTicketLineStatus;
      };
    }) => debtTicketsApi.updateLine(vars.id, vars.customerId, vars.payload),
    onSuccess: () => {
      invalidateAll(qc);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Cập nhật thất bại");
    },
  });
}

export function useAddTicketCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      customers: CreateDebtTicketPayload["customers"];
    }) => debtTicketsApi.addCustomers(vars.id, vars.customers),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Đã thêm khách vào phiếu");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Thêm khách thất bại");
    },
  });
}

export function useRemoveTicketCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; customerId: number }) =>
      debtTicketsApi.removeCustomer(vars.id, vars.customerId),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Đã xóa khách khỏi phiếu");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Xóa khách thất bại");
    },
  });
}

export function useCloseDebtTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: number;
      reason: string;
      finalStatus?: "DONE" | "ENDED";
    }) => debtTicketsApi.close(vars.id, vars.reason, vars.finalStatus),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Đã kết thúc phiếu");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Kết thúc phiếu thất bại");
    },
  });
}

export function useCancelDebtTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; reason: string }) =>
      debtTicketsApi.cancel(vars.id, vars.reason),
    onSuccess: () => {
      invalidateAll(qc);
      toast.success("Đã dừng phiếu");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Dừng phiếu thất bại");
    },
  });
}
