import { apiClient } from "@/lib/config/api";

export interface Branch {
  id: number;
  name: string;
  code?: string;
  contactNumber?: string;
  address?: string;
  isActive: boolean;
  /**
   * @deprecated Dự kiến đặt hàng đã gộp toàn công ty — không còn phân biệt
   * chi nhánh gốc. Giữ field để đọc dữ liệu cũ, không dùng để tính toán.
   */
  isPurchasingHub?: boolean;
  /**
   * @deprecated Leadtime đặt hàng dừng ở mốc hàng về công ty; điều chuyển nội
   * bộ không còn được cộng vào.
   */
  transferLeadtimeColdMin?: number | null;
  transferLeadtimeColdMax?: number | null;
  transferLeadtimeNormalMin?: number | null;
  transferLeadtimeNormalMax?: number | null;
}

export interface BranchesResponse {
  data?: Branch[];
}

export const branchesApi = {
  getBranches: (): Promise<Branch[]> => {
    return apiClient.get("/branches/all");
  },

  getMyBranches: (): Promise<Branch[]> => {
    return apiClient.get("/branches/my-branches");
  },
};
