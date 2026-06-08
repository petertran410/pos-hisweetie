"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { permissionsApi } from "@/lib/api/permissions";
import {
  useUser,
  useUserBranchPermissions,
  useAssignBranchPermissions,
  useUpdateUser,
  useUserBranchRoles,
  useSetUserBranchRole,
} from "@/lib/hooks/useUsers";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useRoles,
  useRole,
  useRoleBranchPermissions,
} from "@/lib/hooks/useRoles";
import { X, Check, ChevronDown, ChevronUp, Search, Save } from "lucide-react";
import { ACTION_LABELS, getPermissionLabel } from "@/lib/constants/permissions";
import { toast } from "sonner";

interface UserPermissionModalProps {
  userId: number;
  onClose: () => void;
}

export function UserPermissionModal({
  userId,
  onClose,
}: UserPermissionModalProps) {
  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: user, isLoading: isLoadingUser } = useUser(userId);
  const { data: allPermissions } = useQuery({
    queryKey: ["permissions"],
    queryFn: () => permissionsApi.getAll(),
  });
  const { data: allBranches } = useBranches();
  const { data: allRoles } = useRoles();
  const { data: userBranchRoles } = useUserBranchRoles(userId);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const assignBranchPerms = useAssignBranchPermissions();
  const updateUser = useUpdateUser();
  const setUserBranchRoleMutation = useSetUserBranchRole();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"role" | "other">("role");
  const [canViewOtherStaff, setCanViewOtherStaff] = useState(false);
  const [canViewOnlyOwnPackings, setCanViewOnlyOwnPackings] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
  const [localActive, setLocalActive] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedResources, setExpandedResources] = useState<Set<string>>(
    new Set()
  );
  const [activeCategory, setActiveCategory] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Per-branch role state ──────────────────────────────────────────────────
  const [localBranchRoles, setLocalBranchRoles] = useState<
    Record<number, number | null>
  >({});
  const [changedBranchRoles, setChangedBranchRoles] = useState<Set<number>>(
    new Set()
  );
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // ── Derived: role của branch đang chọn ────────────────────────────────────
  const selectedBranchRoleId = localBranchRoles[selectedBranchId] ?? null;
  const { data: selectedBranchRoleData } = useRole(selectedBranchRoleId || 0);
  const { data: roleBranchPerms } = useRoleBranchPermissions(
    selectedBranchRoleId || 0,
    selectedBranchId
  );

  const userBranches = useMemo(() => {
    if (!user || !allBranches) return [];
    const assignedIds = user.assignedBranches?.map((b: any) => b.id) || [];
    if (user.branchId && !assignedIds.includes(user.branchId)) {
      assignedIds.push(user.branchId);
    }
    if (assignedIds.length === 0)
      return allBranches.filter((b: any) => b.isActive);
    return allBranches.filter(
      (b: any) => assignedIds.includes(b.id) && b.isActive
    );
  }, [user, allBranches]);

  // ── Computed: tên role của branch đang chọn ───────────────────────────────
  const selectedBranchRoleName = useMemo(() => {
    if (!selectedBranchRoleId || !allRoles) return "Chưa có vai trò";
    return (
      (allRoles as any[]).find((r) => r.id === selectedBranchRoleId)?.name ||
      "Chưa có vai trò"
    );
  }, [selectedBranchRoleId, allRoles]);

  // ── Computed: base permissions cho branch đang chọn ───────────────────────
  // Mirror backend logic: branchPerms.length > 0 ? branchPerms : rolePermissions (global fallback)
  const basePermissionIds = useMemo(() => {
    if (selectedBranchRoleId) {
      // Chưa load roleBranchPerms → chờ
      if (roleBranchPerms === undefined) return [];

      // Có branch-specific permissions → dùng luôn
      if (roleBranchPerms.length > 0) {
        return roleBranchPerms as number[];
      }

      // roleBranchPerms = [] → fallback về global rolePermissions (mirror backend)
      if (!selectedBranchRoleData) return []; // chờ role data
      return ((selectedBranchRoleData.rolePermissions as any[]) || []).map(
        (rp: any) => rp.permission?.id ?? rp.id
      );
    }
    // Không có role: dùng global permissions của user
    if (!user) return [];
    const fromRole = (user.rolePermissions || []).map((p: any) => p.id);
    const fromGrant = (user.individualPermissions || []).map((p: any) => p.id);
    const denyIds = new Set((user.denyPermissions || []).map((p: any) => p.id));
    return [...new Set([...fromRole, ...fromGrant])].filter(
      (id) => !denyIds.has(id)
    );
  }, [selectedBranchRoleId, roleBranchPerms, selectedBranchRoleData, user]);

  // ── Data fetching: branch permissions hiện tại ────────────────────────────
  const { data: branchPerms, isLoading: isLoadingBranch } =
    useUserBranchPermissions(
      userId,
      selectedBranchId > 0 ? selectedBranchId : 0
    );

  // ── Effects ────────────────────────────────────────────────────────────────

  // Sync canViewOtherStaff
  useEffect(() => {
    if (user) {
      setCanViewOtherStaff(user.canViewOtherStaffData || false);
      setCanViewOnlyOwnPackings(user.canViewOnlyOwnPackings || false);
    }
  }, [user]);

  // Sync localBranchRoles từ server
  useEffect(() => {
    if (userBranchRoles) {
      const initial: Record<number, number | null> = {};
      for (const ubr of userBranchRoles as any[]) {
        initial[ubr.branchId] = ubr.roleId;
      }
      setLocalBranchRoles(initial);
      setChangedBranchRoles(new Set());
    }
  }, [userBranchRoles]);

  // Auto-select branch đầu tiên
  useEffect(() => {
    if (userBranches.length > 0 && selectedBranchId === 0) {
      setSelectedBranchId(userBranches[0].id);
    }
  }, [userBranches, selectedBranchId]);

  // Thay đổi useEffect "Recalculate localActive khi branch hoặc branchPerms thay đổi"
  useEffect(() => {
    if (!allPermissions) return;
    if (selectedBranchId === 0) {
      setLocalActive([...basePermissionIds]);
      setHasChanges(false);
      return;
    }

    // Guard: chờ roleBranchPerms load; nếu rỗng thì chờ thêm selectedBranchRoleData (fallback global)
    if (selectedBranchRoleId && roleBranchPerms === undefined) return;
    if (
      selectedBranchRoleId &&
      Array.isArray(roleBranchPerms) &&
      roleBranchPerms.length === 0 &&
      !selectedBranchRoleData
    )
      return;

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
  }, [
    branchPerms,
    basePermissionIds,
    selectedBranchId,
    allPermissions,
    selectedBranchRoleId,
    roleBranchPerms,
    selectedBranchRoleData,
  ]);

  // Click-outside để đóng role dropdown
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

  // ── Permission grouping ────────────────────────────────────────────────────
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

  // ── Handlers ───────────────────────────────────────────────────────────────

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
      if (next.has(resource)) next.delete(resource);
      else next.add(resource);
      return next;
    });
  };

  const handleBranchChange = (branchId: number) => {
    if (hasChanges || changedBranchRoles.size > 0) {
      if (
        !confirm("Bạn có thay đổi chưa lưu. Chuyển chi nhánh sẽ mất thay đổi.")
      )
        return;
    }
    setSelectedBranchId(branchId);
    setSearchQuery("");
  };

  const handleBranchRoleChange = (roleId: number | null) => {
    setLocalBranchRoles((prev) => ({ ...prev, [selectedBranchId]: roleId }));
    setChangedBranchRoles((prev) => new Set([...prev, selectedBranchId]));
    setShowRoleDropdown(false);
  };

  const handleSave = async () => {
    if (activeTab === "other") {
      await updateUser.mutateAsync({
        id: userId,
        data: {
          canViewOtherStaffData: canViewOtherStaff,
          canViewOnlyOwnPackings: canViewOnlyOwnPackings,
        },
      });
      toast.success("Cập nhật phân quyền khác thành công");
      setHasChanges(false);
      return;
    }

    const tasks: Promise<any>[] = [];

    // Lưu role thay đổi cho từng branch
    for (const branchId of changedBranchRoles) {
      const roleId = localBranchRoles[branchId] ?? null;
      tasks.push(
        setUserBranchRoleMutation.mutateAsync({ userId, branchId, roleId })
      );
    }

    // Lưu branch permission overrides nếu có
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
    setChangedBranchRoles(new Set());
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

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoadingUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto" />
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold">Sửa phân quyền của {user?.name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab("role")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "role"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Phân quyền theo vai trò
          </button>
          <button
            onClick={() => setActiveTab("other")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "other"
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Phân quyền khác
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "role" ? (
          <div className="flex flex-1 min-h-0">
            {/* Left panel — danh sách chi nhánh */}
            <div className="w-56 border-r bg-gray-50 flex-shrink-0 overflow-y-auto">
              {userBranches.map((branch: any) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchChange(branch.id)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${
                    selectedBranchId === branch.id
                      ? "bg-brand-soft border-l-4 border-l-brand"
                      : "hover:bg-gray-100 border-l-4 border-l-transparent"
                  }`}>
                  <div
                    className={`text-sm font-medium ${
                      selectedBranchId === branch.id
                        ? "text-brand"
                        : "text-gray-900"
                    }`}>
                    {branch.name}
                  </div>
                  {/* Hiển thị role của từng branch */}
                  <div className="text-xs text-gray-500 mt-0.5">
                    {(() => {
                      const roleId = localBranchRoles[branch.id];
                      if (!roleId || !allRoles) return "Chưa có vai trò";
                      return (
                        (allRoles as any[]).find((r) => r.id === roleId)
                          ?.name || "Chưa có vai trò"
                      );
                    })()}
                  </div>
                </button>
              ))}
            </div>

            {/* Right panel — permission matrix */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top bar: role dropdown + search */}
              <div className="px-6 py-3 border-b bg-white flex items-center gap-4 flex-shrink-0">
                <span className="text-sm text-gray-500">Vai trò</span>

                {/* Role dropdown cho branch đang chọn */}
                <div ref={roleDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown((v) => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-gray-50 text-sm hover:bg-gray-100 transition-colors">
                    <span
                      className={!selectedBranchRoleId ? "text-gray-400" : ""}>
                      {selectedBranchRoleName}
                    </span>
                    {selectedBranchRoleId && (
                      <X
                        className="w-3 h-3 text-gray-400 hover:text-red-500 cursor-pointer flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBranchRoleChange(null);
                        }}
                      />
                    )}
                    <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  </button>

                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                      {((allRoles as any[]) || []).map((role) => {
                        const isSelected = selectedBranchRoleId === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => handleBranchRoleChange(role.id)}
                            className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2 ${
                              isSelected ? "text-brand font-medium" : ""
                            }`}>
                            <div className="w-4 flex-shrink-0">
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-brand" />
                              )}
                            </div>
                            <span>{role.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm phân quyền..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              {/* Permission matrix */}
              <div className="flex flex-1 min-h-0">
                <div
                  ref={contentRef}
                  className="flex-1 overflow-y-auto px-6 py-4">
                  {isLoadingBranch ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
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
                                          ? "bg-brand border-brand"
                                          : someSelected
                                            ? "bg-brand-border border-brand"
                                            : "border-gray-300"
                                      }`}>
                                      {(allSelected || someSelected) && (
                                        <Check className="w-3 h-3 text-white" />
                                      )}
                                    </button>
                                    <span className="text-sm font-medium flex-1">
                                      {resource}
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
                                                        : "bg-brand border-brand"
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
                                                          : "bg-brand border-brand"
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

                {/* Category sidebar */}
                <div className="w-44 border-l flex-shrink-0 overflow-y-auto py-4 px-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => scrollToCategory(category)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded transition-colors mb-0.5 ${
                        activeCategory === category
                          ? "text-brand font-medium border-l-2 border-brand bg-brand-soft"
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
          /* Tab "Phân quyền khác" */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Phân quyền khác
              </h3>
              <div className="border rounded-lg p-4 mb-3">
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

              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canViewOnlyOwnPackings}
                    onChange={(e) => {
                      setCanViewOnlyOwnPackings(e.target.checked);
                      setHasChanges(true);
                    }}
                    className="w-5 h-5 mt-0.5 rounded"
                  />
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      Chỉ xem báo đơn do chính mình tạo
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Khi bật, nhân viên chỉ thấy được các báo đơn (Giao hàng,
                      Đóng hàng, Loading) do chính mình tạo trong trang Báo
                      đơn. Tắt để xem tất cả báo đơn của chi nhánh.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 text-sm">
            Bỏ qua
          </button>
          <button
            onClick={handleSave}
            disabled={
              (activeTab === "role" &&
                !hasChanges &&
                changedBranchRoles.size === 0) ||
              (activeTab === "other" && !hasChanges) ||
              assignBranchPerms.isPending ||
              updateUser.isPending ||
              setUserBranchRoleMutation.isPending
            }
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
            <Save className="w-4 h-4" />
            {assignBranchPerms.isPending ||
            updateUser.isPending ||
            setUserBranchRoleMutation.isPending
              ? "Đang lưu..."
              : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
