import type { PublicPriceData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Bản đã xuất bản thay đổi chậm: server Next giữ cache 30 giây (bấm Xuất bản → khách thấy sau tối đa 30 giây). */
const REVALIDATE_SECONDS = 30;

/**
 * Bản đã xuất bản của bảng giá public (server component). null = chưa xuất bản.
 * Phải cache: mọi lượt xem đều gọi API từ cùng 1 IP (server Next) → chung 1 bucket rate-limit
 * 300 request/phút của backend; không cache thì người ngoài spam trang là làm 429 cho mọi khách.
 * Lần làm mới bị lỗi thì Next vẫn trả bản cũ trong cache.
 */
export async function getPublicPriceData(): Promise<PublicPriceData | null> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL chưa được cấu hình");
  const response = await fetch(`${API_URL}/public/price-page`, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Public price request failed: ${response.status}`);
  return response.json() as Promise<PublicPriceData>;
}
