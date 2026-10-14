// Lưu bộ lọc sidebar vào localStorage, cùng cách với bộ lọc hóa đơn.

export function readSavedFilters<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSavedFilters(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage đầy hoặc bị chặn → bỏ qua, bộ lọc vẫn dùng được.
  }
}

/**
 * Chi nhánh khi mở lại trang: giữ lựa chọn nhiều chi nhánh hoặc "Tất cả chi
 * nhánh" (mảng rỗng) user đã chủ động chọn; còn lại bám theo header.
 */
export function restoreBranchIds(
  savedIds: unknown,
  headerBranchId: number | null | undefined,
  allowed: readonly number[],
): number[] {
  if (Array.isArray(savedIds)) {
    const ids = savedIds.map(Number).filter((id) => allowed.includes(id));
    if (savedIds.length === 0) return [];
    if (ids.length >= 2) return ids;
  }
  return headerBranchId && allowed.includes(headerBranchId)
    ? [headerBranchId]
    : [];
}
