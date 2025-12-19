import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  transfersApi,
  type TransferQueryParams,
  type CreateTransferData,
} from "../api/transfers";
import { toast } from "sonner";

export function useTransfers(params?: TransferQueryParams) {
  return useQuery({
    queryKey: ["transfers", params],
    queryFn: () => transfersApi.getAll(params),
  });
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: ["transfers", id],
    queryFn: () => transfersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransferData) => transfersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success("Tạo phiếu chuyển hàng thành công");
    },
    onError: () => {
      toast.error("Không thể tạo phiếu chuyển hàng");
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<CreateTransferData>;
    }) => transfersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success("Cập nhật phiếu chuyển hàng thành công");
    },
    onError: () => {
      toast.error("Không thể cập nhật phiếu chuyển hàng");
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => transfersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      toast.success("Xóa phiếu chuyển hàng thành công");
    },
    onError: () => {
      toast.error("Không thể xóa phiếu chuyển hàng");
    },
  });
}
