import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicRecipe } from "@/lib/public-recipes/fetcher";
import DetailClient from "./DetailClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getPublicRecipe(slug);
  if (!recipe) return { title: "Không tìm thấy công thức | Diệp Trà" };
  return { title: `${recipe.name} | Diệp Trà`, description: recipe.description || `Công thức ${recipe.name} từ Diệp Trà.`, alternates: { canonical: `/cong-thuc/${recipe.slug}` }, openGraph: { title: recipe.name, description: recipe.description || undefined, images: recipe.thumbnail ? [recipe.thumbnail] : [] } };
}

export default async function RecipeDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const recipe = await getPublicRecipe(slug);
  if (!recipe) notFound();
  const image = recipe.media.find(item => item.type.toLowerCase() === "image")?.url || recipe.thumbnail || undefined;
  const jsonLd = { "@context": "https://schema.org", "@type": "Recipe", name: recipe.name, description: recipe.description || undefined, image: image ? [image] : undefined, datePublished: recipe.publishedAt, recipeYield: recipe.yield.label, recipeIngredient: recipe.ingredients.map(item => `${item.quantity} ${item.unit} ${item.name}`), recipeInstructions: [...recipe.steps].sort((a, b) => a.sortOrder - b.sortOrder).map(item => ({ "@type": "HowToStep", name: item.title || undefined, text: item.content })) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><DetailClient recipe={recipe} /></>;
}
