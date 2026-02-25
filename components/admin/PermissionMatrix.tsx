"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import { useAssignPermissions } from "@/lib/hooks/useRoles";
import { Check, X, Save } from "lucide-react";
import { toast } from "sonner";

interface PermissionMatrixProps {
  role: any;
}

export function PermissionMatrix({ role }: PermissionMatrixProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  const assignPermissions = useAssignPermissions();

  useEffect(() => {
    if (role?.rolePermissions) {
      const permIds = role.rolePermissions.map((rp: any) => rp.permissionId);
      setSelectedPermissions(permIds);
      setHasChanges(false);
    }
  }, [role]);

  const groupedPermissions = permissions?.reduce((acc: any, perm: any) => {
    const category = perm.category || "Khác";
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][perm.resource]) {
      acc[category][perm.resource] = [];
    }
    acc[category][perm.resource].push(perm);
    return acc;
  }, {});

  const handleTogglePermission = (permId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
    setHasChanges(true);
  };

  const handleToggleResource = (resource: string) => {
    const resourcePerms = Object.values(groupedPermissions || {})
      .flatMap((cat: any) => cat[resource] || [])
      .map((p: any) => p.id);

    const allSelected = resourcePerms.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !resourcePerms.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...resourcePerms]),
      ]);
    }
    setHasChanges(true);
  };

  const handleToggleCategory = (category: string) => {
    const categoryPerms = Object.values(groupedPermissions?.[category] || {})
      .flatMap((perms: any) => perms)
      .map((p: any) => p.id);

    const allSelected = categoryPerms.every((id) =>
      selectedPermissions.includes(id)
    );

    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((id) => !categoryPerms.includes(id))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...new Set([...prev, ...categoryPerms]),
      ]);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await assignPermissions.mutateAsync({
        id: role.id,
        permissionIds: selectedPermissions,
      });
      setHasChanges(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleReset = () => {
    if (role?.rolePermissions) {
      const permIds = role.rolePermissions.map((rp: any) => rp.permissionId);
      setSelectedPermissions(permIds);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Phân quyền: {role.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Đã chọn {selectedPermissions.length} quyền
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                Hủy thay đổi
              </button>
              <button
                onClick={handleSave}
                disabled={assignPermissions.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {Object.entries(groupedPermissions || {}).map(
            ([category, resources]: [string, any]) => (
              <div key={category} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{category}</h3>
                  <button
                    onClick={() => handleToggleCategory(category)}
                    className="text-sm text-blue-600 hover:text-blue-700">
                    {Object.values(resources)
                      .flatMap((perms: any) => perms)
                      .every((p: any) => selectedPermissions.includes(p.id))
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                </div>

                <div className="divide-y">
                  {Object.entries(resources).map(
                    ([resource, perms]: [string, any]) => {
                      const resourcePerms = perms as any[];
                      const allSelected = resourcePerms.every((p) =>
                        selectedPermissions.includes(p.id)
                      );
                      const someSelected = resourcePerms.some((p) =>
                        selectedPermissions.includes(p.id)
                      );

                      return (
                        <div key={resource} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => handleToggleResource(resource)}
                              className="flex items-center gap-2 hover:text-blue-600">
                              <div
                                className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                  allSelected
                                    ? "bg-blue-600 border-blue-600"
                                    : someSelected
                                      ? "bg-blue-200 border-blue-600"
                                      : "border-gray-300"
                                }`}>
                                {allSelected && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                                {someSelected && !allSelected && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                )}
                              </div>
                              <span className="font-medium capitalize">
                                {resource}
                              </span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 ml-7">
                            {resourcePerms.map((perm: any) => {
                              const isSelected = selectedPermissions.includes(
                                perm.id
                              );

                              return (
                                <button
                                  key={perm.id}
                                  onClick={() =>
                                    handleTogglePermission(perm.id)
                                  }
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                    isSelected
                                      ? "bg-blue-50 border-blue-600 text-blue-900"
                                      : "bg-white border-gray-300 hover:bg-gray-50"
                                  }`}>
                                  <div
                                    className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                                      isSelected
                                        ? "bg-blue-600 border-blue-600"
                                        : "border-gray-300"
                                    }`}>
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div className="text-left flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {perm.action}
                                      {perm.scope && perm.scope !== "all" && (
                                        <span className="text-xs ml-1 text-gray-600">
                                          ({perm.scope})
                                        </span>
                                      )}
                                      {perm.field && (
                                        <span className="text-xs ml-1 text-purple-600">
                                          .{perm.field}
                                        </span>
                                      )}
                                    </div>
                                    {perm.description && (
                                      <div className="text-xs text-gray-600 truncate">
                                        {perm.description}
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
