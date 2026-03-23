"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import { Check, Search } from "lucide-react";
import {
  RESOURCE_LABELS,
  ACTION_LABELS,
  CATEGORY_ICONS,
  getPermissionLabel,
} from "@/lib/constants/permissions";

interface UserPermissionMatrixProps {
  activePermissionIds: number[];
  onChange: (permissionIds: number[]) => void;
}

export function UserPermissionMatrix({
  activePermissionIds,
  onChange,
}: UserPermissionMatrixProps) {
  const [localActive, setLocalActive] = useState<number[]>(activePermissionIds);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  useEffect(() => {
    setLocalActive(activePermissionIds);
  }, [activePermissionIds]);

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
    if (!groupedPermissions || !searchQuery) return groupedPermissions;
    const query = searchQuery.toLowerCase();
    const result: any = {};
    Object.entries(groupedPermissions).forEach(
      ([category, resources]: [string, any]) => {
        const filteredResources: any = {};
        Object.entries(resources).forEach(
          ([resource, perms]: [string, any]) => {
            const matching = perms.filter((p: any) =>
              getPermissionLabel(p.resource, p.action)
                .toLowerCase()
                .includes(query)
            );
            if (matching.length > 0) filteredResources[resource] = matching;
          }
        );
        if (Object.keys(filteredResources).length > 0)
          result[category] = filteredResources;
      }
    );
    return result;
  }, [groupedPermissions, searchQuery]);

  const handleToggle = (permId: number) => {
    const newActive = localActive.includes(permId)
      ? localActive.filter((id) => id !== permId)
      : [...localActive, permId];

    setLocalActive(newActive);
    onChange(newActive);
  };

  const handleToggleResource = (resource: string) => {
    const resourcePerms = Object.values(filteredPermissions)
      .flatMap((cat: any) => cat[resource] || [])
      .map((p: any) => p.id);

    const allSelected = resourcePerms.every((id) => localActive.includes(id));
    let newActive: number[];

    if (allSelected) {
      newActive = localActive.filter((id) => !resourcePerms.includes(id));
    } else {
      newActive = [...new Set([...localActive, ...resourcePerms])];
    }

    setLocalActive(newActive);
    onChange(newActive);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalPermissions = permissions?.length || 0;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Đã bật {localActive.length}/{totalPermissions} quyền
        </span>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm quyền..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(filteredPermissions || {}).map(
          ([category, resources]: [string, any]) => (
            <div
              key={category}
              className="border rounded-lg overflow-hidden bg-white">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_ICONS[category]}</span>
                  <h3 className="font-semibold text-base text-gray-900">
                    {category}
                  </h3>
                </div>
              </div>

              <div className="divide-y">
                {Object.entries(resources).map(
                  ([resource, perms]: [string, any]) => {
                    const resourcePerms = perms as any[];
                    const allSelected = resourcePerms.every((p) =>
                      localActive.includes(p.id)
                    );
                    const someSelected = resourcePerms.some((p) =>
                      localActive.includes(p.id)
                    );

                    return (
                      <div key={resource} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => handleToggleResource(resource)}
                            className="flex items-center gap-2 hover:text-blue-600">
                            <div
                              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 ${
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
                                <div className="w-2.5 h-0.5 bg-blue-600 rounded" />
                              )}
                            </div>
                            <span className="font-medium text-gray-900">
                              {RESOURCE_LABELS[resource] || resource}
                            </span>
                          </button>
                          <span className="text-xs text-gray-500">
                            {
                              resourcePerms.filter((p) =>
                                localActive.includes(p.id)
                              ).length
                            }
                            /{resourcePerms.length}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {resourcePerms.map((perm: any) => {
                            const isActive = localActive.includes(perm.id);

                            return (
                              <button
                                type="button"
                                key={perm.id}
                                onClick={() => handleToggle(perm.id)}
                                className={`flex items-start gap-2 p-2 rounded border text-left transition-colors hover:bg-gray-50 ${
                                  isActive
                                    ? "border-blue-200 bg-blue-50"
                                    : "border-gray-200"
                                }`}>
                                <div
                                  className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center flex-shrink-0 ${
                                    isActive
                                      ? "bg-blue-600"
                                      : "bg-white border-2 border-gray-300"
                                  }`}>
                                  {isActive && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900">
                                    {ACTION_LABELS[perm.action] || perm.action}
                                  </div>
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
  );
}
