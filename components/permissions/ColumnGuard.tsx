"use client";

import { ReactNode } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";

interface ColumnGuardProps {
  resource: string;
  column: string;
  children: ReactNode;
}

export function ColumnGuard({ resource, column, children }: ColumnGuardProps) {
  const canView = usePermission(resource, "view");

  if (!canView) {
    return null;
  }

  return <>{children}</>;
}
