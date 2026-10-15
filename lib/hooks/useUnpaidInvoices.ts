import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";

export interface UnpaidInvoice {
  id: number;
  code: string;
  purchaseDate: string;
  grandTotal: number;
  debtAmount: number;
}

interface InvoiceApiRow {
  id: number;
  code: string;
  purchaseDate: string;
  grandTotal: number | string;
  debtAmount: number | string;
  status: number;
  returnOrderAmount?: number | string | null;
}

/**
 * Hóa đơn còn nợ của 1 khách, cũ trước (đồng bộ logic CustomerPaymentModal).
 * Dùng chung cho phiếu thu Biến động số dư và Tiền mặt kho.
 */
export function useUnpaidInvoices(customerId: number, enabled: boolean) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoices", "customer", [customerId], "unpaid-sepay"],
    queryFn: () =>
      invoicesApi.getInvoices({ customerIds: [customerId], limit: 1000 }),
    enabled: enabled && customerId > 0,
  });

  const invoices = useMemo<UnpaidInvoice[]>(() => {
    return (
      (data?.data || [])
        .filter((invoice: InvoiceApiRow) => {
          const debtAmount = Number(invoice.debtAmount);
          if (debtAmount <= 0) return false;
          if (invoice.status === 2) return false;
          const returnOrderAmount = Number(invoice.returnOrderAmount || 0);
          if (returnOrderAmount >= debtAmount) return false;
          return true;
        })
        .sort(
          (a: InvoiceApiRow, b: InvoiceApiRow) =>
            new Date(a.purchaseDate).getTime() -
            new Date(b.purchaseDate).getTime(),
        )
        .map((inv: InvoiceApiRow) => ({
          id: inv.id,
          code: inv.code,
          purchaseDate: inv.purchaseDate,
          grandTotal: Number(inv.grandTotal),
          debtAmount: Number(inv.debtAmount),
        })) || []
    );
  }, [data]);

  return { invoices, isLoading };
}
