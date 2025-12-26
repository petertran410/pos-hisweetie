import api from "./config";

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
    const response = await api.get("/invoices", { params });
    return response.data;
  },

  getInvoice: async (id: number) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  createInvoice: async (data: CreateInvoiceDto) => {
    const response = await api.post("/invoices", data);
    return response.data;
  },

  updateInvoice: async (id: number, data: any) => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  deleteInvoice: async (id: number) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },
};
