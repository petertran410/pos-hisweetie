import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "../api/invoices";
import { toast } from "sonner";
import { apiClient } from "../config/api";
import { useSandboxStore } from "../store/sandbox";
import { useSandboxDataStore } from "../store/sandbox-data";
import { sandboxQuery } from "../utils/sandbox-filters";

export function useInvoices(params?: any) {
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useQuery({
    queryKey: ["invoices", params, isSandbox],
    queryFn: () => {
      if (isSandbox) {
        const items = useSandboxDataStore.getState().getEntities("invoices");
        return sandboxQuery(items, params);
      }
      return invoicesApi.getInvoices(params);
    },
  });
}

export function useInvoice(id: number) {
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useQuery({
    queryKey: ["invoices", id, isSandbox],
    queryFn: () => {
      if (isSandbox) {
        const items = useSandboxDataStore.getState().getEntities("invoices");
        const found = items.find((inv: any) => inv.id === id);
        if (!found) throw new Error("Không tìm thấy hóa đơn sandbox");
        return found;
      }
      return invoicesApi.getInvoice(id);
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: (data: any) => {
      if (isSandbox) {
        const newInvoice = useSandboxDataStore
          .getState()
          .addEntity("invoices", {
            ...data,
            status: 1,
            statusValue: "Hoàn thành",
            totalAmount: data.grandTotal || 0,
            paidAmount: data.paidAmount || 0,
            debtAmount: (data.grandTotal || 0) - (data.paidAmount || 0),
            customer: data._customer || null,
            branch: data._branch || null,
            soldBy: data._soldBy || null,
            creator: data._creator || null,
            details: data.items || [],
            payments: [],
          });
        return Promise.resolve(newInvoice);
      }
      return invoicesApi.createInvoice(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(
        isSandbox ? "Tạo hóa đơn sandbox thành công" : "Tạo hóa đơn thành công"
      );
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo hóa đơn thất bại");
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      if (isSandbox) {
        useSandboxDataStore.getState().updateEntity("invoices", id, data);
        return Promise.resolve(data);
      }
      return invoicesApi.updateInvoice(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật hóa đơn thất bại");
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Xóa hóa đơn thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa hóa đơn thất bại");
    },
  });
}

export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();
  const isSandbox = useSandboxStore((s) => s.isSandbox);

  return useMutation({
    mutationFn: ({
      orderId,
      additionalPayment,
      items,
      payments,
    }: {
      orderId: number;
      additionalPayment?: number;
      items?: any[];
      payments?: Array<{ method: string; amount: number }>;
    }) => {
      if (isSandbox) {
        // Tìm order sandbox → tạo invoice sandbox từ dữ liệu order
        const orders = useSandboxDataStore.getState().getEntities("orders");
        const order = orders.find((o: any) => o.id === orderId);
        const total =
          items?.reduce((sum, i) => sum + (Number(i.totalPrice) || 0), 0) ||
          Number(order?.grandTotal) ||
          0;
        const paid = additionalPayment || 0;

        const newInvoice = useSandboxDataStore
          .getState()
          .addEntity("invoices", {
            customerId: order?.customerId,
            branchId: order?.branchId,
            soldById: order?.soldById,
            purchaseDate: new Date().toISOString(),
            totalAmount: total,
            discount: 0,
            discountRatio: 0,
            grandTotal: total,
            paidAmount: paid,
            debtAmount: total - paid,
            status: paid >= total ? 1 : 3,
            statusValue: paid >= total ? "Hoàn thành" : "Đang xử lý",
            usingCod: false,
            customer: order?.customer,
            branch: order?.branch,
            soldBy: order?.soldBy,
            creator: order?.creator,
            details: items || order?.items || [],
            payments: [],
          });

        // Cập nhật trạng thái order
        useSandboxDataStore.getState().updateEntity("orders", orderId, {
          status: 3,
          statusValue: "Hoàn thành",
          orderStatus: "completed",
          invoiceId: newInvoice.id,
          invoiceCode: newInvoice.code,
        });

        return Promise.resolve(newInvoice);
      }
      return invoicesApi.createInvoiceFromOrder(
        orderId,
        additionalPayment,
        items,
        payments
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo hóa đơn từ đơn hàng thất bại");
    },
  });
}

export function useUnpaidInvoicesByPartner(
  partnerId: number | null,
  partnerType: string
) {
  return useQuery({
    queryKey: ["invoices", "unpaid", partnerId, partnerType],
    queryFn: async () => {
      if (!partnerId || !partnerType) {
        return { data: [] };
      }
      const response = await apiClient.get<{ data: any[] }>(
        "/invoices/unpaid-by-partner",
        {
          partnerId: partnerId.toString(),
          partnerType,
        }
      );
      return response;
    },
    enabled: !!partnerId && !!partnerType,
  });
}

export function useInvoicesForReturnOrder(params: {
  search?: string;
  branchId?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["invoices", "for-return-order", params],
    queryFn: () => invoicesApi.getInvoicesForReturnOrder(params),
  });
}
