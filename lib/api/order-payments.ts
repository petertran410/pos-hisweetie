import { apiClient } from "../config/api";

export interface OrderPayment {
  id: number;
  code: string;
  orderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  description: string;
  creator: {
    id: number;
    name: string;
  };
}

export interface CreateOrderPaymentDto {
  orderId: number;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
}

export const orderPaymentsApi = {
  getPaymentsByOrder: (orderId: number): Promise<OrderPayment[]> => {
    return apiClient.get(`/order-payments/order/${orderId}`);
  },

  createPayment: (data: CreateOrderPaymentDto): Promise<OrderPayment> => {
    return apiClient.post("/order-payments", data);
  },

  deletePayment: (id: number): Promise<void> => {
    return apiClient.delete(`/order-payments/${id}`);
  },
};
