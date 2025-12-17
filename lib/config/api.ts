import { useAuthStore } from "@/lib/store/auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3060/api";

const getAuthHeaders = (): HeadersInit => {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
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

      const errorText = await res.text();
      try {
        const errorJson = JSON.parse(errorText);
        console.error("API Error Details:", errorJson);
      } catch (e) {
        console.error("Raw Error:", errorText);
      }

      throw new Error("API Error");
    }

    const text = await res.text();
    if (!text || text.trim() === "") {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      return null;
    }
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

  delete: async (endpoint: string, data?: any) => {
    const options: RequestInit = {
      method: "DELETE",
      headers: getAuthHeaders(),
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const res = await fetch(`${API_URL}${endpoint}`, options);

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
