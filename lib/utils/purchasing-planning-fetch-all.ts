import type {
  RecommendationFilters,
  RecommendationListItem,
} from "@/lib/types/purchasing-planning";
import { purchasingPlanningApi } from "@/lib/api/purchasing-planning";

/**
 * Số dòng xin ở một lần gọi khi xuất Excel. Backend có thể tự giới hạn thấp
 * hơn — khi đó `fetchAllForExport` sẽ tự lấy nốt các trang còn lại.
 */
const EXPORT_PAGE_LIMIT = 100000;

/**
 * Lấy TOÀN BỘ dòng khớp bộ lọc, không giới hạn trang đang xem.
 *
 * Gọi trực tiếp API thay vì dùng React Query để không ghi đè cache của bảng
 * đang hiển thị.
 */
export async function fetchAllForExport(
  filters: RecommendationFilters
): Promise<RecommendationListItem[]> {
  let first;
  try {
    first = await purchasingPlanningApi.getRecommendations({
      ...filters,
      page: 1,
      limit: EXPORT_PAGE_LIMIT,
    });
  } catch {
    // Một số backend validate limit tối đa thay vì tự cắt về mức cho phép.
    // Khi đó dùng page size hiện tại rồi tải tuần tự toàn bộ các trang.
    first = await purchasingPlanningApi.getRecommendations({
      ...filters,
      page: 1,
      limit: filters.limit ?? 50,
    });
  }

  const items = [...first.items];
  const total = first.pagination?.total ?? items.length;
  // Backend có thể cắt bớt `limit` so với mức yêu cầu → lấy mức thực tế
  const pageSize = first.items.length || first.pagination?.limit || 0;

  if (pageSize <= 0) return items;

  const totalPages = Math.ceil(total / pageSize);
  for (let page = 2; items.length < total && page <= totalPages; page++) {
    const res = await purchasingPlanningApi.getRecommendations({
      ...filters,
      page,
      limit: pageSize,
    });
    if (!res.items.length) break;
    items.push(...res.items);
  }

  return items;
}

/**
 * Bộ lọc dùng khi xuất Excel.
 *
 * Phạm vi "tất cả" bỏ mọi điều kiện lọc nhưng vẫn giữ snapshot đang xem và
 * thứ tự sắp xếp — người dùng mong file xuất ra cùng trật tự với màn hình.
 */
export function buildExportFilters(
  filters: RecommendationFilters,
  scope: "filtered" | "all"
): RecommendationFilters {
  if (scope === "all") {
    return {
      date: filters.date,
      needsOrderOnly: false,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    };
  }
  return { ...filters };
}
