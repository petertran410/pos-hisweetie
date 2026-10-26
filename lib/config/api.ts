import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "../store/branch";
import { endSession, refreshAccessToken } from "@/lib/auth/session";

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAuthHeaders = (): Record<string, string> => {
  const token = useAuthStore.getState().token;
  const selectedBranch = useBranchStore.getState().selectedBranch;

  const headers: Record<string, string> = {
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

const DEFAULT_TIMEOUT_MS = 30000;

// fetch có timeout qua AbortController. Chuỗi proxy trước backend nhiều hop
// (Cloudflare → Synology RP → nginx → Node); nếu một hop đóng connection mà
// client không nhận tín hiệu, fetch có thể treo vô hạn. Timeout biến nó thành
// lỗi rõ ràng để UI phản hồi thay vì kẹt spinner.
const fetchWithTimeout = async (
  input: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw createApiError(
        "Kết nối tới máy chủ quá thời gian, vui lòng thử lại",
        0,
      );
    }
    if (e instanceof TypeError) {
      throw createApiError("Không thể kết nối tới máy chủ", 0);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

const handleApiError = async (res: Response) => {
  if (res.status === 401) {
    // Đã thử làm mới token (authedFetch) mà vẫn 401 → phiên hết hiệu lực.
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

    endSession(errorMessage);
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

/**
 * Gọi API kèm access token (bộ nhớ). Gặp 401 → làm mới token bằng refresh
 * cookie 1 lần rồi gọi lại (token có thể vừa hết hạn 15 phút).
 */
const authedFetch = async (
  url: string,
  init: RequestInit,
  timeoutMs?: number,
  opts: { form?: boolean } = {},
): Promise<Response> => {
  const withAuth = (): RequestInit => {
    const headers = getAuthHeaders();
    if (opts.form) delete headers["Content-Type"];
    return { ...init, headers };
  };
  let res = await fetchWithTimeout(url, withAuth(), timeoutMs);
  if (res.status === 401 && (await refreshAccessToken())) {
    res = await fetchWithTimeout(url, withAuth(), timeoutMs);
  }
  return res;
};

export const apiClient = {
  get: async <T = any>(
    endpoint: string,
    params?: Record<string, any>,
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

    const res = await authedFetch(url.toString(), {});

    if (!res.ok) {
      await handleApiError(res);
    }

    return res.json();
  },

  postForm: async <T = any>(endpoint: string, data: FormData): Promise<T> => {
    const res = await authedFetch(
      `${API_URL}${endpoint}`,
      { method: "POST", body: data },
      undefined,
      { form: true },
    );

    if (!res.ok) {
      await handleApiError(res);
    }

    return res.json();
  },

  post: async <T = any>(
    endpoint: string,
    data?: any,
    timeoutMs?: number,
  ): Promise<T> => {
    const res = await authedFetch(
      `${API_URL}${endpoint}`,
      { method: "POST", body: JSON.stringify(data) },
      timeoutMs,
    );

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
    const res = await authedFetch(`${API_URL}${endpoint}`, {
      method: "PUT",
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

  patch: async <T = any>(endpoint: string, data?: any): Promise<T> => {
    const res = await authedFetch(`${API_URL}${endpoint}`, {
      method: "PATCH",
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
    const options: RequestInit = { method: "DELETE" };
    if (data) {
      options.body = JSON.stringify(data);
    }

    const res = await authedFetch(`${API_URL}${endpoint}`, options);

    if (!res.ok) {
      await handleApiError(res);
    }

    return res.json();
  },
};
