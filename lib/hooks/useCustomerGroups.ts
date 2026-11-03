import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  customerGroupsApi,
  CreateCustomerGroupDto,
  UpdateCustomerGroupDto,
} from "@/lib/api/customer-groups";
import { toast } from "sonner";

export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: customerGroupsApi.getAll,
  });
}

export function useCustomerGroup(id: number) {
  return useQuery({
    queryKey: ["customer-groups", id],
    queryFn: () => customerGroupsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerGroupDto) =>
      customerGroupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Tạo nhóm khách hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Tạo nhóm khách hàng thất bại");
    },
  });
}

export function useUpdateCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerGroupDto }) =>
      customerGroupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Cập nhật nhóm khách hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Cập nhật nhóm khách hàng thất bại");
    },
  });
}

export function useCancelledCustomerGroups(enabled = true) {
  return useQuery({
    queryKey: ["customer-groups", "cancelled"],
    queryFn: customerGroupsApi.getCancelled,
    enabled,
  });
}

// Hủy nhóm (giữ dữ liệu). removeCustomers = gỡ hết khách khỏi nhóm rồi hủy.
export function useCancelCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      removeCustomers,
    }: {
      id: number;
      removeCustomers: boolean;
    }) => customerGroupsApi.cancel(id, removeCustomers),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(res?.message || "Đã hủy nhóm khách hàng");
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Hủy nhóm khách hàng thất bại");
    },
  });
}

export function useRestoreCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerGroupsApi.restore(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success(res?.message || "Đã khôi phục nhóm khách hàng");
    },
    onError: (error: Error) => {
      toast.error(error?.message || "Khôi phục nhóm khách hàng thất bại");
    },
  });
}
