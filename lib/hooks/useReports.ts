import { useQuery } from "@tanstack/react-query";
import {
  reportsApi,
  ReportFilters,
  saleReportApi,
  SaleReportFilters,
  productReportApi,
  ProductReportFilters,
  supplierReportApi,
  SupplierReportFilters,
  financialReportApi,
  FinancialReportFilters,
  eodReportApi,
  EodReportFilters,
} from "@/lib/api/reports";
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

export function useCustomerDebtReport(filters: ReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "customer-debt", filters],
    queryFn: () => reportsApi.getCustomerDebt(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

// ─── Chart cho báo cáo Khách hàng (top 20) ───
export function useCustomerSalesChart(filters: ReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "customer-sales-chart", filters],
    queryFn: () => reportsApi.getCustomerSalesChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useProductByCustomerChart(filters: ReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "product-by-customer-chart", filters],
    queryFn: () => reportsApi.getProductByCustomerChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useCustomerDebtChart(filters: ReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "customer-debt-chart", filters],
    queryFn: () => reportsApi.getCustomerDebtChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

// ─── Nhóm Bán hàng (Sale) ───
export function useSaleChart(filters: SaleReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "sale-chart", filters],
    queryFn: () => saleReportApi.getChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useSalePreview(filters: SaleReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "sale-preview", filters],
    queryFn: () => saleReportApi.getPreview(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useSaleProfitInvoices(
  filters: SaleReportFilters,
  enabledOverride = true
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "sale-profit-invoices", filters],
    queryFn: () => saleReportApi.getProfitInvoices(filters),
    enabled: hasHydrated && isAuthenticated && enabledOverride,
  });
}

// ─── Nhóm Hàng hóa (Product) ───
export function useProductChart(filters: ProductReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "product-chart", filters],
    queryFn: () => productReportApi.getChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useProductPreview(filters: ProductReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "product-preview", filters],
    queryFn: () => productReportApi.getPreview(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useProductInvoices(filters: ProductReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "product-invoices", filters],
    queryFn: () => productReportApi.getInvoices(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

// ─── Nhóm Nhà cung cấp (Supplier) ───
export function useSupplierChart(filters: SupplierReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "supplier-chart", filters],
    queryFn: () => supplierReportApi.getChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useSupplierPreview(filters: SupplierReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "supplier-preview", filters],
    queryFn: () => supplierReportApi.getPreview(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useSupplierPurchases(filters: SupplierReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "supplier-purchases", filters],
    queryFn: () => supplierReportApi.getPurchases(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

// ─── Nhóm Tài chính (Financial) ───
export function useFinancialChart(filters: FinancialReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "financial-chart", filters],
    queryFn: () => financialReportApi.getChart(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useFinancialPreview(filters: FinancialReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "financial-preview", filters],
    queryFn: () => financialReportApi.getPreview(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useFinancialCashFlows(filters: FinancialReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "financial-cashflows", filters],
    queryFn: () => financialReportApi.getCashFlows(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}

// ─── Nhóm Cuối ngày (EndOfDay) ───
export function useEodPreview(filters: EodReportFilters) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return useQuery({
    queryKey: ["reports", "eod-preview", filters],
    queryFn: () => eodReportApi.getPreview(filters),
    enabled: hasHydrated && isAuthenticated,
  });
}
