import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vehicleShipmentsApi } from "../api/vehicle-shipments";
import type {
  VehicleShipmentFilters,
  CreatePOFromVehicleSection,
} from "../types/vehicle-shipment";
import { toast } from "sonner";

export function useVehicleShipments(params?: VehicleShipmentFilters) {
  return useQuery({
    queryKey: ["vehicle-shipments", params],
    queryFn: () => vehicleShipmentsApi.getAll(params),
  });
}

export function useVehicleShipment(id: number) {
  return useQuery({
    queryKey: ["vehicle-shipments", id],
    queryFn: () => vehicleShipmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useVehicleAvailableItems(branchId?: number) {
  return useQuery({
    queryKey: ["vehicle-shipments-available", branchId ?? null],
    queryFn: () => vehicleShipmentsApi.getAvailableItems(branchId),
    staleTime: 30_000,
  });
}

export function useVehicleShipmentContractNos() {
  return useQuery({
    queryKey: ["vehicle-shipment-contract-nos"],
    queryFn: () => vehicleShipmentsApi.getContractNos(),
    staleTime: 60_000,
  });
}

export function useCreateVehicleShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleShipmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-shipments"] });
      queryClient.invalidateQueries({
        queryKey: ["vehicle-shipments-available"],
      });
      toast.success("Tạo phiếu ghép xe thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu ghép xe thất bại");
    },
  });
}

export function useUpdateVehicleShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      vehicleShipmentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-shipments"] });
      queryClient.invalidateQueries({
        queryKey: ["vehicle-shipments", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["vehicle-shipments-available"],
      });
      toast.success("Cập nhật phiếu ghép xe thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Cập nhật phiếu ghép xe thất bại");
    },
  });
}

export function useCancelVehicleShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vehicleShipmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-shipments"] });
      queryClient.invalidateQueries({
        queryKey: ["vehicle-shipments-available"],
      });
      toast.success("Hủy phiếu ghép xe thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể hủy phiếu ghép xe");
    },
  });
}

export function useCreatePurchaseOrdersFromVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      sections,
    }: {
      id: number;
      sections: CreatePOFromVehicleSection[];
    }) => vehicleShipmentsApi.createPurchaseOrders(id, sections),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-shipments"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      toast.success("Tạo phiếu nhập từ ghép xe thành công");
    },
    onError: (error: any) => {
      toast.error(error.message || "Tạo phiếu nhập từ ghép xe thất bại");
    },
  });
}

export function useResolveVehicleItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      vehicleShipmentItemId,
      action,
    }: {
      id: number;
      vehicleShipmentItemId: number;
      action: string;
    }) =>
      vehicleShipmentsApi.resolveItem(id, {
        vehicleShipmentItemId,
        action,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-shipments"] });
      queryClient.invalidateQueries({
        queryKey: ["vehicle-shipments", variables.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["vehicle-shipments-available"],
      });
      queryClient.invalidateQueries({ queryKey: ["order-suppliers"] });
      const msg =
        variables.action === "returned"
          ? "Đã chuyển phần thiếu về còn lại"
          : variables.action === "kept"
            ? "Đã giữ (bỏ phần thiếu)"
            : "Đã đặt lại về chưa xử lý";
      toast.success(msg);
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể xử lý chênh lệch");
    },
  });
}
