import { useQuery } from "@tanstack/react-query";
import { packingSlipsApi } from "@/lib/api/packing-slips";

interface PackingSlipListResponse {
  data?: unknown;
}

interface PackingSlipSummary {
  cancelledAt?: string | null;
  paymentMethod?: string | null;
}

function getPackingSlips(response: unknown): PackingSlipSummary[] {
  if (Array.isArray(response)) return response;
  if (
    response &&
    typeof response === "object" &&
    Array.isArray((response as PackingSlipListResponse).data)
  ) {
    return (response as PackingSlipListResponse).data as PackingSlipSummary[];
  }
  return [];
}

export function hasActiveCashPackingSlip(response: unknown): boolean {
  return getPackingSlips(response).some(
    (packingSlip) =>
      packingSlip &&
      !packingSlip.cancelledAt &&
      packingSlip.paymentMethod === "cash"
  );
}

export function useInvoiceCashPackingLock(invoiceId: number) {
  return useQuery({
    queryKey: ["packing-slips", "invoice", invoiceId],
    queryFn: () => packingSlipsApi.getPackingSlips({ invoiceId, limit: 100 }),
    enabled: invoiceId > 0,
    staleTime: 30_000,
    select: (response) => hasActiveCashPackingSlip(response),
  });
}
