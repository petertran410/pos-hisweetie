import { apiClient } from "@/lib/config/api";

export interface CreateInvoiceDto {
  customerId: number;
  branchId?: number;
  saleChannelId?: number;
  purchaseDate?: string;
  discountAmount?: number;
  discountRatio?: number;
  totalPayment?: number;
  usingCod?: boolean;
  notes?: string;
  items: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountRatio?: number;
    note?: string;
    serialNumbers?: string;
  }>;
  delivery?: {
    receiver?: string;
    contactNumber?: string;
    address?: string;
    locationName?: string;
    wardName?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    partnerDeliveryId?: number;
  };
}

export const invoicesApi = {
  getInvoices: async (params?: any) => {
    const response = await apiClient.get("/invoices", params);
    return response;
  },

  getInvoice: async (id: number) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response;
  },

  createInvoice: async (data: CreateInvoiceDto) => {
    const response = await apiClient.post("/invoices", data);
    return response;
  },

  updateInvoice: async (id: number, data: any) => {
    const response = await apiClient.put(`/invoices/${id}`, data);
    return response;
  },

  deleteInvoice: async (id: number) => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response;
  },
};
