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

  /**
   * Tổng số "Khách đặt" cho từng sản phẩm — chỉ tính các đơn ở
   * trạng thái Phiếu tạm hoặc Đã xác nhận trên mọi chi nhánh.
   * Trả về object: { [productId]: totalQuantity }
   */
  getPendingSummary: (
    productIds: number[]
  ): Promise<Record<number, number>> => {
    if (!productIds || productIds.length === 0) {
      return Promise.resolve({});
    }
    return apiClient.get(`/orders/pending-summary`, {
      productIds: productIds.join(","),
    });
  },

  /**
   * Danh sách đơn hàng (Phiếu tạm/Đã xác nhận, mọi chi nhánh) chứa
   * sản phẩm cụ thể — dùng cho modal khi click vào số "Khách đặt".
   */
  getPendingByProduct: (
    productId: number
  ): Promise<
    Array<{
      orderId: number;
      code: string;
      createdAt: string;
      orderDate: string;
      grandTotal: number;
      status: number;
      statusValue: string;
      orderStatus: string;
      quantity: number;
      customer: { id: number; code?: string; name: string } | null;
      creator: { id: number; name: string } | null;
      branch: { id: number; name: string } | null;
    }>
  > => {
    return apiClient.get(`/orders/pending-by-product`, { productId });
  },
};
