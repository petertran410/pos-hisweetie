"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import { Check, X, Minus } from "lucide-react";

interface UserPermissionMatrixProps {
  selectedPermissions: number[];
  rolePermissions: any[];
  onChange: (permissionIds: number[]) => void;
}

export function UserPermissionMatrix({
  selectedPermissions,
  rolePermissions,
  onChange,
}: UserPermissionMatrixProps) {
  const [localSelected, setLocalSelected] =
    useState<number[]>(selectedPermissions);

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  useEffect(() => {
    setLocalSelected(selectedPermissions);
  }, [selectedPermissions]);

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

  const rolePermissionIds = rolePermissions.map((p) => p.id);

  const handleTogglePermission = (permId: number) => {
    const newSelected = localSelected.includes(permId)
      ? localSelected.filter((id) => id !== permId)
      : [...localSelected, permId];

    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const handleToggleResource = (resource: string) => {
    const resourcePerms = Object.values(groupedPermissions || {})
      .flatMap((cat: any) => cat[resource] || [])
      .map((p: any) => p.id);

    const allIndividuallySelected = resourcePerms.every((id) =>
      localSelected.includes(id)
    );

    let newSelected: number[];
    if (allIndividuallySelected) {
      newSelected = localSelected.filter((id) => !resourcePerms.includes(id));
    } else {
      newSelected = [...new Set([...localSelected, ...resourcePerms])];
    }

    setLocalSelected(newSelected);
    onChange(newSelected);
  };

  const handleToggleCategory = (category: string) => {
    const categoryPerms = Object.values(groupedPermissions?.[category] || {})
      .flatMap((perms: any) => perms)
      .map((p: any) => p.id);

    const allIndividuallySelected = categoryPerms.every((id) =>
      localSelected.includes(id)
    );

    let newSelected: number[];
    if (allIndividuallySelected) {
      newSelected = localSelected.filter((id) => !categoryPerms.includes(id));
    } else {
      newSelected = [...new Set([...localSelected, ...categoryPerms])];
    }

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
    <div className="p-4 max-h-96 overflow-y-auto">
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
        <div className="font-medium mb-2">Chú thích:</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span>Quyền riêng (được gán trực tiếp)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span>Quyền từ vai trò (kế thừa từ role)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span>Cả hai (vai trò + riêng)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
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
                    .every((p: any) => localSelected.includes(p.id))
                    ? "Bỏ chọn tất cả"
                    : "Chọn tất cả"}
                </button>
              </div>

              <div className="divide-y">
                {Object.entries(resources).map(
                  ([resource, perms]: [string, any]) => {
                    const resourcePerms = perms as any[];
                    const allIndividuallySelected = resourcePerms.every((p) =>
                      localSelected.includes(p.id)
                    );
                    const someIndividuallySelected = resourcePerms.some((p) =>
                      localSelected.includes(p.id)
                    );

                    return (
                      <div key={resource} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => handleToggleResource(resource)}
                            className="flex items-center gap-2 hover:text-blue-600">
                            <div
                              className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                                allIndividuallySelected
                                  ? "bg-blue-600 border-blue-600"
                                  : someIndividuallySelected
                                    ? "bg-blue-100 border-blue-600"
                                    : "border-gray-300"
                              }`}>
                              {allIndividuallySelected ? (
                                <Check className="w-3 h-3 text-white" />
                              ) : someIndividuallySelected ? (
                                <Minus className="w-3 h-3 text-blue-600" />
                              ) : null}
                            </div>
                            <span className="font-medium capitalize">
                              {resource}
                            </span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 ml-7">
                          {resourcePerms.map((perm) => {
                            const status = getPermissionStatus(perm.id);

                            return (
                              <button
                                key={perm.id}
                                onClick={() => handleTogglePermission(perm.id)}
                                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-left">
                                <div
                                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                                    status === "both"
                                      ? "bg-purple-600"
                                      : status === "role"
                                        ? "bg-green-600"
                                        : status === "individual"
                                          ? "bg-blue-600"
                                          : "border-2 border-gray-300"
                                  }`}>
                                  {status !== "none" && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="text-sm flex-1">
                                  {perm.description}
                                </span>
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
