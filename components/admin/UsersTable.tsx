"use client";

import { Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useDeleteUser } from "@/lib/hooks/useUsers";
import { ActionGuard } from "@/components/permissions/ActionGuard";
import { useState } from "react";

interface UsersTableProps {
  users: any[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEdit: (user: any) => void;
}

export function UsersTable({
  users,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onEdit,
}: UsersTableProps) {
  const deleteUser = useDeleteUser();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

    setDeletingId(id);
    try {
      await deleteUser.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold">Tên</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Số điện thoại
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Chi nhánh
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Vai trò
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold">
              Trạng thái
            </th>
            <th className="px-6 py-3 text-center text-sm font-semibold">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{user.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm">{user.email}</td>
              <td className="px-6 py-4 text-sm">{user.phone || "-"}</td>
              <td className="px-6 py-4 text-sm">{user.branch?.name || "-"}</td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {user.roles?.map((role: any) => (
                    <span
                      key={role.id}
                      className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                      {role.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                {user.isActive ? (
                  <CheckCircle className="w-5 h-5 text-green-600 inline" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 inline" />
                )}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                  <ActionGuard
                    resource="users"
                    itemData={user}
                    actionType="edit">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Sửa">
                      <Edit className="w-4 h-4" />
                    </button>
                  </ActionGuard>

                  <ActionGuard
                    resource="users"
                    itemData={user}
                    actionType="delete">
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      className="p-2 hover:bg-gray-200 rounded text-red-600 disabled:opacity-50"
                      title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </ActionGuard>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Không có người dùng nào
        </div>
      )}

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-3 py-1 border rounded">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">trên tổng số {total}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Trước
          </button>
          <span className="text-sm">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
