/**
 * Loại bỏ các field không có trong CustomerAddressDto
 * (customerId, createdAt, updatedAt, ...) trước khi gửi API.
 *
 * Lưu ý: các field text người dùng nhập (receiver, contactNumber, label, address)
 * được giữ nguyên cả khi rỗng để cho phép clear giá trị khi edit.
 */
const ALLOWED_FIELDS = new Set([
  "id",
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
  "isDefault",
]);

// Field text user-editable — cần gửi cả "" để BE xóa được giá trị cũ.
const CLEARABLE_TEXT_FIELDS = new Set([
  "receiver",
  "contactNumber",
  "label",
  "address",
]);

export function sanitizeAddressForApi(
  addr: Record<string, any>
): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const key of ALLOWED_FIELDS) {
    const val = addr[key];
    if (val === null || val === undefined) continue;
    // Field text cho phép gửi chuỗi rỗng để clear giá trị.
    // Các field khác (code/name) thì vẫn drop "" như cũ.
    if (val === "" && !CLEARABLE_TEXT_FIELDS.has(key)) continue;

    if (key === "id") {
      clean.id = typeof val === "number" ? val : parseInt(val, 10);
    } else if (key === "isDefault") {
      clean.isDefault = Boolean(val);
    } else {
      // Đảm bảo tất cả string fields là string (xử lý cityCode number → string)
      clean[key] = String(val);
    }
  }

  if (clean.isDefault === undefined) clean.isDefault = false;
  return clean;
}

export function sanitizeAddresses(addresses: any[]): any[] {
  return addresses.map(sanitizeAddressForApi);
}
