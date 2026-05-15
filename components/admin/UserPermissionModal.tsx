"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import {
  useUser,
  useUserBranchPermissions,
  useAssignBranchPermissions,
  useUpdateUser,
} from "@/lib/hooks/useUsers";
import { useBranches } from "@/lib/hooks/useBranches";
import { X, Check, ChevronDown, ChevronUp, Search, Save } from "lucide-react";
import {
  RESOURCE_LABELS,
  ACTION_LABELS,
  getPermissionLabel,
} from "@/lib/constants/permissions";
import { toast } from "sonner";
import { useRoles } from "@/lib/hooks/useRoles";

interface UserPermissionModalProps {
  userId: number;
  onClose: () => void;
}

export function UserPermissionModal({
  userId,
  onClose,
}: UserPermissionModalProps) {
  const { data: user, isLoading: isLoadingUser } = useUser(userId);
  const { data: allPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });
  const { data: allBranches } = useBranches();
  const [activeTab, setActiveTab] = useState<"role" | "other">("role");
  const [canViewOtherStaff, setCanViewOtherStaff] = useState(false);
  const updateUser = useUpdateUser();

  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
  const [localActive, setLocalActive] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedResources, setExpandedResources] = useState<Set<string>>(
    new Set()
  );
  const [activeCategory, setActiveCategory] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  const assignBranchPerms = useAssignBranchPermissions();
  const { data: allRoles } = useRoles();
  const [localRoleIds, setLocalRoleIds] = useState<number[]>([]);
  const [roleHasChanges, setRoleHasChanges] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const userBranches = useMemo(() => {
    if (!user || !allBranches) return [];
    const assignedIds = user.assignedBranches?.map((b: any) => b.id) || [];
    if (user.branchId && !assignedIds.includes(user.branchId)) {
      assignedIds.push(user.branchId);
    }
    if (assignedIds.length === 0) return allBranches;
    return allBranches.filter((b: any) => assignedIds.includes(b.id));
  }, [user, allBranches]);

  const userRoleNames = useMemo(() => {
    if (!user?.roles) return "";
    return user.roles.map((r: any) => r.name).join(", ");
  }, [user]);

  const localRoleNames = useMemo(() => {
    if (!allRoles || localRoleIds.length === 0) return "Chưa có vai trò";
    return (allRoles as any[])
      .filter((r) => localRoleIds.includes(r.id))
      .map((r) => r.name)
      .join(", ");
  }, [allRoles, localRoleIds]);

  const handleRoleToggle = (roleId: number) => {
    setLocalRoleIds((prev) => {
      const next = prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId];
      setRoleHasChanges(true);
      return next;
    });
  };

  const basePermissionIds = useMemo(() => {
    if (!user) return [];
    const fromRole = (user.rolePermissions || []).map((p: any) => p.id);
    const fromGrant = (user.individualPermissions || []).map((p: any) => p.id);
    const denyIds = new Set((user.denyPermissions || []).map((p: any) => p.id));
    return [...new Set([...fromRole, ...fromGrant])].filter(
      (id) => !denyIds.has(id)
    );
  }, [user]);

  const { data: branchPerms, isLoading: isLoadingBranch } =
    useUserBranchPermissions(
      userId,
      selectedBranchId > 0 ? selectedBranchId : 0
    );

  useEffect(() => {
    if (user) {
      setCanViewOtherStaff(user.canViewOtherStaffData || false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLocalRoleIds(user.roles?.map((r: any) => r.id) || []);
      setRoleHasChanges(false);
    }
  }, [user]);

  useEffect(() => {
    if (userBranches.length > 0 && selectedBranchId === 0) {
      setSelectedBranchId(userBranches[0].id);
    }
  }, [userBranches, selectedBranchId]);

  useEffect(() => {
    if (!allPermissions) return;

    if (selectedBranchId === 0) {
      setLocalActive([...basePermissionIds]);
      setHasChanges(false);
      return;
    }

    if (!branchPerms) {
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const categories = Object.keys(filteredPermissions || {});

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

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

  const toggleExpand = (resource: string) => {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      if (next.has(resource)) {
        next.delete(resource);
      } else {
        next.add(resource);
      }
      return next;
    });
  };

  const handleBranchChange = (branchId: number) => {
    if (hasChanges) {
      if (
        !confirm("Bạn có thay đổi chưa lưu. Chuyển chi nhánh sẽ mất thay đổi.")
      )
        return;
    }
    setSelectedBranchId(branchId);
    setSearchQuery("");
  };

  const handleSave = async () => {
    if (activeTab === "other") {
      await updateUser.mutateAsync({
        id: userId,
        data: { canViewOtherStaffData: canViewOtherStaff },
      });
      toast.success("Cập nhật phân quyền khác thành công");
      setHasChanges(false);
      return;
    }

    const tasks: Promise<any>[] = [];

    if (roleHasChanges) {
      tasks.push(
        updateUser.mutateAsync({ id: userId, data: { roleIds: localRoleIds } })
      );
    }

    if (hasChanges && selectedBranchId !== 0) {
      const grantPermissionIds = localActive.filter(
        (id) => !basePermissionIds.includes(id)
      );
      const denyPermissionIds = basePermissionIds.filter(
        (id) => !localActive.includes(id)
      );
      tasks.push(
        assignBranchPerms.mutateAsync({
          userId,
          branchId: selectedBranchId,
          grantPermissionIds,
          denyPermissionIds,
        })
      );
    }

    if (tasks.length === 0) return;
    await Promise.all(tasks);
    setHasChanges(false);
    setRoleHasChanges(false);
  };

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    const el = document.getElementById(`cat-${category}`);
    if (el && contentRef.current) {
      const container = contentRef.current;
      const offset = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold">Sửa phân quyền của {user?.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab("role")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "role"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Phân quyền theo vai trò
          </button>
          <button
            onClick={() => setActiveTab("other")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "other"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Phân quyền khác
          </button>
        </div>
        {activeTab === "role" ? (
          <div className="flex flex-1 min-h-0">
            <div className="w-56 border-r bg-gray-50 flex-shrink-0 overflow-y-auto">
              {userBranches.map((branch: any) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchChange(branch.id)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${
                    selectedBranchId === branch.id
                      ? "bg-blue-50 border-l-4 border-l-blue-600"
                      : "hover:bg-gray-100 border-l-4 border-l-transparent"
                  }`}>
                  <div
                    className={`text-sm font-medium ${selectedBranchId === branch.id ? "text-blue-600" : "text-gray-900"}`}>
                    {branch.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Quyền theo chi nhánh
                  </div>
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-6 py-3 border-b bg-white flex items-center gap-4 flex-shrink-0">
                <span className="text-sm text-gray-500">Vai trò</span>
                <div ref={roleDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-gray-50 text-sm hover:bg-gray-100 transition-colors">
                    <span
                      className={
                        localRoleIds.length === 0 ? "text-gray-400" : ""
                      }>
                      {localRoleNames}
                    </span>
                    <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  </button>
                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {((allRoles as any[]) || []).map((role) => {
                        const isSelected = localRoleIds.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                            <div
                              onClick={() => handleRoleToggle(role.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-gray-300"
                              }`}>
                              {isSelected && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm">{role.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 italic">
                  (áp dụng cho tất cả chi nhánh)
                </span>
                <div className="flex-1" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm phân quyền..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-1 min-h-0">
                <div
                  ref={contentRef}
                  className="flex-1 overflow-y-auto px-6 py-4">
                  {isLoadingBranch ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                    Object.entries(filteredPermissions || {}).map(
                      ([category, resources]: [string, any]) => (
                        <div
                          key={category}
                          id={`cat-${category}`}
                          className="mb-6">
                          <h3 className="text-base font-bold text-gray-900 mb-1">
                            {category}
                          </h3>

                          {Object.entries(resources).map(
                            ([resource, perms]: [string, any]) => {
                              const resourcePermIds = perms.map(
                                (p: any) => p.id
                              );
                              const activeCount = resourcePermIds.filter(
                                (id: number) => localActive.includes(id)
                              ).length;
                              const allSelected =
                                activeCount === resourcePermIds.length;
                              const someSelected = activeCount > 0;
                              const isExpanded =
                                expandedResources.has(resource);

                              const mainActions = perms.filter((p: any) =>
                                ["view", "create", "update", "delete"].includes(
                                  p.action
                                )
                              );
                              const otherActions = perms.filter(
                                (p: any) =>
                                  ![
                                    "view",
                                    "create",
                                    "update",
                                    "delete",
                                  ].includes(p.action)
                              );

                              return (
                                <div
                                  key={resource}
                                  className="border rounded-lg mb-2 bg-white">
                                  <div className="flex items-center px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleResource(resource)
                                      }
                                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border mr-3 ${
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
                                    </button>

                                    <span className="font-medium text-sm flex-1">
                                      {RESOURCE_LABELS[resource] || resource}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(resource)}
                                      className="p-1 hover:bg-gray-100 rounded">
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                      )}
                                    </button>
                                  </div>

                                  {isExpanded && (
                                    <div className="px-4 pb-4 border-t pt-3">
                                      {mainActions.length > 0 && (
                                        <div className="grid grid-cols-4 gap-3 mb-3">
                                          {mainActions.map((perm: any) => {
                                            const isActive =
                                              localActive.includes(perm.id);
                                            const isBase =
                                              basePermissionIds.includes(
                                                perm.id
                                              );
                                            const isOverride =
                                              isActive !== isBase;

                                            return (
                                              <label
                                                key={perm.id}
                                                className="flex items-center gap-2 cursor-pointer">
                                                <div
                                                  onClick={() =>
                                                    handleToggle(perm.id)
                                                  }
                                                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border cursor-pointer ${
                                                    isActive
                                                      ? isOverride
                                                        ? "bg-green-600 border-green-600"
                                                        : "bg-blue-600 border-blue-600"
                                                      : "border-gray-300"
                                                  }`}>
                                                  {isActive && (
                                                    <Check className="w-3 h-3 text-white" />
                                                  )}
                                                </div>
                                                <span className="text-sm">
                                                  {ACTION_LABELS[perm.action] ||
                                                    perm.action}
                                                </span>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {otherActions.length > 0 && (
                                        <>
                                          <div className="text-xs font-medium text-gray-500 mb-2">
                                            Khác
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                            {otherActions.map((perm: any) => {
                                              const isActive =
                                                localActive.includes(perm.id);
                                              const isBase =
                                                basePermissionIds.includes(
                                                  perm.id
                                                );
                                              const isOverride =
                                                isActive !== isBase;

                                              return (
                                                <label
                                                  key={perm.id}
                                                  className="flex items-center gap-2 cursor-pointer">
                                                  <div
                                                    onClick={() =>
                                                      handleToggle(perm.id)
                                                    }
                                                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border cursor-pointer ${
                                                      isActive
                                                        ? isOverride
                                                          ? "bg-green-600 border-green-600"
                                                          : "bg-blue-600 border-blue-600"
                                                        : "border-gray-300"
                                                    }`}>
                                                    {isActive && (
                                                      <Check className="w-3 h-3 text-white" />
                                                    )}
                                                  </div>
                                                  <span className="text-sm">
                                                    {ACTION_LABELS[
                                                      perm.action
                                                    ] || perm.action}
                                                  </span>
                                                </label>
                                              );
                                            })}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )
                    )
                  )}
                </div>

                <div className="w-44 border-l flex-shrink-0 overflow-y-auto py-4 px-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => scrollToCategory(category)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors mb-0.5 ${
                        activeCategory === category
                          ? "text-blue-600 font-medium border-l-2 border-blue-600 bg-blue-50"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Phân quyền khác
              </h3>

              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canViewOtherStaff}
                    onChange={(e) => {
                      setCanViewOtherStaff(e.target.checked);
                      setHasChanges(true);
                    }}
                    className="w-5 h-5 mt-0.5 rounded"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      Xem, chỉnh sửa giao dịch và xem báo cáo cuối ngày của nhân
                      viên khác
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Cho phép xem đơn hàng, hóa đơn, phiếu thu/chi và tất cả dữ
                      liệu do nhân viên khác tạo. Nếu tắt, nhân viên chỉ xem
                      được dữ liệu do chính mình tạo.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm">
            Bỏ qua
          </button>
          <button
            onClick={handleSave}
            disabled={
              (!hasChanges && !roleHasChanges) ||
              assignBranchPerms.isPending ||
              updateUser.isPending
            }
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
            <Save className="w-4 h-4" />
            {assignBranchPerms.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
