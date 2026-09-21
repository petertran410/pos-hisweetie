import type { Product } from '@/lib/api/products';

export type CustomerDemandStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type CustomerDemandUnit = 'BASE' | 'CARTON';
export type CustomerDemandSortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'id'
  | 'customerName';
export type CustomerDemandSortOrder = 'asc' | 'desc';

export const CUSTOMER_DEMAND_STATUS_LABEL: Record<CustomerDemandStatus, string> = {
  DRAFT: 'Nháp',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

export interface CustomerDemandLineInput {
  id?: number;
  productId: number;
  quantity: number;
  unit: CustomerDemandUnit;
}

export interface CustomerDemandMonthInput {
  id?: number;
  month: string;
  lines: CustomerDemandLineInput[];
  changeNote?: string;
}

export interface CustomerDemandLine {
  id: number;
  productId: number;
  product: Pick<Product, 'id' | 'code' | 'name' | 'unit' | 'conversionValue'>;
  inputQuantity: number;
  inputUnit: CustomerDemandUnit;
  quantityBase: number;
  conversionValue: number;
  sourceCreatedAt?: string | null;
  sourceUpdatedAt?: string | null;
}

export interface CustomerDemandChangeLog {
  id: number;
  action: 'EDIT' | 'APPROVE' | 'CANCEL' | string;
  reason: string;
  createdAt: string;
  actor?: { id: number; name: string; email?: string | null } | null;
}

export interface CustomerDemandMonth {
  id: number;
  month: string;
  status: CustomerDemandStatus;
  note?: string | null;
  approvedAt?: string | null;
  cancelledAt?: string | null;
  quantityBase?: number;
  productCount?: number;
  lines?: CustomerDemandLine[];
  changeLogs?: CustomerDemandChangeLog[];
}

export interface CustomerDemand {
  id: number;
  sourceSystem?: string | null;
  hasSourceDates?: boolean;
  customer: { id: number; code?: string | null; name: string };
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  totalProducts: number;
  totalQuantityBase: number;
  months: CustomerDemandMonth[];
}

export interface CustomerDemandListResponse {
  data: CustomerDemand[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerDemandFilters {
  customerId?: number;
  month?: string;
  status?: CustomerDemandStatus;
  sortBy?: CustomerDemandSortBy;
  sortOrder?: CustomerDemandSortOrder;
  page?: number;
  limit?: number;
}

export interface CreateCustomerDemandRequest {
  customerId: number;
  note?: string;
  months: CustomerDemandMonthInput[];
}

export interface UpdateCustomerDemandRequest {
  customerId?: number;
  note?: string;
  months: CustomerDemandMonthInput[];
}

export interface UpdateCustomerDemandMonthRequest {
  customerId?: number;
  month?: string;
  lines: CustomerDemandLineInput[];
  changeNote?: string;
  note?: string;
}

export interface CustomerDemandImportPreviewRow {
  row: number;
  customerCode: string;
  customerName: string;
  productCode: string;
  productName: string;
  month: string | null;
  quantity: number | null;
  unit: CustomerDemandUnit;
  note?: string;
  errors: string[];
  voucherIndex?: number;
  customer: { id: number; code?: string | null; name: string } | null;
  product: {
    id: number;
    code: string;
    name: string;
    unit?: string | null;
    conversionValue: number;
  } | null;
  quantityBase: number | null;
}

export interface CustomerDemandImportPreview {
  total: number;
  valid: number;
  invalid: number;
  vouchers: number;
  months: number;
  rows: CustomerDemandImportPreviewRow[];
}

export interface CustomerDemandImportResult {
  total: number;
  imported: number;
  vouchers: number;
  months: number;
  ids: number[];
}

export type CustomerDemandLarkSyncIssueCode =
  | "MISSING_CUSTOMER"
  | "MISSING_PRODUCT"
  | "MISSING_MONTH"
  | "MISSING_QUANTITY"
  | "MISSING_CONVERSION"
  | "MISSING_SOURCE_TIMESTAMP"
  | "LEGACY_MERGED_VOUCHER"
  | "LINE_CONFLICT";

export interface CustomerDemandLarkSyncIssue {
  sourceRecordId: string;
  customerCode: string | null;
  customerName: string | null;
  productCode: string | null;
  productName: string | null;
  month: string | null;
  quantity: number | null;
  code: CustomerDemandLarkSyncIssueCode;
  message: string;
}

export interface CustomerDemandLarkSyncPreview {
  totalRecords: number;
  validRecords: number;
  pendingRecords: number;
  invalidTimestampRecords: number;
  conflictedRecords: number;
  mergedRecords: number;
  aggregatedRows: number;
  newLines: number;
  updatedLines: number;
  demandsToCreate: number;
  monthsToCreate: number;
  sourceDatesToRestore: number;
  legacyMergedRecords: number;
  legacyMergedLines: number;
  legacyVouchers: number;
  legacyVoucherRecords: number;
  issues: CustomerDemandLarkSyncIssue[];
  truncatedIssues: boolean;
}

export interface CustomerDemandLarkSyncResult
  extends CustomerDemandLarkSyncPreview {
  syncedDemands: number;
  syncedLines: number;
  syncedRecords: number;
  unmappedRecords: number;
  orphanedRecords: number;
  syncedAt: string;
}

export interface CustomerDemandLarkSyncStatus {
  counts: Partial<
    Record<"SYNCED" | "PENDING_MAPPING" | "ORPHANED" | "ERROR", number>
  >;
  synced: number;
  pendingMapping: number;
  orphaned: number;
  error: number;
  lastSyncedAt: string | null;
  isConfigured: boolean;
}

export interface CustomerDemandLarkVoucherSplitIssue {
  demandId: number;
  demandMonthId: number | null;
  sourceRecordIds: string[];
  customerName: string | null;
  month: string | null;
  lineCount: number;
  message: string;
}

export interface CustomerDemandLarkVoucherSplitPreview {
  totalMappedRecords: number;
  totalLarkVouchers: number;
  vouchersToSplit: number;
  vouchersToCreate: number;
  linesToMove: number;
  readyVouchers: number;
  conflictedVouchers: number;
  quantityBaseBefore: number;
  quantityBaseAfter: number;
  issues: CustomerDemandLarkVoucherSplitIssue[];
}

export interface CustomerDemandLarkVoucherSplitResult
  extends CustomerDemandLarkVoucherSplitPreview {
  vouchersSplit: number;
  vouchersCreated: number;
  linesMoved: number;
  splitAt: string;
}
