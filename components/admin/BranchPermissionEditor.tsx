"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import {
  useUserBranchPermissions,
  useAssignBranchPermissions,
} from "@/lib/hooks/useUsers";
import { Check, Search, Save, Building2 } from "lucide-react";
import {
  RESOURCE_LABELS,
  ACTION_LABELS,
  CATEGORY_ICONS,
  getPermissionLabel,
} from "@/lib/constants/permissions";
import { toast } from "sonner";

interface BranchPermissionEditorProps {
  userId: number;
  branches: Array<{ id: number; name: string }>;
  basePermissionIds: number[];
}

export function BranchPermissionEditor({
  userId,
  branches,
  basePermissionIds,
}: BranchPermissionEditorProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number>(
    branches[0]?.id || 0
  );
  const [localActive, setLocalActive] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allPermissions, isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  const { data: branchPerms, isLoading: isLoadingBranch } =
    useUserBranchPermissions(userId, selectedBranchId);

  const assignBranchPerms = useAssignBranchPermissions();

  useEffect(() => {
    if (!branchPerms || !allPermissions) {
      setLocalActive([...basePermissionIds]);
      setHasChanges(false);
      return;
    }

    const grantIds = new Set(branchPerms.grants.map((p: any) => p.id));
    const denyIds = new Set(branchPerms.denies.map((p: any) => p.id));

    const result = basePermissionIds.filter((id) => !denyIds.has(id));
    grantIds.forEach((id) => {
      if (!result.includes(id)) result.push(id);
    });

    setLocalActive(result);
    setHasChanges(false);
  }, [branchPerms, basePermissionIds, selectedBranchId, allPermissions]);

  const groupedPermissions = useMemo(() => {
    if (!allPermissions) return {};
    return allPermissions.reduce((acc: any, perm: any) => {
      const category = perm.category || "Khác";
      if (!acc[category]) acc[category] = {};
      if (!acc[category][perm.resource]) acc[category][perm.resource] = [];
      acc[category][perm.resource].push(perm);
      return acc;
    }, {});
  }, [allPermissions]);

  const filteredPermissions = useMemo(() => {
    if (!groupedPermissions || !searchQuery) return groupedPermissions;
    const query = searchQuery.toLowerCase();
    const result: any = {};
    Object.entries(groupedPermissions).forEach(
      ([category, resources]: [string, any]) => {
        const filtered: any = {};
        Object.entries(resources).forEach(
          ([resource, perms]: [string, any]) => {
            const matching = perms.filter((p: any) =>
              getPermissionLabel(p.resource, p.action)
                .toLowerCase()
                .includes(query)
            );
            if (matching.length > 0) filtered[resource] = matching;
          }
        );
        if (Object.keys(filtered).length > 0) result[category] = filtered;
      }
    );
    return result;
  }, [groupedPermissions, searchQuery]);

  const handleToggle = (permId: number) => {
    setLocalActive((prev) =>
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

    const allSelected = resourcePerms.every((id) => localActive.includes(id));
    if (allSelected) {
      setLocalActive((prev) =>
        prev.filter((id) => !resourcePerms.includes(id))
      );
    } else {
      setLocalActive((prev) => [...new Set([...prev, ...resourcePerms])]);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    const grantPermissionIds = localActive.filter(
      (id) => !basePermissionIds.includes(id)
    );
    const denyPermissionIds = basePermissionIds.filter(
      (id) => !localActive.includes(id)
    );

    await assignBranchPerms.mutateAsync({
      userId,
      branchId: selectedBranchId,
      grantPermissionIds,
      denyPermissionIds,
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    if (!branchPerms) {
      setLocalActive([...basePermissionIds]);
    } else {
      const grantIds = new Set(branchPerms.grants.map((p: any) => p.id));
      const denyIds = new Set(branchPerms.denies.map((p: any) => p.id));
      const result = basePermissionIds.filter((id) => !denyIds.has(id));
      grantIds.forEach((id) => {
        if (!result.includes(id)) result.push(id);
      });
      setLocalActive(result);
    }
    setHasChanges(false);
  };

  const handleBranchChange = (branchId: number) => {
    if (hasChanges) {
      if (
        !confirm("Bạn có thay đổi chưa lưu. Chuyển chi nhánh sẽ mất thay đổi.")
      ) {
        return;
      }
    }
    setSelectedBranchId(branchId);
    setSearchQuery("");
  };

  const diffCount = useMemo(() => {
    const added = localActive.filter(
      (id) => !basePermissionIds.includes(id)
    ).length;
    const removed = basePermissionIds.filter(
      (id) => !localActive.includes(id)
    ).length;
    return { added, removed };
  }, [localActive, basePermissionIds]);

  if (branches.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Chưa gán chi nhánh nào cho người dùng. Hãy gán chi nhánh trước.
      </div>
    );
  }

  const isLoading = isLoadingPerms || isLoadingBranch;

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {branches.map((branch) => (
          <button
            key={branch.id}
            type="button"
            onClick={() => handleBranchChange(branch.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
              selectedBranchId === branch.id
                ? "bg-blue-50 border-blue-500 text-blue-700"
                : "border-gray-200 hover:bg-gray-50"
            }`}>
            <Building2 className="w-4 h-4" />
            {branch.name}
          </button>
        ))}
      </div>

      {(diffCount.added > 0 || diffCount.removed > 0) && (
        <div className="mb-3 flex items-center gap-3 text-xs">
          {diffCount.added > 0 && (
            <span className="px-2 py-1 rounded bg-green-50 text-green-700">
              +{diffCount.added} thêm so với quyền gốc
            </span>
          )}
          {diffCount.removed > 0 && (
            <span className="px-2 py-1 rounded bg-red-50 text-red-700">
              -{diffCount.removed} bớt so với quyền gốc
            </span>
          )}
        </div>
      )}

      {hasChanges && (
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">
            Hủy thay đổi
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={assignBranchPerms.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {assignBranchPerms.isPending
              ? "Đang lưu..."
              : "Lưu quyền chi nhánh"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm quyền..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {Object.entries(filteredPermissions || {}).map(
              ([category, resources]: [string, any]) => (
                <div key={category} className="border rounded-lg bg-white">
                  <div className="bg-gray-50 px-3 py-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {CATEGORY_ICONS[category]}
                      </span>
                      <span className="font-semibold text-sm">{category}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    {Object.entries(resources).map(
                      ([resource, perms]: [string, any]) => {
                        const resourcePerms = perms.map((p: any) => p.id);
                        const allSelected = resourcePerms.every((id: number) =>
                          localActive.includes(id)
                        );
                        const someSelected = resourcePerms.some((id: number) =>
                          localActive.includes(id)
                        );

                        return (
                          <div key={resource}>
                            <div className="flex items-center justify-between mb-2">
                              <button
                                type="button"
                                onClick={() => handleToggleResource(resource)}
                                className="flex items-center gap-2 group">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center border ${
                                    allSelected
                                      ? "bg-blue-600 border-blue-600"
                                      : someSelected
                                        ? "bg-blue-100 border-blue-600"
                                        : "border-gray-300"
                                  }`}>
                                  {allSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                  {someSelected && !allSelected && (
                                    <div className="w-2 h-0.5 bg-blue-600 rounded" />
                                  )}
                                </div>
                                <span className="font-medium text-sm">
                                  {RESOURCE_LABELS[resource] || resource}
                                </span>
                              </button>
                              <span className="text-xs text-gray-500">
                                {
                                  perms.filter((p: any) =>
                                    localActive.includes(p.id)
                                  ).length
                                }
                                /{perms.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 ml-6">
                              {perms.map((perm: any) => {
                                const isActive = localActive.includes(perm.id);
                                const isBaseActive = basePermissionIds.includes(
                                  perm.id
                                );
                                const isOverride = isActive !== isBaseActive;

                                return (
                                  <button
                                    type="button"
                                    key={perm.id}
                                    onClick={() => handleToggle(perm.id)}
                                    className={`flex items-center gap-2 p-1.5 rounded border text-left text-xs transition-colors ${
                                      isActive
                                        ? isOverride
                                          ? "border-green-300 bg-green-50"
                                          : "border-blue-200 bg-blue-50"
                                        : isOverride
                                          ? "border-red-300 bg-red-50"
                                          : "border-gray-200"
                                    }`}>
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                                        isActive
                                          ? "bg-blue-600"
                                          : "bg-white border border-gray-300"
                                      }`}>
                                      {isActive && (
                                        <Check className="w-2.5 h-2.5 text-white" />
                                      )}
                                    </div>
                                    <span className="truncate">
                                      {ACTION_LABELS[perm.action] ||
                                        perm.action}
                                    </span>
                                    {isOverride && (
                                      <span
                                        className={`ml-auto text-[10px] px-1 rounded ${
                                          isActive
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"
                                        }`}>
                                        {isActive ? "+" : "-"}
                                      </span>
                                    )}
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
        </>
      )}
    </div>
  );
}
