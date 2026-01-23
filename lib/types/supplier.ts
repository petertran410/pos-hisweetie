export interface Supplier {
  id: number;
  code: string;
  name: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  location?: string;
  wardName?: string;
  taxCode?: string;
  organization?: string;
  comments?: string;
  branchId?: number;
  groups?: string;
  createdBy?: number;
  createdName?: string;
  debt: number;
  totalInvoiced: number;
  totalInvoicedWithoutReturn: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  supplierGroupDetails?: Array<{
    id: number;
    supplierId: number;
    supplierGroupId: number;
    supplierGroup: {
      id: number;
      name: string;
      description?: string;
    };
  }>;
}

export interface SupplierGroup {
  id: number;
  name: string;
  description?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilters {
  code?: string;
  name?: string;
  contactNumber?: string;
  pageSize?: number;
  currentItem?: number;
  orderBy?: string;
  organization?: string;
  orderDirection?: "asc" | "desc";
  includeTotal?: boolean;
  includeSupplierGroup?: boolean;
  groupId?: number;
  branchId?: number;
  createdDateFrom?: string;
  createdDateTo?: string;
  totalInvoicedFrom?: number;
  totalInvoicedTo?: number;
  debtFrom?: number;
  debtTo?: number;
  isActive?: boolean;
}
