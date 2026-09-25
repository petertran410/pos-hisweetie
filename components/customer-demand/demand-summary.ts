import type { CustomerDemandFilters } from "@/lib/types/customer-demand";

export function toDemandSummaryFilters(
  filters: CustomerDemandFilters
): CustomerDemandFilters {
  return {
    customerId: filters.customerId,
    customerSearch: filters.customerSearch?.trim() || undefined,
    month: filters.month,
    monthFrom: filters.monthFrom,
    monthTo: filters.monthTo,
    status: filters.status,
    search: filters.search?.trim() || undefined,
  };
}
