import type { Metadata } from "next";
import { getPublicRecipes } from "@/lib/public-recipes/fetcher";
import CatalogueClient from "./CatalogueClient";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] : item || "";
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const params = await searchParams;
  const query = value(params, "search");
  return { title: query ? `Công thức cho “${query}” | Diệp Trà` : "Catalogue Công Thức | Diệp Trà", description: "Thư viện công thức pha chế chuẩn hóa dành cho đối tác F&B của Diệp Trà.", alternates: { canonical: "/cong-thuc" } };
}

export default async function RecipesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, Number(value(params, "page")) || 1);
  const sort = (["newest", "name", "cost"] as const).includes(value(params, "sort") as "newest" | "name" | "cost") ? value(params, "sort") as "newest" | "name" | "cost" : "newest";
  const result = await getPublicRecipes({ search: value(params, "search"), type: value(params, "type"), categoryId: value(params, "categoryId"), sort, page, limit: 9 });
  return <CatalogueClient result={result} query={{ search: value(params, "search"), type: value(params, "type"), categoryId: value(params, "categoryId"), sort, page }} />;
}
