import { type } from "os";
import { string, number } from "zod";
import { apiClient } from "../config/api";
import { Order } from "../types/order";

export const ordersApi = {
  getOrders: (params?: Record<string, any>): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
  }> => {
    return apiClient.get("/orders", params);
  },

  getOrder: (id: number): Promise<Order> => {
    return apiClient.get(`/orders/${id}`);
  },

  getProductPriceHistory: (
    customerId: number,
    productId: number,
    type?: "order" | "invoice"
  ): Promise<
    Array<{
      code: string;
      date: string;
      price: number;
      discount: number;
      quantity: number;
      finalPrice: number;
      type: "order" | "invoice";
    }>
  > => {
    const queryParams = new URLSearchParams();
    queryParams.append("customerId", customerId.toString());
    queryParams.append("productId", productId.toString());
    if (type) {
      queryParams.append("type", type);
    }
    return apiClient.get(
      `/orders/product-price-history?${queryParams.toString()}`
    );
  },

  createOrder: (data: Order): Promise<{ order: Order; warnings: any[] }> => {
    return apiClient.post("/orders", data);
  },

  updateOrder: (id: number, data: Partial<Order>): Promise<Order> => {
    return apiClient.put(`/orders/${id}`, data);
  },

  deleteOrder: (id: number): Promise<void> => {
    return apiClient.delete(`/orders/${id}`);
  },

  cancel: (id: number, cancelPayments: boolean): Promise<any> => {
    return apiClient.put(`/orders/${id}/cancel`, { cancelPayments });
  },
};
