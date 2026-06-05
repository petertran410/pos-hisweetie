/**
 * Gợi ý địa chỉ (autocomplete) qua API công khai của TrackAsia.
 *
 * Endpoint: GET https://maps.track-asia.com/api/v2/place/autocomplete/json
 * Tài liệu: https://docs.track-asia.com/vi/api-integration/autocomplete/v2/
 *
 * - Dùng `new_admin=true` để trả địa chỉ theo địa giới hành chính mới (sau sáp nhập),
 *   khớp với dữ liệu Tỉnh/Phường mới trong public/data/.
 * - Key đọc từ NEXT_PUBLIC_TRACKASIA_API_KEY (key phía client, như Google Maps key),
 *   fallback "public_key" để vẫn chạy được khi chưa cấu hình.
 */

const TRACKASIA_AUTOCOMPLETE_URL =
  "https://maps.track-asia.com/api/v2/place/autocomplete/json";

const TRACKASIA_KEY =
  process.env.NEXT_PUBLIC_TRACKASIA_API_KEY || "public_key";

export interface TrackAsiaTerm {
  offset: number;
  value: string;
}

export interface TrackAsiaPrediction {
  place_id: string;
  description: string;
  formatted_address?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  terms?: TrackAsiaTerm[];
}

interface TrackAsiaResponse {
  status: string;
  predictions?: TrackAsiaPrediction[];
  error_message?: string;
}

/**
 * Lấy danh sách gợi ý địa chỉ theo chuỗi nhập vào.
 * @param input Chuỗi địa chỉ người dùng đang gõ.
 * @param signal AbortSignal để huỷ request cũ khi gõ tiếp.
 * @returns Mảng gợi ý ([] khi không có kết quả). Trả [] cho lỗi mạng để không chặn nhập tay.
 */
export async function autocompleteAddress(
  input: string,
  signal?: AbortSignal
): Promise<TrackAsiaPrediction[]> {
  const q = (input || "").trim();
  if (!q) return [];

  const params = new URLSearchParams({
    input: q,
    size: "6",
    key: TRACKASIA_KEY,
    new_admin: "true",
    include_old_admin: "true",
  });

  let res: Response;
  try {
    res = await fetch(`${TRACKASIA_AUTOCOMPLETE_URL}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch {
    // Lỗi mạng hoặc bị abort -> không gợi ý, người dùng vẫn nhập tay được.
    return [];
  }

  if (!res.ok) return [];

  let json: TrackAsiaResponse;
  try {
    json = (await res.json()) as TrackAsiaResponse;
  } catch {
    return [];
  }

  if (json.status !== "OK" || !Array.isArray(json.predictions)) return [];
  return json.predictions;
}

export interface AddressParts {
  /** Số nhà + tên đường (structured_formatting.main_text) */
  streetAddress: string;
  /** Tên Tỉnh/Thành phố mới (term cuối cùng) */
  provinceName: string;
  /** Tên Phường/Xã mới (term kế cuối) */
  wardName: string;
}

/**
 * Tách 1 gợi ý thành: số nhà/đường, tên tỉnh, tên phường (theo địa giới mới).
 *
 * Cấu trúc terms của TrackAsia: [số nhà+đường, (phường), tỉnh]
 * - phần tử cuối  = Tỉnh/Thành phố
 * - phần tử kế cuối = Phường/Xã (chỉ khi có >= 2 terms)
 */
export function extractAddressParts(
  prediction: TrackAsiaPrediction
): AddressParts {
  const terms = prediction.terms || [];
  const streetAddress =
    prediction.structured_formatting?.main_text ||
    terms[0]?.value ||
    prediction.description ||
    "";

  let provinceName = "";
  let wardName = "";
  if (terms.length >= 1) {
    provinceName = terms[terms.length - 1]?.value || "";
  }
  if (terms.length >= 2) {
    wardName = terms[terms.length - 2]?.value || "";
  }

  return { streetAddress, provinceName, wardName };
}
