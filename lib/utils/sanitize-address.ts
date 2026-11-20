/**
 * Chuẩn hóa 1 địa chỉ trước khi gửi API (CustomerAddressDto):
 * - Chỉ giữ các field DTO nhận (customerId, createdAt, ... bị bỏ → tránh 400).
 * - Địa chỉ ĐÃ LƯU (có id): ô bỏ trống vẫn phải gửi lên để xóa giá trị cũ,
 *   vì backend chỉ sửa field có trong payload (Prisma giữ nguyên field thiếu).
 *   Nếu không gửi, phường/quận cũ còn sót lại trong DB dù người dùng đã bỏ trống.
 *   → field text gửi "", field mã/tên địa giới gửi null.
 * - Địa chỉ MỚI (chưa có id): ô trống thì bỏ qua.
 *
 * Giống `toAddressPayload` bên app mobile.
 */
const ALLOWED_FIELDS = [
  "label",
  "receiver",
  "contactNumber",
  "address",
  "cityCode",
  "cityName",
  "districtCode",
  "districtName",
  "wardCode",
  "wardName",
  "newCityCode",
  "newCityName",
  "newWardCode",
  "newWardName",
  "locationName",
] as const;

// Field text user-editable — xóa trắng thì gửi "".
const CLEARABLE_TEXT_FIELDS = new Set<string>([
  "receiver",
  "contactNumber",
  "label",
  "address",
]);

export function sanitizeAddressForApi(
  addr: Record<string, any>
): Record<string, any> {
  const clean: Record<string, any> = {};
  const hasId =
    addr.id !== null && addr.id !== undefined && String(addr.id) !== "";

  if (hasId) {
    clean.id = typeof addr.id === "number" ? addr.id : parseInt(addr.id, 10);
  }

  for (const key of ALLOWED_FIELDS) {
    const raw = addr[key];
    // String() xử lý cityCode dạng number → string
    const val = raw === null || raw === undefined ? "" : String(raw).trim();
    if (val) clean[key] = val;
    else if (hasId) clean[key] = CLEARABLE_TEXT_FIELDS.has(key) ? "" : null;
  }

  clean.isDefault = Boolean(addr.isDefault);
  return clean;
}

export function sanitizeAddresses(addresses: any[]): any[] {
  return addresses.map(sanitizeAddressForApi);
}
