export interface StockAuditDetail {
  id: number;
  stockAuditId: number;
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  costAtCheck: number;
  differenceValue: number;
  note?: string;
  product?: { id: number; code: string; name: string; unit?: string };
}

export interface StockAudit {
  id: number;
  code: string;
  branchId: number;
  branchName: string;
  checkDate: string;
  note?: string;
  status: number; // 1=DRAFT, 2=COMPLETED, 3=CANCELLED
  createdById: number;
  createdByName: string;
  completedById?: number;
  completedByName?: string;
  completedAt?: string;
  createdAt: string;
  branch?: { id: number; name: string; isActive: boolean };
  creator?: { id: number; name: string };
  completedBy?: { id: number; name: string };
  details: StockAuditDetail[];
}

export interface StockAuditsResponse {
  data: StockAudit[];
  total: number;
  page: number;
  limit: number;
}

export interface StockAuditQueryParams {
  search?: string;
  branchId?: number;
  branchIds?: string;
  status?: number;
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  creatorId?: number;
  details: StockAuditDetail[];
}

export interface CreateStockAuditItem {
  productId: number;
  actualQuantity: number;
  note?: string;
}

export interface CreateStockAuditDto {
  branchId: number;
  checkDate?: string;
  note?: string;
  items: CreateStockAuditItem[];
}

export interface UpdateStockAuditDto {
  checkDate?: string;
  note?: string;
  items?: CreateStockAuditItem[];
}
