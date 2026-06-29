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
  priceBookId?: number;
  page?: number;
  limit?: number;
}

// Dòng dữ liệu biểu đồ báo cáo Khách hàng (top 20)
export interface CustomerChartRow {
  subject: string;
  value: number;
  total: number;
  extra1?: string | null;
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

// ─── Nhóm báo cáo Bán hàng (Sale) ───
export type SaleViewType =
  | "PurchaseDate"
  | "Profit"
  | "SoldBy"
  | "Branch"
  | "Refund";

export interface SaleReportFilters {
  viewType?: SaleViewType;
  fromDate?: string;
  toDate?: string;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
  priceBookId?: number;
  page?: number;
  limit?: number;
}

// Dòng dữ liệu chuẩn cho biểu đồ (đồng bộ backend SaleChartRow)
export interface SaleChartRow {
  subject: string;
  value: number;
  total: number;
  extra1?: string | null;
  group?: string | null;
  extraOrderBy?: string | null;
  revenue?: number;
  totalCost?: number;
  profit?: number;
}

export interface SalePreviewSummary {
  totalRows: number;
  totalValue?: number;
  totalRevenue?: number;
  totalCost?: number;
  totalReturnAmount?: number;
  totalRefundAmount?: number;
  // View PurchaseDate (theo ngày)
  totalOrderCount?: number;
  totalAmount?: number;
  totalDiscount?: number;
  totalReturnCount?: number;
  totalNetRevenue?: number;
}

// Dòng bảng "Theo thời gian" (PurchaseDate) — đủ cột như KiotViet
export interface SaleByDateRow {
  dateIso: string;
  label: string;
  orderCount: number;
  totalAmount: number;
  discount: number;
  revenue: number;
  returnCount: number;
  returnAmount: number;
  netRevenue: number;
}

export interface SaleRefundRow {
  id: number;
  code: string;
  createdAt: string;
  invoiceCode: string | null;
  customerName: string;
  customerCode: string | null;
  branchName: string | null;
  totalReturnAmount: number;
  refundAmount: number;
  statusValue: string;
}

// Drilldown: hóa đơn kèm giá vốn + lợi nhuận (dùng cho click ngày/NV/chi nhánh)
export interface SaleProfitInvoiceRow {
  id: number;
  code: string;
  purchaseDate: string;
  soldByName: string | null;
  customerName: string;
  branchName: string | null;
  revenue: number;
  cost: number;
  profit: number;
}

export interface SaleProfitInvoicesResponse {
  data: SaleProfitInvoiceRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalInvoices: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
}

export interface SalePreviewResponse {
  viewType: SaleViewType;
  data: SaleChartRow[] | SaleRefundRow[] | SaleByDateRow[];
  total: number;
  page?: number;
  limit?: number;
  summary: SalePreviewSummary;
}

function downloadReportFile(url: URL, fallbackName: string) {
  const token = useAuthStore.getState().token;
  const branch = useBranchStore.getState().selectedBranch;
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (branch?.id) headers["X-Branch-Id"] = String(branch.id);

  return fetch(url.toString(), { headers }).then(async (res) => {
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: "Xuất file thất bại" }));
      throw new Error(err.message);
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fallbackName;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

export const saleReportApi = {
  getChart: (params: SaleReportFilters): Promise<SaleChartRow[]> => {
    return apiClient.get("/reports/sale/chart", params);
  },

  getPreview: (params: SaleReportFilters): Promise<SalePreviewResponse> => {
    return apiClient.get("/reports/sale/preview", params);
  },

  getProfitInvoices: (
    params: SaleReportFilters
  ): Promise<SaleProfitInvoicesResponse> => {
    return apiClient.get("/reports/sale/profit-invoices", params);
  },

  exportExcel: (params: SaleReportFilters) => {
    const url = new URL(`${API_URL}/reports/sale/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `bao-cao-ban-hang_${Date.now()}.xlsx`);
  },

  exportDetail: (params: SaleReportFilters) => {
    const url = new URL(`${API_URL}/reports/sale/profit-invoices/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `chi-tiet-ban-hang_${Date.now()}.xlsx`);
  },
};

// ─── Nhóm báo cáo Hàng hóa (Product) ───
export type ProductViewType =
  | "ProductBySale"
  | "ProductByProfit"
  | "ProductByCategory"
  | "InOutStock"
  | "InOutStockDetail"
  | "ProductByUser"
  | "ProductByCustomer"
  | "ProductBySupplier"
  | "DamageItem";

export type CategoryLevel = "parent" | "middle" | "child";

export interface ProductReportFilters {
  viewType?: ProductViewType;
  fromDate?: string;
  toDate?: string;
  branchId?: number;
  soldById?: number;
  customerId?: number;
  productId?: number;
  productKeyword?: string;
  categoryLevel?: CategoryLevel;
  categoryValue?: string;
  page?: number;
  limit?: number;
}

export interface ProductChartRow {
  subject: string;
  value: number;
  total: number;
  extra1?: string | null;
  group?: string | null;
  revenue?: number;
  totalCost?: number;
  profit?: number;
  quantity?: number;
}

export interface ProductPreviewResponse {
  viewType: ProductViewType;
  data: ProductChartRow[];
  total: number;
  summary: {
    totalRows: number;
    totalValue: number;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
  };
}

export interface ProductInvoiceRow {
  id: number;
  invoiceCode: string;
  purchaseDate: string;
  soldByName: string | null;
  customerName: string;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  discountRatio: number;
  priceAfterDiscount: number;
  totalPrice: number;
}

export interface ProductInvoicesResponse {
  data: ProductInvoiceRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalInvoices: number;
    totalQuantity: number;
    totalRevenue: number;
  };
}

export const productReportApi = {
  getChart: (params: ProductReportFilters): Promise<ProductChartRow[]> => {
    return apiClient.get("/reports/product/chart", params);
  },
  getPreview: (
    params: ProductReportFilters
  ): Promise<ProductPreviewResponse> => {
    return apiClient.get("/reports/product/preview", params);
  },
  getInvoices: (
    params: ProductReportFilters
  ): Promise<ProductInvoicesResponse> => {
    return apiClient.get("/reports/product/invoices", params);
  },
  exportExcel: (params: ProductReportFilters) => {
    const url = new URL(`${API_URL}/reports/product/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `bao-cao-hang-hoa_${Date.now()}.xlsx`);
  },

  exportDetail: (params: ProductReportFilters) => {
    const url = new URL(`${API_URL}/reports/product/invoices/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `chi-tiet-hang-hoa_${Date.now()}.xlsx`);
  },
};

// ─── Nhóm báo cáo Nhà cung cấp (Supplier) ───
export type SupplierViewType =
  | "PurchaseBySupplier"
  | "PurchaseByProduct"
  | "SupplierDebt"
  | "SupplierReturn"
  | "SupplierInfo";

export interface SupplierReportFilters {
  viewType?: SupplierViewType;
  fromDate?: string;
  toDate?: string;
  branchId?: number;
  supplierId?: number;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface SupplierChartRow {
  subject: string;
  value: number;
  total: number;
  extra1?: string | null;
  group?: string | null;
  quantity?: number;
  opening?: number;
  debit?: number;
  credit?: number;
  closing?: number;
}

export interface SupplierPreviewResponse {
  viewType: SupplierViewType;
  data: SupplierChartRow[];
  total: number;
  summary: {
    totalRows: number;
    totalValue: number;
    totalQuantity: number;
    totalDebit: number;
    totalCredit: number;
    totalClosing: number;
  };
}

export interface SupplierPurchaseRow {
  id: number;
  code: string;
  purchaseDate: string;
  supplierName: string;
  branchName: string | null;
  subTotal: number;
  paidAmount: number;
  debtAmount: number;
  statusValue: string;
}

export interface SupplierPurchasesResponse {
  data: SupplierPurchaseRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalDocuments: number;
    totalSubTotal: number;
    totalPaid: number;
    totalDebt: number;
  };
}

export const supplierReportApi = {
  getChart: (params: SupplierReportFilters): Promise<SupplierChartRow[]> => {
    return apiClient.get("/reports/supplier/chart", params);
  },
  getPreview: (
    params: SupplierReportFilters
  ): Promise<SupplierPreviewResponse> => {
    return apiClient.get("/reports/supplier/preview", params);
  },
  getPurchases: (
    params: SupplierReportFilters
  ): Promise<SupplierPurchasesResponse> => {
    return apiClient.get("/reports/supplier/purchases", params);
  },
  exportExcel: (params: SupplierReportFilters) => {
    const url = new URL(`${API_URL}/reports/supplier/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `bao-cao-ncc_${Date.now()}.xlsx`);
  },

  exportDetail: (params: SupplierReportFilters) => {
    const url = new URL(`${API_URL}/reports/supplier/purchases/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `chi-tiet-nhap-hang_${Date.now()}.xlsx`);
  },
};

// ─── Nhóm báo cáo Tài chính (Financial) ───
export type FinancialViewType =
  | "CashByGroup"
  | "CashByTime"
  | "CashFlowSummary"
  | "SalePerformance";

export interface FinancialReportFilters {
  viewType?: FinancialViewType;
  fromDate?: string;
  toDate?: string;
  branchId?: number;
  cashFlowGroupId?: number;
  direction?: "receipt" | "payment";
  page?: number;
  limit?: number;
}

export interface FinancialChartRow {
  subject: string;
  value: number;
  total: number;
  extra1?: string | null;
  receipt?: number;
  payment?: number;
  net?: number;
  revenue?: number;
  cost?: number;
  profit?: number;
}

export interface FinancialPreviewResponse {
  viewType: FinancialViewType;
  data: FinancialChartRow[];
  total: number;
  summary: {
    totalRows: number;
    totalReceipt: number;
    totalPayment: number;
    totalRevenue: number;
    totalCost: number;
  };
}

export interface CashFlowDocRow {
  id: number;
  code: string;
  transDate: string;
  isReceipt: boolean;
  amount: number;
  method: string | null;
  partnerName: string | null;
  groupName: string | null;
  branchName: string | null;
  description: string | null;
}

export interface CashFlowDocsResponse {
  data: CashFlowDocRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalDocuments: number;
    totalReceipt: number;
    totalPayment: number;
  };
}

export const financialReportApi = {
  getChart: (params: FinancialReportFilters): Promise<FinancialChartRow[]> => {
    return apiClient.get("/reports/financial/chart", params);
  },
  getPreview: (
    params: FinancialReportFilters
  ): Promise<FinancialPreviewResponse> => {
    return apiClient.get("/reports/financial/preview", params);
  },
  getCashFlows: (
    params: FinancialReportFilters
  ): Promise<CashFlowDocsResponse> => {
    return apiClient.get("/reports/financial/cashflows", params);
  },
  exportExcel: (params: FinancialReportFilters) => {
    const url = new URL(`${API_URL}/reports/financial/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `bao-cao-tai-chinh_${Date.now()}.xlsx`);
  },

  exportDetail: (params: FinancialReportFilters) => {
    const url = new URL(`${API_URL}/reports/financial/cashflows/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `chi-tiet-thu-chi_${Date.now()}.xlsx`);
  },
};

// ─── Nhóm báo cáo Cuối ngày (EndOfDay) ───
export type EodViewType = "Synthetic" | "Document" | "CashFlow" | "Product";

export interface EodReportFilters {
  viewType?: EodViewType;
  date?: string;
  branchId?: number;
  page?: number;
  limit?: number;
}

export interface EodSyntheticResponse {
  viewType: "Synthetic";
  date: string;
  metrics: {
    invoiceCount: number;
    revenue: number;
    returnCount: number;
    returnAmount: number;
    netRevenue: number;
    cashReceipt: number;
    cashPayment: number;
    cashNet: number;
    purchaseCount: number;
    purchaseTotal: number;
  };
}

export interface EodDocumentRow {
  id: number;
  code: string;
  purchaseDate: string;
  soldByName: string | null;
  customerName: string;
  grandTotal: number;
}

export interface EodCashRow {
  id: number;
  code: string;
  transDate: string;
  isReceipt: boolean;
  amount: number;
  partnerName: string | null;
  groupName: string | null;
}

export interface EodProductRow {
  code: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface EodDocumentResponse {
  viewType: "Document";
  data: EodDocumentRow[];
  total: number;
  page: number;
  limit: number;
  summary: { totalInvoices: number; totalRevenue: number };
}

export interface EodCashResponse {
  viewType: "CashFlow";
  data: EodCashRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalDocuments: number;
    totalReceipt: number;
    totalPayment: number;
  };
}

export interface EodProductResponse {
  viewType: "Product";
  data: EodProductRow[];
  total: number;
  summary: { totalRows: number; totalQuantity: number; totalRevenue: number };
}

export type EodPreviewResponse =
  | EodSyntheticResponse
  | EodDocumentResponse
  | EodCashResponse
  | EodProductResponse;

export const eodReportApi = {
  getPreview: (params: EodReportFilters): Promise<EodPreviewResponse> => {
    return apiClient.get("/reports/eod/preview", params);
  },
  exportExcel: (params: EodReportFilters) => {
    const url = new URL(`${API_URL}/reports/eod/export`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return downloadReportFile(url, `bao-cao-cuoi-ngay_${Date.now()}.xlsx`);
  },
};

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

  getCustomerSalesChart: (
    params: ReportFilters
  ): Promise<CustomerChartRow[]> => {
    return apiClient.get("/reports/customer-sales/chart", params);
  },

  getProductByCustomerChart: (
    params: ReportFilters
  ): Promise<CustomerChartRow[]> => {
    return apiClient.get("/reports/product-by-customer/chart", params);
  },

  getCustomerDebtChart: (
    params: ReportFilters
  ): Promise<CustomerChartRow[]> => {
    return apiClient.get("/reports/customer-debt/chart", params);
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
