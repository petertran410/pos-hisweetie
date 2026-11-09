import type { ColdCargoWarning } from "./cold-cargo-warning";
import type { InvoicePaymentNote } from "./invoice";
import type { PackingCashWarning } from "@/lib/packing/payment-note";

export interface PackingSlip extends ColdCargoWarning {
  id: number;
  code: string;
  branchId: number;
  numberOfPackages: number;
  paymentMethod: string;
  cashAmount: number;
  hasFeeGuiBen: boolean;
  feeGuiBen: number;
  hasFeeGrab: boolean;
  feeGrab: number;
  hasCuocGuiHang: boolean;
  cuocGuiHang: number;
  hasCuocNhanHang: boolean;
  cuocNhanHang: number;
  expensePayerId?: number | null;
  note?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancelledById?: number | null;
  cancelledBy?: {
    id: number;
    name: string;
  } | null;
  /** Phiếu lệch tiền mặt so với ghi chú thanh toán của hóa đơn (backend tính). */
  cashWarning?: PackingCashWarning | null;
  type?: string;
  branch?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  expensePayer?: {
    id: number;
    name: string;
  } | null;
  invoices?: PackingSlipInvoice[];
  images?: PackingSlipImage[];
  expenseFiles?: PackingSlipExpenseFile[];
}

export interface PackingSlipInvoice {
  id: number;
  packingSlipId: number;
  invoiceId: number;
  invoice?: {
    id: number;
    code: string;
    grandTotal: number;
    customer?: {
      id: number;
      name: string;
      contactNumber?: string;
    };
    /** Ghi chú thanh toán mới nhất (danh sách báo đơn trả về). */
    paymentNote?: InvoicePaymentNote | null;
  };
}

export interface PackingSlipImage {
  id: number;
  packingSlipId: number;
  imageUrl: string;
}

export interface PackingSlipExpenseFile {
  id: number;
  packingSlipId: number;
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}
