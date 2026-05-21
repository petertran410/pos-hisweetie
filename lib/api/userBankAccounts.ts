import { apiClient } from "@/lib/config/api";

export const userBankAccountsApi = {
  getAll: () => apiClient.get("/user-bank-accounts"),

  getByUser: (userId: number) =>
    apiClient.get(`/user-bank-accounts/by-user/${userId}`),

  upsert: (data: { userId: number; bankAccountId: number }) =>
    apiClient.post("/user-bank-accounts", data),

  remove: (id: number) => apiClient.delete(`/user-bank-accounts/${id}`),
};
