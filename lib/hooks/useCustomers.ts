import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/config/api";
import {
  Customer,
  CustomerFilters,
  CustomerGroup,
  CustomerSearchResult,
} from "@/lib/types/customer";
import { toast } from "sonner";
import { useAuthStore } from "../store/auth";

export function useCustomers(filters?: CustomerFilters) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

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
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useCustomer(id: number) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers", id],
    queryFn: async () => {
      const response = await apiClient.get<Customer>(`/customers/${id}`);
      return response;
    },
    enabled: !!id && hasHydrated && isAuthenticated,
  });
}

export function useCustomerGroups() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: CustomerGroup[];
        total: number;
      }>("/customer-groups");
      return response;
    },
    enabled: hasHydrated && isAuthenticated,
  });
}

export function useCustomerDebtTimeline(
  customerId: number,
  includeChildren = false
) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers", customerId, "debt-timeline", includeChildren],
    queryFn: async () => {
      const params: any = {};
      if (includeChildren) params.includeChildren = "true";
      const response = await apiClient.get<{
        data: any[];
      }>(`/customers/${customerId}/debt-timeline`, params);
      return response;
    },
    enabled: !!customerId && hasHydrated && isAuthenticated,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Customer> & { addresses?: any[] }) => {
      return await apiClient.post<Customer>("/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
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
      data: Partial<Customer> & { addresses?: any[] };
    }) => {
      return await apiClient.put<Customer>(`/customers/${id}`, data);
    },
    onSuccess: (updatedCustomer, variables) => {
      queryClient.setQueryData(["customers", variables.id], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
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
      queryClient.invalidateQueries({ queryKey: ["customers-search"] });
      toast.success("Xóa khách hàng thành công");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Có lỗi xảy ra");
    },
  });
}

export function useSearchCustomers(search?: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  return useQuery({
    queryKey: ["customers-search", search],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      const response = await apiClient.get<{
        data: CustomerSearchResult[];
      }>("/customers/search", params);
      return response;
    },
    enabled: hasHydrated && isAuthenticated,
  });
}
