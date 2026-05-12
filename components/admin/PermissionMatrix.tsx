"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useRoleBranchPermissions,
  useAssignRoleBranchPermissions,
} from "@/lib/hooks/useRoles";
import { Save, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPermissionLabel,
  CATEGORY_ICONS,
} from "@/lib/constants/permissions";

interface PermissionMatrixProps {
  role: any;
}

export function PermissionMatrix({ role }: PermissionMatrixProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: branches } = useBranches();
  const { data: permissions, isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });
  const { data: branchPermIds, isLoading: isLoadingBranchPerms } =
    useRoleBranchPermissions(role.id, selectedBranchId);
  const assignRoleBranchPerms = useAssignRoleBranchPermissions();

  // Auto-select first branch
  useEffect(() => {
    if (branches && branches.length > 0 && selectedBranchId === 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  // Reset role change
  useEffect(() => {
    setSelectedBranchId(0);
    setHasChanges(false);
    setSearchQuery("");
    setSelectedCategory("all");
  }, [role.id]);

  // Load permissions khi branch thay đổi
  useEffect(() => {
    setSelectedPermissions(branchPermIds ?? []);
    setHasChanges(false);
  }, [branchPermIds, selectedBranchId]);

  const groupedPermissions = useMemo(() => {
    if (!permissions) return {};
    return permissions.reduce((acc: any, perm: any) => {
      const category = perm.category || "Khác";
      if (!acc[category]) acc[category] = {};
      if (!acc[category][perm.resource]) acc[category][perm.resource] = [];
      acc[category][perm.resource].push(perm);
      return acc;
    }, {});
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    if (!groupedPermissions) return {};
    let filtered =
      selectedCategory !== "all"
        ? { [selectedCategory]: groupedPermissions[selectedCategory] }
        : { ...groupedPermissions };

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const result: any = {};
      Object.entries(filtered).forEach(([cat, resources]: [string, any]) => {
        const fr: any = {};
        Object.entries(resources || {}).forEach(
          ([res, perms]: [string, any]) => {
            const matching = (perms as any[]).filter((p) =>
              getPermissionLabel(p.resource, p.action).toLowerCase().includes(q)
            );
            if (matching.length > 0) fr[res] = matching;
          }
        );
        if (Object.keys(fr).length > 0) result[cat] = fr;
      });
      return result;
    }
    return filtered;
  }, [groupedPermissions, selectedCategory, searchQuery]);

  const categories = Object.keys(groupedPermissions);

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
    setSelectedPermissions((prev) =>
      allSelected
        ? prev.filter((id) => !resourcePerms.includes(id))
        : [...new Set([...prev, ...resourcePerms])]
    );
    setHasChanges(true);
  };

  const handleToggleCategory = (category: string) => {
    const categoryPerms = Object.values(filteredPermissions[category] || {})
      .flatMap((perms: any) => perms)
      .map((p: any) => p.id);
    const allSelected = categoryPerms.every((id) =>
      selectedPermissions.includes(id)
    );
    setSelectedPermissions((prev) =>
      allSelected
        ? prev.filter((id) => !categoryPerms.includes(id))
        : [...new Set([...prev, ...categoryPerms])]
    );
    setHasChanges(true);
  };

  const handleBranchChange = (branchId: number) => {
    if (
      hasChanges &&
      !confirm("Bạn có thay đổi chưa lưu. Chuyển chi nhánh sẽ mất thay đổi.")
    )
      return;
    setSelectedBranchId(branchId);
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const handleSave = async () => {
    if (!selectedBranchId) return;
    await assignRoleBranchPerms.mutateAsync({
      roleId: role.id,
      branchId: selectedBranchId,
      permissionIds: selectedPermissions,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setSelectedPermissions(branchPermIds ?? []);
    setHasChanges(false);
  };

  const totalPermissions = permissions?.length || 0;
  const selectedBranch = branches?.find((b) => b.id === selectedBranchId);
  const isLoading = isLoadingPerms || isLoadingBranchPerms;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{role.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {selectedBranch
                  ? `${selectedBranch.name} — ${selectedPermissions.length}/${totalPermissions} quyền`
                  : "Chọn chi nhánh để cấu hình quyền"}
              </p>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm">
                  Hủy thay đổi
                </button>
                <button
                  onClick={handleSave}
                  disabled={assignRoleBranchPerms.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  <Save className="w-4 h-4" />
                  {assignRoleBranchPerms.isPending
                    ? "Đang lưu..."
                    : "Lưu quyền"}
                </button>
              </div>
            )}
          </div>

          {/* Branch tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(branches || []).map((branch) => (
              <button
                key={branch.id}
                onClick={() => handleBranchChange(branch.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedBranchId === branch.id
                    ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                }`}>
                <Building2 className="w-3.5 h-3.5" />
                {branch.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search + category filter */}
        {selectedBranchId > 0 && (
          <div className="px-6 pb-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm quyền..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 hover:bg-gray-50"
                }`}>
                Tất cả
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {!selectedBranchId ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Chọn chi nhánh để xem và cấu hình quyền
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {Object.entries(filteredPermissions).map(
            ([category, resources]: [string, any]) => {
              const categoryPerms = Object.values(resources)
                .flatMap((p: any) => p)
                .map((p: any) => p.id);
              const allCatSelected = categoryPerms.every((id) =>
                selectedPermissions.includes(id)
              );

              return (
                <div
                  key={category}
                  className="bg-white rounded-lg border overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => handleToggleCategory(category)}>
                    <span className="text-sm font-semibold text-gray-700">
                      {(CATEGORY_ICONS as any)[category] || "📋"} {category}
                    </span>
                    <input
                      type="checkbox"
                      checked={allCatSelected}
                      onChange={() => handleToggleCategory(category)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="divide-y">
                    {Object.entries(resources).map(
                      ([resource, perms]: [string, any]) => {
                        const resPermIds = (perms as any[]).map((p) => p.id);
                        const allResSelected = resPermIds.every((id) =>
                          selectedPermissions.includes(id)
                        );
                        return (
                          <div key={resource} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                onClick={() => handleToggleResource(resource)}>
                                {resource}
                              </span>
                              <input
                                type="checkbox"
                                checked={allResSelected}
                                onChange={() => handleToggleResource(resource)}
                                className="w-4 h-4"
                              />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {(perms as any[]).map((perm) => (
                                <label
                                  key={perm.id}
                                  className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(
                                      perm.id
                                    )}
                                    onChange={() =>
                                      handleTogglePermission(perm.id)
                                    }
                                    className="w-4 h-4"
                                  />
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                                    {getPermissionLabel(
                                      perm.resource,
                                      perm.action
                                    )}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
