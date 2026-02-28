import { toast } from "sonner";
import { apiClient } from "../config/api";

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const message =
        error.response?.data?.message ||
        "Bạn không có quyền thực hiện thao tác này";
      toast.error(message);
    }
    return Promise.reject(error);
  }
);
