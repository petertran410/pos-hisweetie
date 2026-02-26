"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { useCreateUser, useUpdateUser, useUser } from "@/lib/hooks/useUsers";
import { useRoles } from "@/lib/hooks/useRoles";
import { useBranches } from "@/lib/hooks/useBranches";
import { UserPermissionMatrix } from "./UserPermissionMatrix";

interface UserFormModalProps {
  userId: number | null;
  onClose: () => void;
}

export function UserFormModal({ userId, onClose }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    branchId: 0,
    roleIds: [] as number[],
    permissionIds: [] as number[],
    isActive: true,
  });
  const [showPermissions, setShowPermissions] = useState(false);

  const { data: user, isLoading: isLoadingUser } = useUser(userId || 0);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: roles } = useRoles();
  const { data: branches } = useBranches();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phone: user.phone || "",
        branchId: user.branchId || 0,
        roleIds: user.roles?.map((r: any) => r.id) || [],
        permissionIds: user.individualPermissions?.map((p: any) => p.id) || [],
        isActive: user.isActive ?? true,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (userId) {
        const updateData: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          branchId: formData.branchId || undefined,
          isActive: formData.isActive,
          roleIds: formData.roleIds,
          permissionIds: formData.permissionIds,
        };

        if (formData.password) {
          updateData.password = formData.password;
        }

        await updateUser.mutateAsync({ id: userId, data: updateData });
      } else {
        await createUser.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleToggle = (roleId: number) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  };

  const handlePermissionsChange = (permissionIds: number[]) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds,
    }));
  };

  const rolePermissions = user?.rolePermissions || [];
  const totalRolePermissions = rolePermissions.length;
  const totalIndividualPermissions = formData.permissionIds.length;

  if (userId && isLoadingUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {userId ? "Sửa người dùng" : "Thêm người dùng"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nhập tên"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mật khẩu {!userId && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  required={!userId}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder={
                    userId ? "Để trống nếu không đổi mật khẩu" : "Nhập mật khẩu"
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0123456789"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Chi nhánh
              </label>
              <select
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border rounded-lg">
                <option value={0}>Chọn chi nhánh</option>
                {branches?.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium">
                  Vai trò ({formData.roleIds.length} vai trò)
                </label>
                {userId && totalRolePermissions > 0 && (
                  <span className="text-xs text-gray-600">
                    {totalRolePermissions} quyền từ vai trò
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {roles?.map((role: any) => (
                  <label
                    key={role.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.roleIds.includes(role.id)}
                      onChange={() => handleRoleToggle(role.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{role.name}</div>
                      {role.description && (
                        <div className="text-xs text-gray-600">
                          {role.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPermissions(!showPermissions)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Quyền riêng ({totalIndividualPermissions} quyền)
                  </span>
                  <span className="text-xs text-gray-600">
                    Tùy chỉnh quyền ngoài vai trò
                  </span>
                </div>
                {showPermissions ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              {showPermissions && (
                <div className="border-t">
                  <UserPermissionMatrix
                    selectedPermissions={formData.permissionIds}
                    rolePermissions={rolePermissions}
                    onChange={handlePermissionsChange}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Kích hoạt tài khoản
              </label>
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
              disabled={createUser.isPending || updateUser.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {userId ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
