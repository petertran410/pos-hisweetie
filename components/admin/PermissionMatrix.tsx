"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import { useAssignPermissions } from "@/lib/hooks/useRoles";
import { Check, Save, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  RESOURCE_LABELS,
  ACTION_LABELS,
  CATEGORY_ICONS,
  getPermissionLabel,
} from "@/lib/constants/permissions";

interface PermissionMatrixProps {
  role: any;
}

export function PermissionMatrix({ role }: PermissionMatrixProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const groupedPermissions = useMemo(() => {
    if (!permissions) return {};

    return permissions.reduce((acc: any, perm: any) => {
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
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    if (!groupedPermissions) return {};

    let filtered = { ...groupedPermissions };

    if (selectedCategory !== "all") {
      filtered = { [selectedCategory]: filtered[selectedCategory] };
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const result: any = {};

      Object.entries(filtered).forEach(
        ([category, resources]: [string, any]) => {
          const filteredResources: any = {};

          Object.entries(resources).forEach(
            ([resource, perms]: [string, any]) => {
              const matchingPerms = perms.filter((p: any) => {
                const label = getPermissionLabel(
                  p.resource,
                  p.action
                ).toLowerCase();
                return label.includes(query);
              });

              if (matchingPerms.length > 0) {
                filteredResources[resource] = matchingPerms;
              }
            }
          );

          if (Object.keys(filteredResources).length > 0) {
            result[category] = filteredResources;
          }
        }
      );

      return result;
    }

    return filtered;
  }, [groupedPermissions, selectedCategory, searchQuery]);

  const categories = Object.keys(groupedPermissions || {});
  const totalPermissions = permissions?.length || 0;

  const handleTogglePermission = (permId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
    setHasChanges(true);
  };

  const handleToggleResource = (resource: string) => {
    const resourcePerms = Object.values(filteredPermissions)
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
    const categoryPerms = Object.values(filteredPermissions[category] || {})
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
      toast.success("Cập nhật quyền thành công");
    } catch (error) {
      toast.error("Có lỗi xảy ra");
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
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{role.name}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Đã chọn {selectedPermissions.length}/{totalPermissions} quyền
              </p>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Hủy thay đổi
                </button>
                <button
                  onClick={handleSave}
                  disabled={assignPermissions.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  <Save className="w-4 h-4" />
                  Lưu thay đổi
                </button>
              </div>
            )}
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm quyền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[180px]">
                <option value="all">Tất cả phân loại</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_ICONS[cat]} {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions List */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {Object.entries(filteredPermissions).map(
            ([category, resources]: [string, any]) => (
              <div
                key={category}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Category Header */}
                <div className="bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {CATEGORY_ICONS[category]}
                      </span>
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                          {category}
                        </h3>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {Object.values(resources).flat().length} quyền
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleCategory(category)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      {Object.values(resources)
                        .flatMap((perms: any) => perms)
                        .every((p: any) => selectedPermissions.includes(p.id))
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả"}
                    </button>
                  </div>
                </div>

                {/* Resources */}
                <div className="divide-y divide-gray-100">
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
                        <div key={resource} className="p-6">
                          {/* Resource Header */}
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() => handleToggleResource(resource)}
                              className="flex items-center gap-3 hover:text-blue-600 transition-colors group">
                              <div
                                className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all ${
                                  allSelected
                                    ? "bg-blue-600 border-blue-600"
                                    : someSelected
                                      ? "bg-blue-100 border-blue-600"
                                      : "border-gray-300 group-hover:border-blue-400"
                                }`}>
                                {allSelected && (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                                {someSelected && !allSelected && (
                                  <div className="w-3 h-0.5 bg-blue-600 rounded" />
                                )}
                              </div>
                              <span className="font-medium text-base text-gray-900">
                                {RESOURCE_LABELS[resource] || resource}
                              </span>
                            </button>
                            <span className="text-sm text-gray-500">
                              {
                                resourcePerms.filter((p) =>
                                  selectedPermissions.includes(p.id)
                                ).length
                              }
                              /{resourcePerms.length}
                            </span>
                          </div>

                          {/* Permissions Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ml-9">
                            {resourcePerms.map((perm) => {
                              const isSelected = selectedPermissions.includes(
                                perm.id
                              );

                              return (
                                <button
                                  key={perm.id}
                                  onClick={() =>
                                    handleTogglePermission(perm.id)
                                  }
                                  className={`flex items-start gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                                    isSelected
                                      ? "bg-blue-50 border-blue-600"
                                      : "bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                                  }`}>
                                  <div
                                    className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                                      isSelected
                                        ? "bg-blue-600"
                                        : "bg-white border-2 border-gray-300"
                                    }`}>
                                    {isSelected && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                      {ACTION_LABELS[perm.action] ||
                                        perm.action}
                                    </div>
                                    {perm.description && (
                                      <div className="text-xs text-gray-600 mt-1">
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

        {Object.keys(filteredPermissions).length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Không tìm thấy quyền nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
