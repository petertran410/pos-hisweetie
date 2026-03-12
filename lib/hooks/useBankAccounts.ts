import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/config/api";

export function useBankAccounts() {
  return useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => apiClient.get("/bank-accounts"),
  });
}

export function useBankAccount(id: number) {
  return useQuery({
    queryKey: ["bankAccount", id],
    queryFn: () => apiClient.get(`/bank-accounts/${id}`),
    enabled: !!id,
  });
}
