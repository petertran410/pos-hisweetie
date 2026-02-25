"use client";

import { useState } from "react";
import { RolesTable } from "@/components/admin/RolesTable";
import { RoleFormModal } from "@/components/admin/RoleFormModal";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { useRoles } from "@/lib/hooks/useRoles";
import { Plus, Shield } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  const { data: roles, isLoading } = useRoles();

  const handleCreate = () => {
    setEditingRole(null);
    setIsModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSelectRole = (role: any) => {
    setSelectedRole(role);
  };

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-white">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Danh sách vai trò</h2>
            <PermissionGate resource="roles" action="create">
              <button
                onClick={handleCreate}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Thêm vai trò">
                <Plus className="w-4 h-4" />
              </button>
            </PermissionGate>
          </div>
          <p className="text-sm text-gray-600">
            Tổng số: {roles?.length || 0} vai trò
          </p>
        </div>

        <div
          className="overflow-y-auto"
          style={{ height: "calc(100% - 80px)" }}>
          <RolesTable
            roles={roles || []}
            isLoading={isLoading}
            selectedRole={selectedRole}
            onEdit={handleEdit}
            onSelect={handleSelectRole}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {selectedRole ? (
          <PermissionMatrix role={selectedRole} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p>Chọn một vai trò để xem và chỉnh sửa quyền</p>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <RoleFormModal role={editingRole} onClose={handleCloseModal} />
      )}
    </div>
  );
}
