"use client";

import { ReactNode } from "react";
import { useColumnPermissions } from "@/lib/hooks/usePermissions";

interface ColumnGuardProps {
  resource: string;
  column: string;
  children: ReactNode;
}

export function ColumnGuard({ resource, column, children }: ColumnGuardProps) {
  const columnPerms = useColumnPermissions(resource, [column]);
  const columnPerm = columnPerms[column];

  if (!columnPerm || !columnPerm.canView) {
    return null;
  }

  return <>{children}</>;
}
