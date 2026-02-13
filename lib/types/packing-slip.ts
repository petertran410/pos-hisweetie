export interface PackingSlip {
  id: number;
  code: string;
  branchId: number;
  numberOfPackages: number;
  paymentMethod: string;
  cashAmount: number;
  hasFeeGuiBen: boolean;
  feeGuiBen: number;
  hasFeeGrab: boolean;
  feeGrab: number;
  hasCuocGuiHang: boolean;
  cuocGuiHang: number;
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
  invoices?: PackingSlipInvoice[];
  images?: PackingSlipImage[];
}

export interface PackingSlipInvoice {
  id: number;
  packingSlipId: number;
  invoiceId: number;
  invoice?: {
    id: number;
    code: string;
    grandTotal: number;
    customer?: {
      id: number;
      name: string;
      contactNumber?: string;
    };
  };
}

export interface PackingSlipImage {
  id: number;
  packingSlipId: number;
  imageUrl: string;
}
