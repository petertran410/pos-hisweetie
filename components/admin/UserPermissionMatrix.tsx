"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import { Check, Minus, Search } from "lucide-react";
import {
  RESOURCE_LABELS,
  ACTION_LABELS,
  CATEGORY_ICONS,
  getPermissionLabel,
} from "@/lib/constants/permissions";

interface UserPermissionMatrixProps {
  selectedPermissions: number[];
  rolePermissions: number[];
  onChange: (permissionIds: number[]) => void;
}

export function UserPermissionMatrix({
  selectedPermissions,
  rolePermissions,
  onChange,
}: UserPermissionMatrixProps) {
  const [localSelected, setLocalSelected] =
    useState<number[]>(selectedPermissions);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  useEffect(() => {
    setLocalSelected(selectedPermissions);
  }, [selectedPermissions]);

  const rolePermissionIds = rolePermissions || [];

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
    if (!groupedPermissions || !searchQuery) return groupedPermissions;

    const query = searchQuery.toLowerCase();
    const result: any = {};

    Object.entries(groupedPermissions).forEach(
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
  }, [groupedPermissions, searchQuery]);

  const handleTogglePermission = (permId: number) => {
    const newSelected = localSelected.includes(permId)
      ? localSelected.filter((id) => id !== permId)
      : [...localSelected, permId];

    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const getPermissionStatus = (permId: number) => {
    const fromRole = rolePermissionIds.includes(permId);
    const individual = localSelected.includes(permId);

    if (fromRole && individual) return "both";
    if (fromRole) return "role";
    if (individual) return "individual";
    return "none";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Legend */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="font-medium mb-3 text-gray-900">Chú thích:</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-700">Quyền riêng</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-700">Từ vai trò</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-700">Cả hai</span>
          </div>
        </div>
      </div>

      {/* Search */}
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

      {/* Permissions */}
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
                  ([resource, perms]: [string, any]) => (
                    <div key={resource} className="p-4">
                      <div className="font-medium text-gray-900 mb-3">
                        {RESOURCE_LABELS[resource] || resource}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((perm: any) => {
                          const status = getPermissionStatus(perm.id);
                          const isDisabled = status === "role";

                          return (
                            <button
                              key={perm.id}
                              onClick={() =>
                                !isDisabled && handleTogglePermission(perm.id)
                              }
                              disabled={isDisabled}
                              className={`flex items-start gap-2 p-2 rounded border text-left transition-colors ${
                                isDisabled
                                  ? "opacity-60 cursor-not-allowed bg-gray-50"
                                  : "hover:bg-gray-50"
                              }`}>
                              <div
                                className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center flex-shrink-0 ${
                                  status === "both"
                                    ? "bg-purple-600"
                                    : status === "role"
                                      ? "bg-green-600"
                                      : status === "individual"
                                        ? "bg-blue-600"
                                        : "bg-white border-2 border-gray-300"
                                }`}>
                                {(status === "both" ||
                                  status === "role" ||
                                  status === "individual") && (
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
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
