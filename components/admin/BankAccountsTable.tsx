"use client";

import { Edit, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { usePermission } from "@/lib/hooks/usePermissions";
import { table } from "console";

export function BankAccountsTable({
  bankAccounts,
  isLoading,
  onEdit,
}: {
  bankAccounts: any[];
  isLoading: boolean;
  onEdit: (bankAccount: any) => void;
}) {
  const queryClient = useQueryClient();

  const canCreate = usePermission("bank_accounts", "create");
  const canView = usePermission("bank_accounts", "view");
  const canUpdate = usePermission("bank_accounts", "update");
  const canDelete = usePermission("bank_accounts", "update");

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Xóa tài khoản thành công");
    },
    onError: () => {
      toast.error("Xóa tài khoản thất bại");
    },
  });

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa tài khoản này?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Số tài khoản
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Ngân hàng
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Chủ tài khoản
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Phạm vi áp dụng
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            Ghi chú
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
            Thao tác
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {bankAccounts.map((account) => (
          <tr key={account.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              {account.accountNumber}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              {account.bankName}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              {account.accountHolder}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              {account.scope === "all" ? "Toàn hệ thống" : "Chi nhánh cụ thể"}
            </td>
            <td className="px-6 py-4 text-sm">{account.note || "-"}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
              {canUpdate && (
                <button
                  onClick={() => onEdit(account)}
                  className="text-blue-600 hover:text-blue-900 mr-3">
                  <Edit className="w-4 h-4" />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-red-600 hover:text-red-900">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
