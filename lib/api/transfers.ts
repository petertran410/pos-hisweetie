import { api } from "./client";

export interface TransferDetail {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  sendQuantity: number;
  receivedQuantity: number;
  sendPrice: number;
  receivePrice: number;
  totalTransfer: number;
  totalReceive: number;
}

export interface Transfer {
  id: number;
  code: string;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  status: number;
  transferredDate?: string;
  receivedDate?: string;
  createdById: number;
  createdByName: string;
  noteBySource?: string;
  noteByDestination?: string;
  totalTransfer: number;
  totalReceive: number;
  details: TransferDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface TransferQueryParams {
  fromBranchIds?: number[];
  toBranchIds?: number[];
  status?: number[];
  pageSize?: number;
  currentItem?: number;
  fromReceivedDate?: string;
  toReceivedDate?: string;
  fromTransferDate?: string;
  toTransferDate?: string;
}

export interface CreateTransferData {
  fromBranchId: number;
  toBranchId: number;
  isDraft?: boolean;
  code?: string;
  description?: string;
  status?: number;
  transferDetails: {
    productCode: string;
    productId: number;
    sendQuantity: number;
    receivedQuantity?: number;
    price: number;
  }[];
}

export const transfersApi = {
  getAll: (params?: TransferQueryParams) =>
    api.get<{ total: number; pageSize: number; data: Transfer[] }>(
      "/transfers",
      { params }
    ),

  getById: (id: number) => api.get<Transfer>(`/transfers/${id}`),

  create: (data: CreateTransferData) => api.post<Transfer>("/transfers", data),

  update: (id: number, data: Partial<CreateTransferData>) =>
    api.put<Transfer>(`/transfers/${id}`, data),

  delete: (id: number) => api.delete(`/transfers/${id}`),
};
