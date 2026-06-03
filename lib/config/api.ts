import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "../store/branch";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAuthHeaders = (): HeadersInit => {
  const token = useAuthStore.getState().token;
  const selectedBranch = useBranchStore.getState().selectedBranch;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (selectedBranch?.id) {
    headers["X-Branch-Id"] = String(selectedBranch.id);
  }

  return headers;
};

const createApiError = (message: string, status: number): Error => {
  const err = new Error(message) as any;
  err.status = status;
  return err;
};

const handleApiError = async (res: Response) => {
  if (res.status === 401) {
    let errorMessage = "Phiên đăng nhập đã hết hạn";

    try {
      const errorJson = await res.clone().json();
      const msg = errorJson?.message;
      if (typeof msg === "string" && msg.length > 0) {
        errorMessage = msg;
      } else if (typeof msg === "object" && typeof msg?.message === "string") {
        errorMessage = msg.message;
      }
    } catch {}

    useAuthStore.getState().clearAuth();

    if (typeof window !== "undefined") {
      sessionStorage.setItem("auth-error", errorMessage);
      window.location.href = "/login";
    }

    throw createApiError(errorMessage, 401);
  }

  if (res.status === 403) {
    const errorText = await res.text();
    let errorMessage = "Bạn không có quyền thực hiện thao tác này";

    try {
      const errorJson = JSON.parse(errorText);
      if (typeof errorJson.message === "string") {
        errorMessage = errorJson.message;
      }
    } catch {}

    throw createApiError(errorMessage, 403);
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
  } catch {
    errorMessage = errorText || "Có lỗi xảy ra";
  }

  throw createApiError(errorMessage, res.status);
};

export const apiClient = {
  get: async <T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> => {
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Bỏ qua các param meta chỉ dùng ở client (prefix "_", vd "_preset").
        // Backend bật ValidationPipe forbidNonWhitelisted → gửi lên sẽ bị 400.
        if (key.startsWith("_")) return;
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
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
