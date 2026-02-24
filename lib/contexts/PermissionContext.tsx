"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useAuthStore } from "@/lib/store/auth";
import { permissionsApi } from "@/lib/api/permissions";

interface PermissionScope {
  [scope: string]: boolean;
}

interface FieldPermission {
  canView: boolean;
  canEdit: boolean;
  isRequired: boolean;
}

interface ColumnPermission {
  canView: boolean;
  canExport: boolean;
}

interface ResourcePermissions {
  actions: {
    [action: string]: PermissionScope | boolean;
  };
  fields: {
    [fieldName: string]: FieldPermission;
  };
  columns: {
    [columnName: string]: ColumnPermission;
  };
  buttons: {
    [buttonName: string]: boolean;
  };
}

interface PermissionsMap {
  [resource: string]: ResourcePermissions;
}

interface PermissionContextValue {
  permissions: PermissionsMap;
  isLoading: boolean;
  checkPermission: (
    resource: string,
    action: string,
    scope?: string
  ) => boolean;
  checkFieldPermission: (
    resource: string,
    field: string,
    type: "view" | "edit"
  ) => boolean;
  checkColumnPermission: (
    resource: string,
    column: string,
    type: "view" | "export"
  ) => boolean;
  checkButtonPermission: (resource: string, button: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(
  undefined
);

const getDefaultPermissions = (): PermissionsMap => {
  return {
    products: {
      actions: { view: true, create: true, update: true },
      fields: {},
      columns: {},
      buttons: {},
    },
    orders: {
      actions: { view: { all: true }, create: true, update: { all: true } },
      fields: {},
      columns: {},
      buttons: {},
    },
    invoices: {
      actions: { view: { all: true }, create: true },
      fields: {},
      columns: {},
      buttons: {},
    },
    customers: {
      actions: { view: true, create: true },
      fields: {},
      columns: {},
      buttons: {},
    },
    reports: {
      actions: { view: true },
      fields: {},
      columns: {},
      buttons: {},
    },
  };
};

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuthStore();
  const [permissions, setPermissions] = useState<PermissionsMap>(
    getDefaultPermissions()
  );
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = async () => {
    if (!user || !isAuthenticated) {
      setPermissions(getDefaultPermissions());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await permissionsApi.getMyPermissions();

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn("No permissions data, using defaults");
        setPermissions(getDefaultPermissions());
        return;
      }

      const permMap = parsePermissions(data);

      if (Object.keys(permMap).length === 0) {
        console.warn("Parsed permissions is empty, using defaults");
        setPermissions(getDefaultPermissions());
      } else {
        setPermissions(permMap);
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
      setPermissions(getDefaultPermissions());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [user, isAuthenticated]);

  const parsePermissions = (data: any[]): PermissionsMap => {
    if (!data || !Array.isArray(data)) {
      console.warn("parsePermissions: data is not an array");
      return {};
    }

    const permMap: PermissionsMap = {};

    data.forEach((perm) => {
      if (!perm || !perm.resource || !perm.action) {
        console.warn("Invalid permission object:", perm);
        return;
      }

      const { resource, action, scopes, fields } = perm;

      if (!permMap[resource]) {
        permMap[resource] = {
          actions: {},
          fields: {},
          columns: {},
          buttons: {},
        };
      }

      if (scopes && Array.isArray(scopes) && scopes.length > 0) {
        const scopeMap: PermissionScope = {};
        scopes.forEach((scope: string) => {
          scopeMap[scope] = true;
        });
        permMap[resource].actions[action] = scopeMap;
      } else {
        permMap[resource].actions[action] = true;
      }

      if (fields && Array.isArray(fields) && fields.length > 0) {
        fields.forEach((field: string) => {
          if (!permMap[resource].fields[field]) {
            permMap[resource].fields[field] = {
              canView: false,
              canEdit: false,
              isRequired: false,
            };
          }
          if (action === "view") {
            permMap[resource].fields[field].canView = true;
          } else if (action === "edit") {
            permMap[resource].fields[field].canEdit = true;
          }
        });
      }
    });

    return permMap;
  };

  const checkPermission = (
    resource: string,
    action: string,
    scope?: string
  ): boolean => {
    const resourcePerms = permissions[resource];
    if (!resourcePerms || !resourcePerms.actions) return true;

    const actionPerm = resourcePerms.actions[action];
    if (!actionPerm) return true;

    if (typeof actionPerm === "boolean") {
      return actionPerm;
    }

    if (scope) {
      return actionPerm[scope] === true || actionPerm["all"] === true;
    }

    return (
      actionPerm["own"] === true ||
      actionPerm["branch"] === true ||
      actionPerm["all"] === true
    );
  };

  const checkFieldPermission = (
    resource: string,
    field: string,
    type: "view" | "edit"
  ): boolean => {
    const resourcePerms = permissions[resource];
    if (!resourcePerms || !resourcePerms.fields) return true;

    const fieldPerm = resourcePerms.fields[field];
    if (!fieldPerm) return true;

    return type === "view" ? fieldPerm.canView : fieldPerm.canEdit;
  };

  const checkColumnPermission = (
    resource: string,
    column: string,
    type: "view" | "export"
  ): boolean => {
    const resourcePerms = permissions[resource];
    if (!resourcePerms || !resourcePerms.columns) return true;

    const columnPerm = resourcePerms.columns[column];
    if (!columnPerm) return true;

    return type === "view" ? columnPerm.canView : columnPerm.canExport;
  };

  const checkButtonPermission = (resource: string, button: string): boolean => {
    const resourcePerms = permissions[resource];
    if (!resourcePerms || !resourcePerms.buttons) return true;

    return resourcePerms.buttons[button] !== false;
  };

  const value: PermissionContextValue = {
    permissions,
    isLoading,
    checkPermission,
    checkFieldPermission,
    checkColumnPermission,
    checkButtonPermission,
    refreshPermissions: loadPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error(
      "usePermissionContext must be used within PermissionProvider"
    );
  }
  return context;
}
