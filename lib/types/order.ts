export interface Order {
  id: number;
  code: string;
  customerId?: number;
  branchId?: number;
  soldById?: number;
  saleChannelId?: number;
  orderDate: string;
  totalAmount: number;
  discount: number;
  discountRatio: number;
  grandTotal: number;
  paidAmount: number;
  debtAmount: number;
  depositAmount: number;
  paymentStatus: string;
  orderStatus: string;
  usingCod: boolean;
  description?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
    code?: string;
    contactNumber?: string;
    phone?: string;
    address?: string;
    cityName?: string;
    wardName?: string;
    birthDate?: string;
  };
  branch?: {
    id: number;
    name: string;
  };
  soldBy?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  saleChannel?: {
    id: number;
    name: string;
  };
  items?: any[];
  payments?: any[];
  delivery?: {
    id: number;
    deliveryCode?: string;
    receiver?: string;
    contactNumber?: string;
    address?: string;
    locationName?: string;
    wardName?: string;
    expectedDelivery?: string;
    partnerDelivery?: {
      id: number;
      name: string;
    };
  };
}

export interface CreateOrderDto {
  customerId?: number;
  branchId?: number;
  saleChannelId?: number;
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
