"use client";

import { ReactNode, cloneElement, isValidElement } from "react";
import { useFieldPermissions } from "@/lib/hooks/usePermissions";

interface FieldGuardProps {
  resource: string;
  field: string;
  mode?: "view" | "edit";
  hideWhenNoPermission?: boolean;
  children: ReactNode;
}

export function FieldGuard({
  resource,
  field,
  mode = "edit",
  hideWhenNoPermission = true,
  children,
}: FieldGuardProps) {
  const fieldPerms = useFieldPermissions(resource, [field]);
  const fieldPerm = fieldPerms[field];

  if (!fieldPerm) {
    return hideWhenNoPermission ? null : <>{children}</>;
  }

  if (mode === "view" && !fieldPerm.canView) {
    return hideWhenNoPermission ? null : <>{children}</>;
  }

  if (mode === "edit") {
    if (!fieldPerm.canView) {
      return hideWhenNoPermission ? null : <>{children}</>;
    }

    if (!fieldPerm.canEdit && isValidElement(children)) {
      return cloneElement(children as React.ReactElement<any>, {
        disabled: true,
        readOnly: true,
        className: `${(children as any).props.className || ""} bg-gray-100 cursor-not-allowed`,
      });
    }
  }

  return <>{children}</>;
}
