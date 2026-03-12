"use client";

import { useState } from "react";
import { BankAccountsTable } from "@/components/admin/BankAccountsTable";
import { BankAccountFormModal } from "@/components/admin/BankAccountFormModal";
import { useBankAccounts } from "@/lib/hooks/useBankAccounts";
import { Plus } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermissions";

export default function BankAccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);

  const { data: bankAccounts, isLoading } = useBankAccounts();

  const canCreate = usePermission("bank_accounts", "create");
  const canView = usePermission("bank_accounts", "view");

  const handleCreate = () => {
    setEditingBankAccount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (bankAccount: any) => {
    setEditingBankAccount(bankAccount);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBankAccount(null);
  };

  return (
    <>
      {canView && (
        <div className="flex flex-col h-full">
          <div className="p-6 border-b bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">
                  Quản lý tài khoản thu chi
                </h1>
                <p className="text-gray-600 mt-1">
                  Quản lý các tài khoản ngân hàng và ví điện tử dùng cho giao
                  dịch thu chi của cửa hàng.
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Plus className="w-5 h-5" />
                  Thêm tài khoản
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <BankAccountsTable
              bankAccounts={bankAccounts || []}
              isLoading={isLoading}
              onEdit={handleEdit}
            />
          </div>

          {isModalOpen && (
            <BankAccountFormModal
              bankAccount={editingBankAccount}
              onClose={handleCloseModal}
            />
          )}
        </div>
      )}
    </>
  );
}
