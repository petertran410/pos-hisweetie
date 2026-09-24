import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerDemandApi } from '@/lib/api/customer-demand';
import type {
  CreateCustomerDemandRequest,
  CustomerDemandFilters,
  UpdateCustomerDemandMonthRequest,
  UpdateCustomerDemandRequest,
} from '@/lib/types/customer-demand';

const KEY = 'customer-demand';

export function useCustomerDemands(filters: CustomerDemandFilters) {
  return useQuery({
    queryKey: [KEY, 'list', filters],
    queryFn: () => customerDemandApi.list(filters),
  });
}

export function useCustomerDemandOrderSummary(
  filters: CustomerDemandFilters,
  enabled = true
) {
  return useQuery({
    queryKey: [KEY, "order-summary", filters],
    queryFn: () => customerDemandApi.orderSummary(filters),
    enabled,
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

export function useUpdateCustomerDemandMonth() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdateCustomerDemandMonthRequest;
    }) => customerDemandApi.updateMonth(id, data),
    onSuccess: invalidate,
  });
}

export function useCancelCustomerDemandMonth() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({ mutationFn: ({ id, reason }: { id: number; reason?: string }) => customerDemandApi.cancelMonth(id, reason), onSuccess: invalidate });
}

export function useCustomerDemandLarkSyncStatus(enabled = true) {
  return useQuery({
    queryKey: [KEY, "lark-sync-status"],
    queryFn: () => customerDemandApi.larkSyncStatus(),
    enabled,
  });
}

export function usePreviewCustomerDemandLarkSync() {
  return useMutation({
    mutationFn: () => customerDemandApi.previewLarkSync(),
  });
}

export function useCommitCustomerDemandLarkSync() {
  const invalidate = useInvalidateCustomerDemand();
  return useMutation({
    mutationFn: () => customerDemandApi.syncLark(),
    onSuccess: invalidate,
  });
}
