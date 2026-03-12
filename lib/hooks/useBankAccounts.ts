import { useQuery } from "@tanstack/react-query";

export function useBankAccounts() {
  return useQuery({
    queryKey: ["bankAccounts"],
    queryFn: async () => {
      const res = await fetch("/api/bank-accounts");
      if (!res.ok) throw new Error("Failed to fetch bank accounts");
      return res.json();
    },
  });
}

export function useBankAccount(id: number) {
  return useQuery({
    queryKey: ["bankAccount", id],
    queryFn: async () => {
      const res = await fetch(`/api/bank-accounts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch bank account");
      return res.json();
    },
    enabled: !!id,
  });
}
