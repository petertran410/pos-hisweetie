export interface Customer {
  id: number;
  code: string;
  name: string;
  gender?: boolean;
  birthDate?: string;
  contactNumber?: string;
  phone?: string;
  email?: string;
  cityCode?: string;
  cityName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  address?: string;
  locationName?: string;
  type: number;
  organization?: string;
  taxCode?: string;
  comments?: string;
  invoiceBuyerName?: string;
  invoiceCityCode?: string;
  invoiceCityName?: string;
  invoiceWardCode?: string;
  invoiceWardName?: string;
  invoiceAddress?: string;
  invoiceCccdCmnd?: string;
  invoiceBankAccount?: string;
  invoiceEmail?: string;
  invoicePhone?: string;
  invoiceDvqhnsCode?: string;
  customerTypeId?: number;
  branchId?: number;
  totalPurchased: number;
  totalDebt: number;
  totalInvoiced: number;
  totalPoint: number;
  totalRevenue: number;
  rewardPoint: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customerType?: {
    id: number;
    name: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  customerGroupDetails?: Array<{
    id: number;
    customerId: number;
    customerGroupId: number;
    groupId: number;
    customerGroup: {
      id: number;
      name: string;
    };
  }>;
}

export interface CustomerFilters {
  code?: string;
  name?: string;
  contactNumber?: string;
  lastModifiedFrom?: string;
  pageSize?: number;
  currentItem?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  includeRemoveIds?: boolean;
  includeTotal?: boolean;
  includeCustomerGroup?: boolean;
  birthDate?: string;
  groupId?: number;
  includeCustomerSocial?: boolean;
  customerType?: "all" | "individual" | "company";
  gender?: "all" | "male" | "female";
  branchId?: number;
  createdBy?: number;
  createdDateFrom?: string;
  createdDateTo?: string;
  birthdayFrom?: string;
  birthdayTo?: string;
  lastTransactionFrom?: string;
  lastTransactionTo?: string;
  totalPurchasedFrom?: number;
  totalPurchasedTo?: number;
  debtFrom?: number;
  debtTo?: number;
  debtDaysFrom?: number;
  debtDaysTo?: number;
  pointFrom?: number;
  pointTo?: number;
  isActive?: boolean;
}

export interface CustomerGroup {
  id: number;
  name: string;
  description?: string;
  createdBy?: number;
  createdAt: string;
}
