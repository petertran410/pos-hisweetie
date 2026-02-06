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

export function useDeleteCustomerGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerGroupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Xóa nhóm khách hàng thành công");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Xóa nhóm khách hàng thất bại");
    },
  });
}
