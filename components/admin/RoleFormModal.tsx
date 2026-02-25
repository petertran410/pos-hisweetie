"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useCreateRole, useUpdateRole } from "@/lib/hooks/useRoles";

interface RoleFormModalProps {
  role?: any;
  onClose: () => void;
}

export function RoleFormModal({ role, onClose }: RoleFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || "",
        description: role.description || "",
      });
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (role) {
        await updateRole.mutateAsync({ id: role.id, data: formData });
      } else {
        await createRole.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {role ? "Sửa vai trò" : "Thêm vai trò mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tên vai trò <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Ví dụ: Quản lý, Nhân viên bán hàng..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
                placeholder="Mô tả về vai trò này..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100">
              Hủy
            </button>
            <button
              type="submit"
              disabled={createRole.isPending || updateRole.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {role ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
