import type { PublicPriceData } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

/** Bản đã xuất bản của bảng giá public (server component). null = chưa xuất bản. */
export async function getPublicPriceData(): Promise<PublicPriceData | null> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL chưa được cấu hình");
  const response = await fetch(`${API_URL}/public/price-page`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Public price request failed: ${response.status}`);
  return response.json() as Promise<PublicPriceData>;
}
