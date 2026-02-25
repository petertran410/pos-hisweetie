import { apiClient } from "@/lib/config/api";

export const permissionsApi = {
  getAll: (params?: { category?: string; resource?: string }) => {
    return apiClient.get("/permissions", params);
  },

  getMyPermissions: () => {
    return apiClient.get("/permissions/my-permissions");
  },

  getFieldPermissions: (resource: string) => {
    return apiClient.get("/permissions/field-permissions", { resource });
  },

  getColumnPermissions: (resource: string) => {
    return apiClient.get("/permissions/column-permissions", { resource });
  },

  checkPermission: (
    resource: string,
    action: string,
    scope?: string,
    field?: string
  ) => {
    return apiClient.get("/permissions/check", {
      resource,
      action,
      scope,
      field,
    });
  },
};
