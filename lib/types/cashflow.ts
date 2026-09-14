export interface CashFlow {
  id: number;
  code: string;
  branchId?: number;
  branchName?: string;
  cashFlowGroupId?: number;
  cashFlowGroupName?: string;
  collectionBranchName?: string;
  isReceipt: boolean;
  amount: number;
  currency?: string | null;
  exchangeRate?: number | null;
  foreignAmount?: number | null;
  transDate: string;
  method: string;
  accountId?: number;
  accountName?: string;
  partnerType?: string;
  partnerId?: number;
  partnerName?: string;
  contactNumber?: string;
  address?: string;
  wardName?: string;
  description?: string;
  sepayReferenceCode?: string;
  status: number;
  statusValue?: string;
  usedForFinancialReporting?: number;
  createdBy: number;
  creatorName?: string;
  collectorName?: string;
  collectorUserId?: number;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: number;
    name: string;
  };
  cashFlowGroup?: {
    id: number;
    name: string;
  };
  account?: {
    id: number;
    bankName: string;
    bankCode: string;
    accountNumber: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  collector?: {
    id: number;
    name: string;
  };
  customer?: {
    id: number;
    code: string | null;
    name: string;
    contactNumber: string | null;
    address: string | null;
    totalDebt: string;
    invoiceAddress: string | "";
    invoiceCityName: string | "";
    invoiceWardName: string | "";
  };
  supplier?: {
    id: number;
    code: string | null;
    name: string;
    contactNumber: string | null;
    address: string | null;
    totalDebt: string;
  };
}

export interface CashFlowsResponse {
  data: CashFlow[];
  total: number;
  pageSize: number;
  summary?: CashFlowSummary;
}

export interface CashFlowRelatedPaymentsResponse {
  invoicePayments?: Array<Record<string, unknown>>;
  orderPayments?: Array<Record<string, unknown>>;
  debtOffsets?: Array<Record<string, unknown>>;
  purchaseOrderPayments?: Array<Record<string, unknown>>;
  orderSupplierPayments?: Array<Record<string, unknown>>;
}

export type CashFlowMutationPayload = Record<string, unknown>;

export interface CashFlowSummary {
  openingBalance: number;
  totalReceipt: number;
  totalPayment: number;
  closingBalance: number;
}

export interface CashFlowQueryParams {
  branchIds?: number[];
  code?: string[];
  userIds?: number[];
  accountId?: number;
  accountIds?: number[];
  partnerType?: string;
  partnerId?: number;
  invoiceId?: number;
  method?: string[];
  cashFlowGroupId?: number[];
  usedForFinancialReporting?: number;
  partnerName?: string;
  contactNumber?: string;
  isReceipt?: boolean;
  startDate?: string;
  endDate?: string;
  status?: number;
  ids?: number[];
  pageSize?: number;
  currentItem?: number;
  limit?: number;
  sortOrder?: string;
  search?: string;
  includeSummary?: boolean;
}

export type CashFlowStats = CashFlowSummary;
