"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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

  // Lookup map: bankAccountId(string) → bankAccount object (dùng cho renderOption)
  const bankAccountById = useMemo(() => {
    const map = new Map<string, any>();
    (bankAccounts || []).forEach((b: any) => map.set(b.id.toString(), b));
    return map;
  }, [bankAccounts]);

  // Options cho SearchableSelect: label gộp các trường để search được theo bankCode/số TK/tên chủ
  const bankOptions = useMemo(
    () =>
      (bankAccounts || []).map((b: any) => ({
        value: b.id.toString(),
        label: `${b.bankCode} ${b.bankName} ${b.accountNumber} ${b.accountHolder}`,
      })),
    [bankAccounts]
  );

  // Custom render: badge bankCode + 2 dòng thông tin
  const renderBankOption = (opt: { value: string; label: string }) => {
    const bank = bankAccountById.get(opt.value);
    if (!bank) return opt.label;
    return (
      <span className="flex items-center gap-2 w-full">
        <span className="px-1.5 py-0.5 text-xs font-bold bg-brand-soft text-brand-dark rounded shrink-0">
          {bank.bankCode}
        </span>
        <span className="flex flex-col min-w-0 flex-1 text-left">
          <span className="text-sm font-medium text-gray-900 truncate">
            {bank.accountNumber} — {bank.accountHolder}
          </span>
          <span className="text-xs text-gray-500 truncate">
            {bank.bankName}
          </span>
        </span>
      </span>
    );
  };

  // Lookup: userId → mapping
  const mappingByUserId = useMemo(() => {
    const map = new Map<number, any>();
    (mappings || []).forEach((m: any) => map.set(m.userId, m));
    return map;
  }, [mappings]);

  // Filter users theo search
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

  const handleSelectBank = (userId: number, value: string) => {
    if (!value) {
      const mapping = mappingByUserId.get(userId);
      if (mapping) removeMutation.mutate(mapping.id);
      return;
    }
    upsertMutation.mutate({ userId, bankAccountId: Number(value) });
  };

  const handleRemove = (userId: number) => {
    const mapping = mappingByUserId.get(userId);
    if (mapping) removeMutation.mutate(mapping.id);
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

        {/* Search box */}
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
        <div className="bg-white border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Sale
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 w-[400px]">
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
                      <td className="px-4 py-3 font-medium align-top">
                        {user.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 align-top">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <SearchableSelect
                          options={bankOptions}
                          value={mapping?.bankAccountId?.toString() || ""}
                          onChange={(v) => handleSelectBank(user.id, v)}
                          placeholder="— Chưa gán —"
                          searchPlaceholder="Tìm theo mã NH, số TK, tên chủ TK..."
                          renderOption={renderBankOption}
                          disabled={!canUpdate || upsertMutation.isPending}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        {mapping && canUpdate && (
                          <button
                            onClick={() => handleRemove(user.id)}
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
