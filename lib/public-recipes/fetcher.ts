import type { PublicRecipe, RecipeListResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

async function publicFetch<T>(path: string): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL chưa được cấu hình");
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const error = new Error(`Public recipes request failed: ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export function getPublicRecipes(params: {
  search?: string;
  type?: string;
  categoryId?: string;
  sort?: "newest" | "name" | "cost";
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams({
    sort: params.sort || "newest",
    page: String(params.page || 1),
    limit: String(params.limit || 9),
  });
  if (params.search) query.set("search", params.search);
  if (params.type) query.set("type", params.type);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  return publicFetch<RecipeListResponse>(`/public/recipes?${query}`);
}

export async function getPublicRecipe(slug: string) {
  try {
    return await publicFetch<PublicRecipe>(`/public/recipes/${encodeURIComponent(slug)}`);
  } catch (error) {
    if ((error as { status?: number }).status === 404) return null;
    throw error;
  }
}
