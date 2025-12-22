export interface Order {
  id: number;
  code: string;
  customerId?: number;
  customer?: any;
  branchId?: number;
  branch?: any;
  soldById?: number;
  soldBy?: any;
  orderDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  orderStatus: string;
  paymentStatus: string;
  description?: string;
  items: OrderItem[];
  payments: OrderPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  product?: any;
  productCode: string;
  productName: string;
  quantity: number;
  price: number;
  appliedPrice: number;
  discount: number;
  discountRatio: number;
  totalPrice: number;
  note?: string;
  serialNumbers?: string;
}

export interface OrderPayment {
  id: number;
  code: string;
  orderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  description?: string;
  status: number;
}

export interface CreateOrderDto {
  customerId?: number;
  branchId?: number;
  orderDate?: string;
  discountAmount?: number;
  discountRatio?: number;
  depositAmount?: number;
  notes?: string;
  orderStatus?: string;
  items: {
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountRatio?: number;
    note?: string;
    serialNumbers?: string;
  }[];
}
