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

const handleApiError = async (res: Response) => {
  if (res.status === 401) {
    useAuthStore.getState().clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Phiên đăng nhập đã hết hạn");
  }

  const errorText = await res.text();
  let errorMessage = "Có lỗi xảy ra";

  try {
    const errorJson = JSON.parse(errorText);
    if (typeof errorJson.message === "string") {
      errorMessage = errorJson.message;
    } else if (errorJson.message?.message) {
      errorMessage = errorJson.message.message;
    } else if (Array.isArray(errorJson.message)) {
      errorMessage = errorJson.message.join(", ");
    }
  } catch (e) {
    errorMessage = errorText || "Có lỗi xảy ra";
  }

  throw new Error(errorMessage);
};

export const apiClient = {
  get: async <T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> => {
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
      await handleApiError(res);
    }

    return res.json();
  },

  post: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      await handleApiError(res);
    }

    const text = await res.text();
    if (!text || text.trim() === "") {
      return null as T;
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      return null as T;
    }
  },

  put: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      await handleApiError(res);
    }

    return res.json();
  },

  delete: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const options: RequestInit = {
      method: "DELETE",
      headers: getAuthHeaders(),
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const res = await fetch(`${API_URL}${endpoint}`, options);

    if (!res.ok) {
      await handleApiError(res);
    }

    return res.json();
  },
};
