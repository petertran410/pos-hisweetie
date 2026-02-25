"use client";

import { useState } from "react";
import { BranchesTable } from "@/components/admin/BranchesTable";
import { BranchFormModal } from "@/components/admin/BranchFormModal";
import { useBranches } from "@/lib/hooks/useBranches";
import { Plus } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function BranchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const { data: branches, isLoading } = useBranches();

  const handleCreate = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (branch: any) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý chi nhánh</h1>
            <p className="text-gray-600 mt-1">
              Tổng số: {branches?.length || 0} chi nhánh
            </p>
          </div>
          <PermissionGate resource="branches" action="create">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Thêm chi nhánh
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <BranchesTable
          branches={branches || []}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>

      {isModalOpen && (
        <BranchFormModal branch={editingBranch} onClose={handleCloseModal} />
      )}
    </div>
  );
}
