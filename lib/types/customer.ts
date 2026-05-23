export interface Customer {
  id: number;
  code: string;
  name: string;
  gender?: boolean;
  birthDate?: string;
  contactNumber?: string;
  phone?: string;
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
  isActive: boolean;

  // Thông tin xuất hóa đơn
  invoiceBuyerName?: string;
  invoiceAddress?: string;
  invoiceCityCode?: string;
  invoiceCityName?: string;
  invoiceWardCode?: string;
  invoiceWardName?: string;
  invoiceCccdCmnd?: string;
  invoiceBankAccount?: string;
  invoiceEmail?: string;
  invoicePhone?: string;
  invoiceDvqhnsCode?: string;

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
  addresses?: CustomerAddress[];
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
  parentId?: number;
  parent?: {
    id: number;
    code: string;
    name: string;
  };
  children?: Array<{
    id: number;
    code: string;
    name: string;
    contactNumber?: string;
    totalDebt: number;
    isActive: boolean;
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

export interface CustomerSearchResult {
  id: number;
  code: string;
  name: string;
  contactNumber?: string;
  phone?: string;
  email?: string;
  totalDebt: number;
  parentId?: number;
  parent?: {
    code: string;
    name: string;
  };

  addresses?: CustomerAddress[];
}

export interface CustomerAddress {
  id?: number;
  customerId?: number;
  label?: string;
  receiver?: string;
  contactNumber?: string;
  address?: string;

  // Địa chỉ cũ (3 cấp)
  cityCode?: string;
  cityName?: string;
  districtCode?: string;
  districtName?: string;
  wardCode?: string;
  wardName?: string;

  // Địa chỉ mới (2 cấp)
  newCityCode?: string;
  newCityName?: string;
  newWardCode?: string;
  newWardName?: string;

  locationName?: string;

  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}
