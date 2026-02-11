import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "../api/invoices";
import { toast } from "sonner";
import { apiClient } from "../config/api";

export function useInvoices(params?: any) {
  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => invoicesApi.getInvoices(params),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getInvoice(id),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Tạo hóa đơn thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo hóa đơn thất bại");
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      invoicesApi.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật hóa đơn thất bại");
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Xóa hóa đơn thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa hóa đơn thất bại");
    },
  });
}

export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      additionalPayment,
      items,
    }: {
      orderId: number;
      additionalPayment?: number;
      items?: any[];
    }) => invoicesApi.createInvoiceFromOrder(orderId, additionalPayment, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo hóa đơn từ đơn hàng thất bại");
    },
  });
}

export function useUnpaidInvoicesByPartner(
  partnerId: number | null,
  partnerType: string
) {
  return useQuery({
    queryKey: ["invoices", "unpaid", partnerId, partnerType],
    queryFn: async () => {
      if (!partnerId || !partnerType) {
        return { data: [] };
      }
      const response = await apiClient.get<{ data: any[] }>(
        "/invoices/unpaid-by-partner",
        {
          partnerId: partnerId.toString(),
          partnerType,
        }
      );
      return response;
    },
    enabled: !!partnerId && !!partnerType,
  });
}
