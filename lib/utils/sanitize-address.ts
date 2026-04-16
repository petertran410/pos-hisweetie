/**
 * Loại bỏ các field không có trong CustomerAddressDto
 * (customerId, createdAt, updatedAt, ...) trước khi gửi API.
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

export function sanitizeAddressForApi(
  addr: Record<string, any>
): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const key of ALLOWED_FIELDS) {
    const val = addr[key];
    if (val === null || val === undefined || val === "") continue;

    if (key === "id") {
      clean.id = typeof val === "number" ? val : parseInt(val, 10);
    } else if (key === "isDefault") {
      clean.isDefault = Boolean(val);
    } else {
      clean[key] = String(val);
    }
  }

  if (clean.isDefault === undefined) clean.isDefault = false;
  return clean;
}

export function sanitizeAddresses(addresses: any[]): any[] {
  return addresses.map(sanitizeAddressForApi);
}
