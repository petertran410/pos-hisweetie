import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { consignmentReturnsApi } from "../api/consignment-returns";
import { toast } from "sonner";

export function useConsignmentReturns(params?: any) {
  return useQuery({
    queryKey: ["consignment-returns", params],
    queryFn: () => consignmentReturnsApi.getAll(params),
  });
}

export function useConsignmentReturn(id: number) {
  return useQuery({
    queryKey: ["consignment-returns", id],
    queryFn: () => consignmentReturnsApi.getById(id),
    enabled: !!id,
  });
}

export function useReturnableByConsignment(consignmentId?: number) {
  return useQuery({
    queryKey: ["consignment-returns", "returnable", consignmentId],
    queryFn: () => consignmentReturnsApi.getReturnable(consignmentId as number),
    enabled: !!consignmentId,
  });
}

export function useCreateConsignmentReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: consignmentReturnsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignment-returns"] });
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      toast.success("Tạo phiếu hoàn hàng ký gửi thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Tạo phiếu hoàn hàng ký gửi thất bại");
    },
  });
}

export function useConfirmConsignmentReturnStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => consignmentReturnsApi.confirmStock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignment-returns"] });
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      toast.success("Xác nhận nhận hàng hoàn thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Xác nhận nhận hàng hoàn thất bại");
    },
  });
}

export function useCancelConsignmentReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => consignmentReturnsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignment-returns"] });
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      toast.success("Hủy phiếu hoàn hàng ký gửi thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Hủy phiếu hoàn hàng ký gửi thất bại");
    },
  });
}
