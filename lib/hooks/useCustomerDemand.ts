import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerDemandApi } from '@/lib/api/customer-demand';
import type {
  CreateCustomerDemandRequest,
  CustomerDemandFilters,
  UpdateCustomerDemandRequest,
} from '@/lib/types/customer-demand';

const KEY = 'customer-demand';

export function useCustomerDemands(filters: CustomerDemandFilters) {
  return useQuery({
    queryKey: [KEY, 'list', filters],
    queryFn: () => customerDemandApi.list(filters),
  });
}

export function useCustomerDemandCustomers(search?: string) {
  return useQuery({
    queryKey: [KEY, 'customers', search ?? ''],
    queryFn: () => customerDemandApi.searchCustomers(search),
    enabled: !search || search.trim().length >= 2,
  });
}

export function useCustomerDemand(id: number | null) {
  return useQuery({
    queryKey: [KEY, 'detail', id],
    queryFn: () => customerDemandApi.get(id!),
    enabled: id !== null,
  });
}

function useInvalidateCustomerDemand() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [KEY] });
    queryClient.invalidateQueries({ queryKey: ['purchasing-planning'] });
  };
}

export function useCreateCustomerDemand() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({ mutationFn: (data: CreateCustomerDemandRequest) => customerDemandApi.create(data), onSuccess: invalidate });
}

export function useUpdateCustomerDemand() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: UpdateCustomerDemandRequest }) => customerDemandApi.update(id, data), onSuccess: invalidate });
}

export function useApproveCustomerDemandMonth() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({ mutationFn: (id: number) => customerDemandApi.approveMonth(id), onSuccess: invalidate });
}

export function useCancelCustomerDemandMonth() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({ mutationFn: ({ id, reason }: { id: number; reason?: string }) => customerDemandApi.cancelMonth(id, reason), onSuccess: invalidate });
}
