import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  internalUseReturnsApi,
  type InternalUseReturnQuery,
} from "@/lib/api/internal-use-returns";

const invalidateStock = (queryClient: ReturnType<typeof useQueryClient>) => {
  [
    "condition-summary-batch",
    "product-condition-summary",
    "product-condition-logs",
    "near-expiry-lots",
    "inventory-by-branch",
    "products",
    "product",
    "internal-uses",
  ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
};

export function useInternalUseReturns(params?: InternalUseReturnQuery) {
  return useQuery({
    queryKey: ["internal-use-returns", params],
    queryFn: () => internalUseReturnsApi.getAll(params),
  });
}

export function useInternalUseReturn(id: number) {
  return useQuery({
    queryKey: ["internal-use-returns", id],
    queryFn: () => internalUseReturnsApi.getById(id),
    enabled: !!id,
  });
}

export function useInternalUseReturnable(internalUseId: number) {
  return useQuery({
    queryKey: ["internal-use-returns-returnable", internalUseId],
    queryFn: () => internalUseReturnsApi.getReturnable(internalUseId),
    enabled: !!internalUseId,
  });
}

export function useCreateInternalUseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalUseReturnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-returns"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-use-returns-returnable"],
      });
      toast.success("Tạo phiếu trả xuất dùng nội bộ thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Tạo phiếu trả thất bại");
    },
  });
}

export function useUpdateInternalUseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      internalUseReturnsApi.updateStep1(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-returns"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-use-returns", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["internal-use-returns-returnable"],
      });
      toast.success("Cập nhật phiếu trả thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Cập nhật phiếu trả thất bại");
    },
  });
}

export function useConfirmInternalUseReturnStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      internalUseReturnsApi.confirmStock(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-returns"] });
      queryClient.invalidateQueries({
        queryKey: ["internal-use-returns", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["internal-use-returns-returnable"],
      });
      invalidateStock(queryClient);
      toast.success("Nhập lại kho thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Nhập lại kho thất bại");
    },
  });
}

export function useCancelInternalUseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: internalUseReturnsApi.cancel,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["internal-use-returns"] });
      queryClient.invalidateQueries({ queryKey: ["internal-use-returns", id] });
      queryClient.invalidateQueries({
        queryKey: ["internal-use-returns-returnable"],
      });
      invalidateStock(queryClient);
      toast.success("Hủy phiếu trả thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Hủy phiếu trả thất bại");
    },
  });
}

