import { useAuthStore } from "@/lib/store/auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3060/api";

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return token
    ? {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      }
    : {
        "Content-Type": "application/json",
      };
};

export const apiClient = {
  get: async (endpoint: string, params?: Record<string, any>) => {
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const res = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      throw new Error("API Error");
    }
    return res.json();
  },

  post: async (endpoint: string, data?: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      throw new Error("API Error");
    }
    return res.json();
  },

  put: async (endpoint: string, data?: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      if (res.status === 401) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      throw new Error("API Error");
    }
    return res.json();
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      throw new Error("API Error");
    }
    return res.json();
  },
};
