"use client";

import { ReactNode } from "react";
import { useActionPermissions } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";

interface ActionGuardProps {
  resource: string;
  itemData: any;
  actionType: "edit" | "delete" | "cancel" | "print" | "export";
  fallback?: ReactNode;
  children: ReactNode;
}

type PermissionKey =
  | "canEdit"
  | "canDelete"
  | "canCancel"
  | "canPrint"
  | "canExport";

const actionToPermissionMap: Record<
  ActionGuardProps["actionType"],
  PermissionKey
> = {
  edit: "canEdit",
  delete: "canDelete",
  cancel: "canCancel",
  print: "canPrint",
  export: "canExport",
};

export function ActionGuard({
  resource,
  itemData,
  actionType,
  fallback = null,
  children,
}: ActionGuardProps) {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const permissions = useActionPermissions(
    resource,
    itemData,
    user?.id || 0,
    selectedBranch?.id
  );

  const permissionKey = actionToPermissionMap[actionType];
  const hasPermission = permissions[permissionKey];

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
