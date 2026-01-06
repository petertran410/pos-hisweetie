import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/config/api";
import { Customer, CustomerFilters, CustomerGroup } from "@/lib/types/customer";
import { toast } from "sonner";

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: Customer[];
        total: number;
        pageSize: number;
      }>("/customers", filters);
      return response;
    },
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const response = await apiClient.get<Customer>(`/customers/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: CustomerGroup[];
        total: number;
      }>("/customer-groups");
      return response;
    },
  });
}

export function useCustomerDebtTimeline(customerId: number) {
  return useQuery({
    queryKey: ["customers", customerId, "debt-timeline"],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: any[];
      }>(`/customers/${customerId}/debt-timeline`);
      return response;
    },
    enabled: !!customerId,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      return await apiClient.post<Customer>("/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Tạo khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Customer>;
    }) => {
      return await apiClient.put<Customer>(`/customers/${id}`, data);
    },
    onSuccess: (updatedCustomer, variables) => {
      queryClient.setQueryData(["customers", variables.id], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cập nhật khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Xóa khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}
