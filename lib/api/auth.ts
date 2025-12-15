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

  getProfile: async (token: string) => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Không thể lấy thông tin người dùng");
    }

    return res.json();
  },
};
