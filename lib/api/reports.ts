import { apiClient, API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  branchId?: number;
  customerId?: number;
  customerGroupId?: number;
  soldById?: number;
  saleChannelId?: number;
  page?: number;
  limit?: number;
}

export interface CustomerSalesRow {
  id: number;
  code: string;
  purchaseDate: string;
  totalAmount: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  status: number;
  statusValue: string;
  description: string | null;
  customer: {
    id: number;
    code: string;
    name: string;
    contactNumber: string;
  } | null;
  branch: { name: string } | null;
  soldBy: { name: string } | null;
  saleChannel: { name: string } | null;
  returnAmount: number;
}

export interface CustomerSalesSummary {
  totalInvoices: number;
  totalAmount: number;
  totalDiscount: number;
  totalGrandTotal: number;
  totalPaidAmount: number;
  totalDebtAmount: number;
  totalReturn: number;
  netRevenue: number;
}

export interface ProductByCustomerRow {
  id: number;
  customerCode: string;
  customerName: string;
  contactNumber: string;
  invoiceCode: string;
  purchaseDate: string;
  branchName: string;
  sellerName: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  sellingPrice: number;
  totalPrice: number;
  conditionType: string;
}

export interface ProductByCustomerSummary {
  totalRows: number;
  totalQuantity: number;
  totalPrice: number;
}

export interface CustomerDebtRow {
  customerId: number;
  customerCode: string;
  customerName: string;
  contactNumber: string;
  customerGroups: string;
  openingDebt: number;
  debit: number;
  credit: number;
  closingDebt: number;
}

export interface CustomerDebtSummary {
  totalCustomers: number;
  totalOpening: number;
  totalDebit: number;
  totalCredit: number;
  totalClosing: number;
}

export const reportsApi = {
  getCustomerSales: (
    params: ReportFilters
  ): Promise<{
    data: CustomerSalesRow[];
    total: number;
    page: number;
    limit: number;
    summary: CustomerSalesSummary;
  }> => {
    return apiClient.get("/reports/customer-sales", params);
  },

  getProductByCustomer: (
    params: ReportFilters
  ): Promise<{
    data: ProductByCustomerRow[];
    total: number;
    page: number;
    limit: number;
    summary: ProductByCustomerSummary;
  }> => {
    return apiClient.get("/reports/product-by-customer", params);
  },

  exportCustomerSales: async (params: ReportFilters) => {
    const url = new URL(`${API_URL}/reports/customer-sales/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const token = useAuthStore.getState().token;
    const branch = useBranchStore.getState().selectedBranch;
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (branch?.id) headers["X-Branch-Id"] = String(branch.id);

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Xuất file thất bại" }));
      throw new Error(err.message);
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bao-cao-ban-hang_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  exportProductByCustomer: async (params: ReportFilters) => {
    const url = new URL(`${API_URL}/reports/product-by-customer/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const token = useAuthStore.getState().token;
    const branch = useBranchStore.getState().selectedBranch;
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (branch?.id) headers["X-Branch-Id"] = String(branch.id);

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Xuất file thất bại" }));
      throw new Error(err.message);
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hang-ban-theo-khach_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  getCustomerDebt: (
    params: ReportFilters
  ): Promise<{
    data: CustomerDebtRow[];
    total: number;
    page: number;
    limit: number;
    summary: CustomerDebtSummary;
  }> => {
    return apiClient.get("/reports/customer-debt", params);
  },

  exportCustomerDebt: async (params: ReportFilters) => {
    const url = new URL(`${API_URL}/reports/customer-debt/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const token = useAuthStore.getState().token;
    const branch = useBranchStore.getState().selectedBranch;
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (branch?.id) headers["X-Branch-Id"] = String(branch.id);

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Xuất file thất bại" }));
      throw new Error(err.message);
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bao-cao-cong-no-theo-khach-hang_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};
