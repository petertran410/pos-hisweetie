import { useQuery } from "@tanstack/react-query";
import { reportsApi, ReportFilters } from "@/lib/api/reports";
import { useAuthStore } from "@/lib/store/auth";

export function useCustomerSalesReport(filters: ReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "customer-sales", filters],
    queryFn: () => reportsApi.getCustomerSales(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useProductByCustomerReport(filters: ReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "product-by-customer", filters],
    queryFn: () => reportsApi.getProductByCustomer(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}
