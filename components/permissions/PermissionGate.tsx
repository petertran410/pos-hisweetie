"use client";

import { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";

interface PermissionGateProps {
  resource: string;
  action: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  resource,
  action,
  fallback = null,
  children,
}: PermissionGateProps) {
  const hasPermission = usePermission(resource, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
