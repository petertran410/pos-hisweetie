"use client";

import { Edit, Trash2, Shield } from "lucide-react";
import { useDeleteRole } from "@/lib/hooks/useRoles";
import { ActionGuard } from "@/components/permissions/ActionGuard";
import { useState } from "react";

interface RolesTableProps {
  roles: any[];
  isLoading: boolean;
  selectedRole: any;
  onEdit: (role: any) => void;
  onSelect: (role: any) => void;
}

export function RolesTable({
  roles,
  isLoading,
  selectedRole,
  onEdit,
  onSelect,
}: RolesTableProps) {
  const deleteRole = useDeleteRole();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa vai trò này?")) return;

    setDeletingId(id);
    try {
      await deleteRole.mutateAsync(id);
    } finally {
      setDeletingId(null);
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
    <div className="divide-y">
      {roles.map((role) => (
        <div
          key={role.id}
          onClick={() => onSelect(role)}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedRole?.id === role.id
              ? "bg-blue-50 border-l-4 border-blue-600"
              : ""
          }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-blue-600" />
                <h3 className="font-medium">{role.name}</h3>
              </div>
              {role.description && (
                <p className="text-sm text-gray-600">{role.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <ActionGuard resource="roles" itemData={role} actionType="edit">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(role);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Sửa">
                  <Edit className="w-4 h-4" />
                </button>
              </ActionGuard>

              <ActionGuard resource="roles" itemData={role} actionType="delete">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(role.id);
                  }}
                  disabled={deletingId === role.id}
                  className="p-1 hover:bg-gray-200 rounded text-red-600 disabled:opacity-50"
                  title="Xóa">
                  <Trash2 className="w-4 h-4" />
                </button>
              </ActionGuard>
            </div>
          </div>
        </div>
      ))}

      {roles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Chưa có vai trò nào
        </div>
      )}
    </div>
  );
}
