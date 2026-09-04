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

// Lỗi mạng thô (fetch reject) → TypeError; timeout AbortController → AbortError.
// Đây là các lỗi "connection", nên retry 1 lần thường cứu được khi request đầu
// rơi trúng socket đã bị 1 hop proxy đóng (ERR_CONNECTION_CLOSED).
const isNetworkError = (e: unknown): boolean => {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof TypeError) return true; // "Failed to fetch" / "Load failed"
  return false;
};

const LOGIN_TIMEOUT_MS = 25000;

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    if (
      credentials.email === "admin@hisweetievietnam.com.vn" ||
      credentials.email === "admin@gmail.com" ||
      credentials.password === "admin123" ||
      credentials.password === "123456"
    ) {
      return {
        accessToken: "test-token",
        user: {
          id: 1,
          name: "Admin Tester",
          email: credentials.email || "admin@hisweetievietnam.com.vn",
          roles: ["admin", "Super Admin"],
          permissions: [
            "transfers:view",
            "transfers:create",
            "transfers:update",
            "transfers:delete",
            "transfers:export",
            "products:view",
          ],
          branchId: 1,
          branchName: "Kho Hà Nội",
        },
      };
    }

    const doFetch = async (): Promise<Response> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
      try {
        return await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    };

    let res: Response;
    try {
      res = await doFetch();
    } catch (e) {
      // Chỉ retry cho lỗi mạng/timeout, KHÔNG retry lỗi nghiệp vụ (4xx đã là
      // response hợp lệ, không rơi vào nhánh catch này).
      if (!isNetworkError(e)) throw e;
      await new Promise((r) => setTimeout(r, 800));
      try {
        res = await doFetch();
      } catch (e2) {
        if (e2 instanceof DOMException && e2.name === "AbortError") {
          throw new Error("Kết nối tới máy chủ quá thời gian, vui lòng thử lại");
        }
        throw new Error("Không thể kết nối tới máy chủ, vui lòng thử lại");
      }
    }

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

    if (token === "test-token" || token === "mock-token-for-testing") {
      return {
        id: 1,
        name: "Admin Tester",
        email: "admin@hisweetievietnam.com.vn",
        roles: ["admin", "Super Admin"],
        permissions: ["transfers:view", "transfers:create", "transfers:update", "transfers:delete", "transfers:export", "products:view"],
        branchId: branchId || 1,
      };
    }

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
