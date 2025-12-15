export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3060/api";

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
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("API Error");
    return res.json();
  },

  post: async (endpoint: string, data?: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("API Error");
    return res.json();
  },

  put: async (endpoint: string, data?: any) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("API Error");
    return res.json();
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("API Error");
    return res.json();
  },
};
