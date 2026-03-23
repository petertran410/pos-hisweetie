"use client";

import { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";

interface ActionGuardProps {
  resource: string;
  action?: "create" | "update" | "delete" | "view" | "export" | "print";
  actionType?: "edit" | "delete" | "create" | "view";
  itemData?: any;
  fallback?: ReactNode;
  children: ReactNode;
}

const ACTION_TYPE_MAP: Record<string, string> = {
  edit: "update",
  delete: "delete",
  create: "create",
  view: "view",
};

export function ActionGuard({
  resource,
  action,
  actionType,
  itemData,
  fallback = null,
  children,
}: ActionGuardProps) {
  const resolvedAction = action || ACTION_TYPE_MAP[actionType || ""] || "view";
  const hasPermission = usePermission(resource, resolvedAction);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
