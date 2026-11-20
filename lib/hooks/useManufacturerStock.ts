import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  manufacturerStockApi,
  type ManufacturerStockSlip,
  type ManufacturerStockSlipInput,
} from "@/lib/api/manufacturer-stock";

export function useManufacturerStock(manufacturerId?: number | null) {
  return useQuery({
    queryKey: ["manufacturer-stock", manufacturerId],
    queryFn: () => manufacturerStockApi.list(manufacturerId!),
    enabled: !!manufacturerId,
  });
}

export function useManufacturerStockMoves(
  manufacturerId: number,
  productId: number | null,
) {
  return useQuery({
    queryKey: ["manufacturer-stock-moves", manufacturerId, productId],
    queryFn: () => manufacturerStockApi.moves(manufacturerId, productId!),
    enabled: !!productId,
  });
}

export function useManufacturerStockSlips(manufacturerId: number) {
  return useQuery({
    queryKey: ["manufacturer-stock-slips", manufacturerId],
    queryFn: () => manufacturerStockApi.slips(manufacturerId),
  });
}

/** Phiếu NL NSX đổi tồn kho mình, tồn NSX và "NL đang ở NSX" ở công nợ. */
function useStockSlipMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<ManufacturerStockSlip>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      for (const key of [
        "manufacturer-stock",
        "manufacturer-stock-moves",
        "manufacturer-stock-slips",
        "manufacturer-accounts",
        "manufacturers",
        "products",
        "external-product-picker",
        "productions",
        "suppliers",
        "supplier-debt-timeline",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast.success(successMessage);
    },
    onError: (error: Error) => toast.error(error.message || "Có lỗi xảy ra"),
  });
}

export const useCreateManufacturerStockSlip = () =>
  useStockSlipMutation(
    ({
      manufacturerId,
      data,
    }: {
      manufacturerId: number;
      data: ManufacturerStockSlipInput;
    }) => manufacturerStockApi.create(manufacturerId, data),
    "Đã lưu phiếu nguyên liệu NSX",
  );

export const useUpdateManufacturerStockSlip = () =>
  useStockSlipMutation(
    ({ slipId, data }: { slipId: number; data: ManufacturerStockSlipInput }) =>
      manufacturerStockApi.update(slipId, data),
    "Đã cập nhật phiếu nguyên liệu NSX",
  );

export const useCancelManufacturerStockSlip = () =>
  useStockSlipMutation(
    (slipId: number) => manufacturerStockApi.cancel(slipId),
    "Đã hủy phiếu nguyên liệu NSX",
  );
