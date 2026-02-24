export interface PackingHang {
  id: number;
  code: string;
  branchId: number;
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
  invoices?: PackingHangInvoice[];
  images?: PackingHangImage[];
}

export interface PackingHangInvoice {
  id: number;
  packingHangId: number;
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

export interface PackingHangImage {
  id: number;
  packingHangId: number;
  imageUrl: string;
}
