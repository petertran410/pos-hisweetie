import { apiClient } from "@/lib/config/api";

export interface PublicApiClientItem {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  isActive: boolean;
  accessTokenTtl: number;
  createdAt: string;
  updatedAt: string;
  webhookCount: number;
}

/** Chỉ có ở phản hồi tạo mới và cấp lại secret — không bao giờ có trong danh sách. */
export interface PublicApiClientWithSecret extends PublicApiClientItem {
  clientSecret: string;
}

export const publicApiClientsApi = {
  getAll: () =>
    apiClient.get<{ total: number; data: PublicApiClientItem[] }>(
      "/public-api/clients"
    ),

  create: (data: {
    name: string;
    description?: string;
    accessTokenTtl?: number;
  }) =>
    apiClient.post<{ data: PublicApiClientWithSecret }>(
      "/public-api/clients",
      data
    ),

  update: (
    id: string,
    data: { name?: string; description?: string; accessTokenTtl?: number }
  ) =>
    apiClient.patch<{ data: PublicApiClientItem }>(
      `/public-api/clients/${id}`,
      data
    ),

  rotateSecret: (id: string) =>
    apiClient.post<{ data: PublicApiClientWithSecret }>(
      `/public-api/clients/${id}/rotate-secret`,
      {}
    ),

  activate: (id: string) =>
    apiClient.post<{ data: PublicApiClientItem }>(
      `/public-api/clients/${id}/activate`,
      {}
    ),

  deactivate: (id: string) =>
    apiClient.post<{ data: PublicApiClientItem }>(
      `/public-api/clients/${id}/deactivate`,
      {}
    ),
};
