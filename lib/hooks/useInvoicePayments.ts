import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoicePaymentsApi } from "../api/invoice-payments";

export function useInvoicePayments(invoiceId: number) {
  return useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: () => invoicePaymentsApi.getPaymentsByInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useCreateInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicePaymentsApi.createPayment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["invoice-payments", variables.invoiceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoice", variables.invoiceId],
      });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteInvoicePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicePaymentsApi.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
