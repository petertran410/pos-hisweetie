import { apiClient } from "@/lib/config/api";

export const permissionsApi = {
  getAll: async (params?: { category?: string; resource?: string }) => {
    const response = await apiClient.get("/permissions", { params });
    return response.data;
  },

  getMyPermissions: async () => {
    const response = await apiClient.get("/permissions/my-permissions");
    return response.data;
  },

  getFieldPermissions: async (resource: string) => {
    const response = await apiClient.get("/permissions/field-permissions", {
      params: { resource },
    });
    return response.data;
  },

  getColumnPermissions: async (resource: string) => {
    const response = await apiClient.get("/permissions/column-permissions", {
      params: { resource },
    });
    return response.data;
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
    return response.data.hasPermission;
  },
};
