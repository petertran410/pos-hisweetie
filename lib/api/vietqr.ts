/**
 * Tra cứu thông tin doanh nghiệp / hộ kinh doanh / cá nhân theo mã số thuế
 * qua API công khai của VietQR.io.
 *
 * Endpoint: GET https://api.vietqr.io/v2/business/{taxCode}
 * - Không cần API key, CORS mở (gọi trực tiếp từ trình duyệt được).
 * - Nguồn dữ liệu: tổng hợp từ Cục Thuế (gdt.gov.vn).
 */

const VIETQR_BUSINESS_URL = "https://api.vietqr.io/v2/business";

export interface VietQrBusiness {
  id: string;
  name: string;
  internationalName: string | null;
  shortName: string | null;
  address: string | null;
  status: string | null;
}

export interface VietQrMetadata {
  disclaimer?: string;
  source?: string;
  updatedAt?: string;
  contact?: string;
}

export interface VietQrResponse {
  code: string;
  desc: string;
  data: VietQrBusiness | null;
  metadata?: VietQrMetadata;
}

/**
 * Tra cứu thông tin theo mã số thuế.
 * @throws Error với message tiếng Việt thân thiện khi không tìm thấy / quá tải / lỗi mạng.
 */
export async function lookupBusinessByTaxCode(
  taxCode: string
): Promise<VietQrBusiness> {
  const code = (taxCode || "").trim();
  if (!code) {
    throw new Error("Vui lòng nhập mã số thuế");
  }

  let res: Response;
  try {
    res = await fetch(`${VIETQR_BUSINESS_URL}/${encodeURIComponent(code)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("Không thể tra cứu mã số thuế, thử lại sau");
  }

  if (res.status === 429) {
    throw new Error("Hệ thống tra cứu đang quá tải, thử lại sau ít phút");
  }

  if (!res.ok) {
    throw new Error("Không thể tra cứu mã số thuế, thử lại sau");
  }

  let json: VietQrResponse;
  try {
    json = (await res.json()) as VietQrResponse;
  } catch {
    throw new Error("Không thể tra cứu mã số thuế, thử lại sau");
  }

  if (json.code !== "00" || !json.data) {
    throw new Error("Không tìm thấy thông tin mã số thuế");
  }

  return json.data;
}
