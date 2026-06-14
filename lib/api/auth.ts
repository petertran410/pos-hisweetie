import { API_URL } from "@/lib/config/api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
    branchIds?: number[];
    branchId?: number;
    branchName?: string;
  };
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Đăng nhập thất bại");
    }

    return res.json();
  },

  getProfile: async (token: string, branchId?: number) => {
    const url = branchId
      ? `${API_URL}/auth/profile?branchId=${branchId}`
      : `${API_URL}/auth/profile`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // 401/403 → token cũ hoặc permissionVersion lệch → đính "unauthorized"
      // để RouteGuard phân biệt với lỗi mạng/5xx.
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          body.message || "Phiên đăng nhập đã hết hạn (unauthorized)"
        );
      }
      throw new Error(body.message || "Không thể lấy thông tin người dùng");
    }

    return res.json();
  },
};
