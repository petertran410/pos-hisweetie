export interface Customer {
  id: number;
  code: string;
  name: string;
  gender?: boolean;
  birthDate?: string;
  contactNumber?: string;
  phone?: string;
  facebook?: string;
  zalo?: string;
  address?: string;
  locationName?: string;
  cityName?: string;
  wardName?: string;
  email?: string;
  type: number;
  organization?: string;
  taxCode?: string;
  comments?: string;
  customerTypeId?: number;
  branchId?: number;
  totalPurchased: number;
  totalDebt: number;
  totalInvoiced: number;
  totalPoint: number;
  totalRevenue: number;
  rewardPoint: number;
  psidFacebook?: string;
  isWalkIn: boolean;
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

  // Extended filters
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
