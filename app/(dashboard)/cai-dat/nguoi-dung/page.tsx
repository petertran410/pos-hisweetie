"use client";

import { useState } from "react";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserFormModal } from "@/components/admin/UserFormModal";
import { useAllUsers } from "@/lib/hooks/useUsers";
import { Plus, Search } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const { data, isLoading } = useAllUsers({ search, page, limit });

  const handleCreate = () => {
    setEditingUserId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: any) => {
    setEditingUserId(user.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          </div>
          <PermissionGate resource="users" action="create">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-5 h-5" />
              Thêm người dùng
            </button>
          </PermissionGate>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <UsersTable
          users={data?.data || []}
          isLoading={isLoading}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          onEdit={handleEdit}
        />
      </div>

      {isModalOpen && (
        <UserFormModal userId={editingUserId} onClose={handleCloseModal} />
      )}
    </div>
  );
}
