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
}

export interface CashFlowStats {
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
}
