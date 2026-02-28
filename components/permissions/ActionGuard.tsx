"use client";

import { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";

interface ActionGuardProps {
  resource: string;
  action: "create" | "update" | "delete" | "view" | "export" | "print";
  fallback?: ReactNode;
  children: ReactNode;
}

export function ActionGuard({
  resource,
  action,
  fallback = null,
  children,
}: ActionGuardProps) {
  const hasPermission = usePermission(resource, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
