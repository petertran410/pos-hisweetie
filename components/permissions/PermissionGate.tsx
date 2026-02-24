"use client";

import { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";

interface PermissionGateProps {
  resource: string;
  action: string;
  scope?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  resource,
  action,
  scope,
  fallback = null,
  children,
}: PermissionGateProps) {
  const hasPermission = usePermission(resource, action, scope);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
