import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoicePaymentsApi } from "../api/invoice-payments";
import { useSandboxStore } from "../store/sandbox";
import { useSandboxDataStore } from "../store/sandbox-data";

export function useInvoicePayments(invoiceId: number) {
  return useQuery({
    queryKey: ["invoice-payments", invoiceId],
    queryFn: () => invoicePaymentsApi.getPaymentsByInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useCreateInvoicePayment() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: (data: any) => {
      if (isSandbox) {
        const invoices = useSandboxDataStore.getState().getEntities("invoices");
        const invoice = invoices.find((inv: any) => inv.id === data.invoiceId);
        if (invoice) {
          const newPaid = Number(invoice.paidAmount || 0) + Number(data.amount);
          useSandboxDataStore
            .getState()
            .updateEntity("invoices", data.invoiceId, {
              paidAmount: newPaid,
              debtAmount: Number(invoice.grandTotal || 0) - newPaid,
              status: newPaid >= Number(invoice.grandTotal) ? 1 : 3,
              statusValue:
                newPaid >= Number(invoice.grandTotal)
                  ? "Hoàn thành"
                  : "Đang xử lý",
            });
        }
        return Promise.resolve({ id: Date.now(), ...data });
      }
      return invoicePaymentsApi.createPayment(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["invoice-payments", variables.invoiceId],
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
