import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { subcontractOrdersApi } from "../api/subcontract-orders";
import type {
  SubcontractCostInput,
  SubcontractOrderFilters,
  SubcontractOrderInput,
  SubcontractPaymentInput,
} from "../types/subcontract-order";

const KEY = "subcontract-orders";

export function useSubcontractOrders(params?: SubcontractOrderFilters) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => subcontractOrdersApi.getAll(params),
  });
}

export function useSubcontractOrder(id: number) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: () => subcontractOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useMaterialsAtFactory(
  params?: { supplierId?: number; factoryId?: number; productId?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: [KEY, "at-factory", params],
    queryFn: () => subcontractOrdersApi.getAtFactory(params),
    enabled,
  });
}

export function useSubcontractCostPreview(id: number, enabled = true) {
  return useQuery({
    queryKey: [KEY, id, "cost-preview"],
    queryFn: () => subcontractOrdersApi.getCostPreview(id),
    enabled: !!id && enabled,
    // Tồn kho và giá vốn có thể đổi bất cứ lúc nào → luôn lấy số mới khi mở.
    staleTime: 0,
  });
}

/**
 * Mọi thao tác trên lệnh đều đổi tồn kho, công nợ NCC hoặc sổ quỹ, nên dùng
 * chung một bộ invalidate thay vì mỗi mutation tự liệt kê.
 */
function useOrderMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  successMessage: string,
  options?: { silentError?: boolean },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      if (!options?.silentError) toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export const useCreateSubcontractOrder = () =>
  useOrderMutation(
    (data: SubcontractOrderInput) => subcontractOrdersApi.create(data),
    "Tạo lệnh gia công thành công",
  );

export const useUpdateSubcontractOrder = () =>
  useOrderMutation(
    ({ id, data }: { id: number; data: Partial<SubcontractOrderInput> }) =>
      subcontractOrdersApi.update(id, data),
    "Cập nhật lệnh gia công thành công",
  );

export const useSendSubcontractMaterials = () =>
  useOrderMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof subcontractOrdersApi.send>[1];
    }) => subcontractOrdersApi.send(id, data),
    "Đã xuất nguyên liệu gửi nhà máy",
  );

export const useCreateSubcontractReceipt = () =>
  useOrderMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof subcontractOrdersApi.createReceipt>[1];
    }) => subcontractOrdersApi.createReceipt(id, data),
    "Đã nhập thành phẩm vào kho",
  );

export const useCancelSubcontractReceipt = () =>
  useOrderMutation(
    ({ id, receiptId }: { id: number; receiptId: number }) =>
      subcontractOrdersApi.cancelReceipt(id, receiptId),
    "Đã hủy đợt nhập",
  );

export const useSaveSubcontractCost = () =>
  useOrderMutation(
    ({
      id,
      costId,
      data,
    }: {
      id: number;
      costId?: number;
      data: SubcontractCostInput;
    }) =>
      costId
        ? subcontractOrdersApi.updateCost(id, costId, data)
        : subcontractOrdersApi.addCost(id, data),
    "Đã lưu chi phí",
  );

export const useRemoveSubcontractCost = () =>
  useOrderMutation(
    ({ id, costId }: { id: number; costId: number }) =>
      subcontractOrdersApi.removeCost(id, costId),
    "Đã xóa chi phí",
  );

export const useCompleteSubcontractOrder = () =>
  useOrderMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof subcontractOrdersApi.complete>[1];
    }) => subcontractOrdersApi.complete(id, data),
    "Đã hoàn thành lệnh gia công",
  );

export const useCancelSubcontractOrder = () =>
  useOrderMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: { reason?: string; cancelPayments?: boolean };
    }) => subcontractOrdersApi.cancel(id, data),
    "Đã hủy lệnh gia công",
  );

export const useApplySubcontractCost = () =>
  useOrderMutation(
    ({
      id,
      data,
    }: {
      id: number;
      data: Parameters<typeof subcontractOrdersApi.applyCost>[1];
    }) => subcontractOrdersApi.applyCost(id, data),
    "Đã cập nhật giá vốn thành phẩm",
  );

// Lỗi 409 (trả vượt số còn nợ) do nơi gọi tự xử lý bằng hộp xác nhận, nên
// hook không tự hiện toast lỗi.
export const useCreateSubcontractPayment = () =>
  useOrderMutation(
    ({ id, data }: { id: number; data: SubcontractPaymentInput }) =>
      subcontractOrdersApi.createPayment(id, data),
    "Thanh toán thành công",
    { silentError: true },
  );

export const useRemoveSubcontractPayment = () =>
  useOrderMutation(
    ({ id, paymentId }: { id: number; paymentId: number }) =>
      subcontractOrdersApi.removePayment(id, paymentId),
    "Đã hủy thanh toán",
  );
