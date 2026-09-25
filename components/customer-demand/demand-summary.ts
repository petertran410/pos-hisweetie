import type { CustomerDemandFilters } from "@/lib/types/customer-demand";

export function toDemandSummaryFilters(
  filters: CustomerDemandFilters,
  search?: string
): CustomerDemandFilters {
  return {
    customerId: filters.customerId,
    month: filters.month,
    monthFrom: filters.monthFrom,
    monthTo: filters.monthTo,
    status: filters.status,
    search: search?.trim() || undefined,
  };
}
