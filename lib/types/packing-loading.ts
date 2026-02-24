export interface PackingLoading {
  id: number;
  code: string;
  branchId: number;
  loadingById: number;
  numberOfPackages: number;
  note?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  loadingBy?: {
    id: number;
    name: string;
  };
  invoices?: PackingLoadingInvoice[];
  images?: PackingLoadingImage[];
}

export interface PackingLoadingInvoice {
  id: number;
  packingLoadingId: number;
  invoiceId: number;
  invoice?: {
    id: number;
    code: string;
    customerId: number;
    purchaseDate: string;
    grandTotal: number;
    customer?: {
      id: number;
      name: string;
      contactNumber?: string;
    };
  };
}

export interface PackingLoadingImage {
  id: number;
  packingLoadingId: number;
  imageUrl: string;
}
