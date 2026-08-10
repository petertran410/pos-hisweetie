export type RecipeType = "FINISHED_PRODUCT" | "SEMI_FINISHED";

export type PublicRecipeCard = {
  slug: string;
  name: string;
  type: RecipeType;
  description: string | null;
  category: { id: number; name: string; type?: RecipeType | null } | null;
  yield: { quantity: number | null; quantityUnit: string | null; unit: string | null; label: string };
  totalCost: number | null;
  costPerOutputUnit: number | null;
  thumbnail: string | null;
  mediaCounts: { images: number; videos: number };
  publishedAt: string | null;
};

export type PublicRecipe = PublicRecipeCard & {
  media: Array<{ type: "IMAGE" | "VIDEO"; url: string; altText: string | null; sortOrder: number }>;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string | null;
    note: string | null;
    lineCost: number | null;
    includeInCost: boolean;
  }>;
  steps: Array<{
    title: string | null;
    content: string;
    notes: string | null;
    sortOrder: number;
  }>;
  storage: unknown;
  related: PublicRecipeCard[];
};

export type RecipeListResponse = {
  data: PublicRecipeCard[];
  total: number;
  page: number;
  limit: number;
  categories: Array<{ id: number; name: string; type?: RecipeType | null }>;
};
