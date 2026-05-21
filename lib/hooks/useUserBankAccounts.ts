import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userBankAccountsApi } from "@/lib/api/userBankAccounts";
import { toast } from "sonner";

export function useUserBankAccounts() {
  return useQuery({
    queryKey: ["userBankAccounts"],
    queryFn: () => userBankAccountsApi.getAll(),
  });
}

export function useUpsertUserBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userBankAccountsApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBankAccounts"] });
      toast.success("Đã cập nhật tài khoản cho sale");
    },
    onError: (e: any) => toast.error(e.message || "Cập nhật thất bại"),
  });
}

export function useRemoveUserBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userBankAccountsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userBankAccounts"] });
      toast.success("Đã gỡ tài khoản");
    },
    onError: (e: any) => toast.error(e.message || "Gỡ thất bại"),
  });
}
