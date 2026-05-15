"use client";

import { useState, useEffect, useMemo } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useCreateUser, useUpdateUser, useUser } from "@/lib/hooks/useUsers";
import { useBranches } from "@/lib/hooks/useBranches";
import { useAuthStore } from "@/lib/store/auth";

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
    denyPermissionIds: [] as number[],
    branchIds: [] as number[],
    isActive: true,
  });

  const currentUser = useAuthStore((s) => s.user);
  const isSelfEdit = userId !== null && currentUser?.id === userId;
  const [showPassword, setShowPassword] = useState(false);

  const { data: user, isLoading: isLoadingUser } = useUser(userId || 0);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: branches } = useBranches();
  const activeBranches = useMemo(
    () => (branches || []).filter((b: any) => b.isActive),
    [branches]
  );

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
        denyPermissionIds: user.denyPermissions?.map((p: any) => p.id) || [],
        branchIds: user.assignedBranches?.map((b: any) => b.id) || [],
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
        };
        if (!isSelfEdit) {
          updateData.roleIds = formData.roleIds;
          updateData.permissionIds = formData.permissionIds;
          updateData.denyPermissionIds = formData.denyPermissionIds;
          updateData.branchIds = formData.branchIds;
        }
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-bold">
            {userId ? "Sửa người dùng" : "Thêm người dùng"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required={!userId}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 pr-10 border rounded-lg"
                    placeholder={
                      userId
                        ? "Để trống nếu không đổi mật khẩu"
                        : "Nhập mật khẩu"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
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
                {activeBranches?.map((branch: any) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Chi nhánh được phép truy cập
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Chọn các chi nhánh mà người dùng có thể thao tác. Để trống = tất
                cả chi nhánh.
              </p>
              <div className="border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                {activeBranches?.map((branch: any) => (
                  <label
                    key={branch.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.branchIds.includes(branch.id)}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          branchIds: prev.branchIds.includes(branch.id)
                            ? prev.branchIds.filter((id) => id !== branch.id)
                            : [...prev.branchIds, branch.id],
                        }));
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{branch.name}</span>
                  </label>
                ))}
              </div>
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

          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
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
