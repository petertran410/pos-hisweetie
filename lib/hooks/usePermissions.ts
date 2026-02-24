import { usePermissionContext } from "@/lib/contexts/PermissionContext";
import { useMemo } from "react";

export function usePermission(
  resource: string,
  action: string,
  scope?: string
) {
  const { checkPermission } = usePermissionContext();
  return useMemo(
    () => checkPermission(resource, action, scope),
    [resource, action, scope, checkPermission]
  );
}

export function useResourcePermissions(resource: string) {
  const { permissions } = usePermissionContext();
  return useMemo(() => permissions[resource] || {}, [resource, permissions]);
}

export function useFieldPermissions(resource: string, fields: string[]) {
  const { checkFieldPermission } = usePermissionContext();

  return useMemo(() => {
    const result: Record<string, { canView: boolean; canEdit: boolean }> = {};
    fields.forEach((field) => {
      result[field] = {
        canView: checkFieldPermission(resource, field, "view"),
        canEdit: checkFieldPermission(resource, field, "edit"),
      };
    });
    return result;
  }, [resource, fields, checkFieldPermission]);
}

export function useColumnPermissions(resource: string, columns: string[]) {
  const { checkColumnPermission } = usePermissionContext();

  return useMemo(() => {
    const result: Record<string, { canView: boolean; canExport: boolean }> = {};
    columns.forEach((column) => {
      result[column] = {
        canView: checkColumnPermission(resource, column, "view"),
        canExport: checkColumnPermission(resource, column, "export"),
      };
    });
    return result;
  }, [resource, columns, checkColumnPermission]);
}

export function useButtonPermissions(resource: string, buttons: string[]) {
  const { checkButtonPermission } = usePermissionContext();

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    buttons.forEach((button) => {
      result[button] = checkButtonPermission(resource, button);
    });
    return result;
  }, [resource, buttons, checkButtonPermission]);
}

export function useFormPermissions(resource: string) {
  const { permissions } = usePermissionContext();

  return useMemo(() => {
    const resourcePerms = permissions[resource];
    if (!resourcePerms || !resourcePerms.fields) return {};

    return resourcePerms.fields;
  }, [resource, permissions]);
}

export function useTablePermissions(resource: string) {
  const { permissions } = usePermissionContext();

  return useMemo(() => {
    const resourcePerms = permissions[resource];
    if (!resourcePerms || !resourcePerms.columns) return {};

    return resourcePerms.columns;
  }, [resource, permissions]);
}

export function useActionPermissions(
  resource: string,
  itemData: any,
  userId: number,
  userBranchId?: number
) {
  const { checkPermission } = usePermissionContext();

  return useMemo(() => {
    const canEdit = () => {
      if (checkPermission(resource, "update", "all")) return true;
      if (
        checkPermission(resource, "update", "branch") &&
        itemData?.branchId === userBranchId
      )
        return true;
      if (
        checkPermission(resource, "update", "own") &&
        (itemData?.createdBy === userId || itemData?.soldById === userId)
      )
        return true;
      return false;
    };

    const canDelete = () => {
      if (checkPermission(resource, "delete", "all")) return true;
      if (
        checkPermission(resource, "delete", "own") &&
        (itemData?.createdBy === userId || itemData?.soldById === userId)
      )
        return true;
      return false;
    };

    const canCancel = () => {
      if (checkPermission(resource, "cancel", "all")) return true;
      if (
        checkPermission(resource, "cancel", "own") &&
        (itemData?.createdBy === userId || itemData?.soldById === userId)
      )
        return true;
      return false;
    };

    return {
      canEdit: canEdit(),
      canDelete: canDelete(),
      canCancel: canCancel(),
      canPrint: checkPermission(resource, "print"),
      canExport: checkPermission(resource, "export"),
    };
  }, [resource, itemData, userId, userBranchId, checkPermission]);
}
