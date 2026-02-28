"use client";

import { ReactNode, cloneElement, isValidElement } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";

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
  hideWhenNoPermission = false,
  children,
}: FieldGuardProps) {
  const canUpdate = usePermission(resource, "update");

  if (mode === "edit" && !canUpdate) {
    if (hideWhenNoPermission) {
      return null;
    }

    if (isValidElement(children)) {
      return cloneElement(children as React.ReactElement<any>, {
        disabled: true,
        readOnly: true,
        className: `${(children as any).props.className || ""} bg-gray-100 cursor-not-allowed`,
      });
    }
  }

  return <>{children}</>;
}
