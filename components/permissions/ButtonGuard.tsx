"use client";

import { ReactNode, cloneElement, isValidElement } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";

interface ButtonGuardProps {
  resource: string;
  action: string;
  scope?: string;
  data?: any;
  checkOwnership?: boolean;
  hideWhenNoPermission?: boolean;
  disableWhenNoPermission?: boolean;
  tooltipText?: string;
  children: ReactNode;
}

export function ButtonGuard({
  resource,
  action,
  scope,
  data,
  checkOwnership = false,
  hideWhenNoPermission = true,
  disableWhenNoPermission = false,
  tooltipText = "Bạn không có quyền thực hiện thao tác này",
  children,
}: ButtonGuardProps) {
  const hasBasePermission = usePermission(resource, action, scope);
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const hasOwnership = () => {
    if (!checkOwnership || !data) return true;

    if (scope === "all") return true;

    if (scope === "branch") {
      return data.branchId === selectedBranch?.id;
    }

    if (scope === "own") {
      return data.createdBy === user?.id || data.soldById === user?.id;
    }

    return true;
  };

  const hasPermission = hasBasePermission && hasOwnership();

  if (!hasPermission && hideWhenNoPermission) {
    return null;
  }

  if (!hasPermission && disableWhenNoPermission) {
    if (isValidElement(children)) {
      return cloneElement(children as React.ReactElement<any>, {
        disabled: true,
        title: tooltipText,
        className: `${(children as any).props.className || ""} opacity-50 cursor-not-allowed`,
      });
    }
  }

  return <>{children}</>;
}
