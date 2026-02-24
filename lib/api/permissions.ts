import { apiClient } from "@/lib/config/api";

export const permissionsApi = {
  getAll: async (params?: { category?: string; resource?: string }) => {
    return apiClient.get("/permissions", { params });
  },

  getMyPermissions: async () => {
    return apiClient.get("/permissions/my-permissions");
  },

  getFieldPermissions: async (resource: string) => {
    return apiClient.get("/permissions/field-permissions", {
      params: { resource },
    });
  },

  getColumnPermissions: async (resource: string) => {
    return apiClient.get("/permissions/column-permissions", {
      params: { resource },
    });
  },

  checkPermission: async (
    resource: string,
    action: string,
    scope?: string,
    field?: string
  ) => {
    const response = await apiClient.get("/permissions/check", {
      params: { resource, action, scope, field },
    });
    return response.hasPermission;
  },
};
