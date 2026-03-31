export interface ReturnOrderDetail {
  id: number;
  returnOrderId: number;
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
  details?: ReturnOrderDetail[];
}
