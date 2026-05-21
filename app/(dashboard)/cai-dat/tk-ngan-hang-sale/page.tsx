"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  useUserBankAccounts,
  useUpsertUserBankAccount,
  useRemoveUserBankAccount,
} from "@/lib/hooks/useUserBankAccounts";
import { useUsers } from "@/lib/hooks/useUsers";
import { useBankAccounts } from "@/lib/hooks/useBankAccounts";
import { usePermission } from "@/lib/hooks/usePermissions";

export default function UserBankAccountsPage() {
  const canView = usePermission("bank_accounts", "view");
  const canUpdate = usePermission("bank_accounts", "update");

  const [search, setSearch] = useState("");

  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: mappings, isLoading: loadingMappings } = useUserBankAccounts();
  const { data: bankAccounts, isLoading: loadingBanks } = useBankAccounts();

  const upsertMutation = useUpsertUserBankAccount();
  const removeMutation = useRemoveUserBankAccount();

  // Build lookup: userId → mapping
  const mappingByUserId = useMemo(() => {
    const map = new Map<number, any>();
    (mappings || []).forEach((m: any) => map.set(m.userId, m));
    return map;
  }, [mappings]);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const kw = search.trim().toLowerCase();
    if (!kw) return users;
    return users.filter(
      (u: any) =>
        u.name?.toLowerCase().includes(kw) ||
        u.email?.toLowerCase().includes(kw)
    );
  }, [users, search]);

  const handleChange = (userId: number, bankAccountId: number | null) => {
    if (bankAccountId == null) {
      // Gỡ mapping
      const mapping = mappingByUserId.get(userId);
      if (mapping) removeMutation.mutate(mapping.id);
      return;
    }
    upsertMutation.mutate({ userId, bankAccountId });
  };

  if (!canView) return null;

  const isLoading = loadingUsers || loadingMappings || loadingBanks;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              Tài khoản ngân hàng theo sale
            </h1>
            <p className="text-gray-600 mt-1">
              Gán mỗi sale 1 tài khoản ngân hàng. Tài khoản này sẽ được dùng để
              tạo mã QR thanh toán trên hóa đơn/đơn hàng do sale đó tạo.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sale theo tên hoặc email..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Sale
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Tài khoản ngân hàng
                </th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              )}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Không có sale nào
                  </td>
                </tr>
              )}
              {!isLoading &&
                filteredUsers.map((user: any) => {
                  const mapping = mappingByUserId.get(user.id);
                  return (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          disabled={!canUpdate || upsertMutation.isPending}
                          value={mapping?.bankAccountId || ""}
                          onChange={(e) =>
                            handleChange(
                              user.id,
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          className="border rounded px-3 py-1.5 text-sm min-w-[280px] disabled:bg-gray-100">
                          <option value="">— Chưa gán —</option>
                          {(bankAccounts || []).map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.bankName} - {b.accountNumber} (
                              {b.accountHolder})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {mapping && canUpdate && (
                          <button
                            onClick={() => handleChange(user.id, null)}
                            disabled={removeMutation.isPending}
                            className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-40"
                            title="Gỡ tài khoản">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
