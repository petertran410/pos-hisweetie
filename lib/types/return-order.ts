export interface ReturnOrderDetail {
  id: number;
  returnOrderId: number;
  invoiceId: number;
  invoiceCode: string;
  productId: number;
  productCode: string;
  productName: string;
  invoiceQuantity: number;
  invoicePrice: number;
  requestQuantity: number;
  confirmedQuantity: number;
  returnPrice: number;
  totalAmount: number;
  note?: string;
  goodQuantity: number;
  damagedQuantity: number;
  nearExpiryQuantity: number;
  product?: {
    id: number;
    code: string;
    name: string;
    images?: string;
  };
}

export interface ReturnOrder {
  id: number;
  code: string;
  invoiceId: number;
  customerId?: number;
  parentCustomerId?: number;
  branchId: number;
  status: number;
  statusValue?: string;
  totalReturnAmount: number;
  refundAmount: number;
  refundType?: string;
  refundedAmount: number;
  note?: string;
  receivedById?: number;
  receivedByName?: string;
  createdBy: number;
  createdByName?: string;
  confirmedBy?: number;
  confirmedByName?: string;
  confirmedAt?: string;
  refundConfirmedBy?: number;
  refundConfirmedByName?: string;
  refundConfirmedAt?: string;
  customerDebtSnapshot?: number;
  createdAt: string;
  updatedAt: string;
  invoice?: any;
  customer?: any;
  parentCustomer?: any;
  branch?: any;
  creator?: any;
  receivedBy?: any;
  images?: string;
  stockImages?: string;
  details?: ReturnOrderDetail[];
}
