import { apiClient } from "@/lib/config/api";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";

export type RecipeType = "SEMI_FINISHED" | "FINISHED_PRODUCT";
export type RecipeStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type IngredientSourceType = "PRODUCT" | "SEMI_FINISHED" | "CUSTOM";

export interface RecipeCategory {
  id: number;
  code?: string | null;
  name: string;
  type?: RecipeType | null;
}

export interface RecipeIngredientPayload {
  id?: number;
  sourceType: IngredientSourceType;
  productId?: number;
  recipeReferenceId?: number;
  ingredientId?: number;
  customName?: string;
  customUnit?: string;
  customPrice?: number;
  quantity: number;
  unit?: string;
  includeInCost?: boolean;
  isInternal?: boolean;
  isTemporary?: boolean;
  note?: string;
  sortOrder?: number;
  product?: RecipeIngredientProduct;
  recipeReference?: { id: number; code: string; name: string; type: RecipeType; status: RecipeStatus; quantityUnit?: "ml" | "gram" | null; costPerOutputUnit?: number | null };
  costSnapshot?: number | null;
  unitCostSnapshot?: number | null;
}

export interface RecipeStepPayload {
  id?: number;
  title?: string;
  content: string;
  tools?: unknown;
  notes?: string;
  sortOrder?: number;
}

export interface RecipeMediaPayload {
  id?: number;
  mediaType: "IMAGE" | "VIDEO";
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  altText?: string;
  sortOrder?: number;
}

export interface RecipeComment {
  id: number;
  recipeId: number;
  authorId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: number; name: string; avatar?: string | null };
}

export interface Recipe {
  id: number;
  code: string;
  name: string;
  type: RecipeType;
  status: RecipeStatus;
  categoryId?: number | null;
  category?: RecipeCategory | null;
  outputProductId?: number | null;
  outputProduct?: { id: number; code: string; name: string; unit?: string | null } | null;
  description?: string | null;
  quantity?: number | null;
  quantityUnit?: "ml" | "gram" | null;
  unit?: string | null;
  storage?: string | null;
  currencyCode?: string;
  costStatus?: "FRESH" | "STALE" | "CALCULATING" | "ERROR";
  materialCost?: number | null;
  semiFinishedCost?: number | null;
  customCost?: number | null;
  totalCost?: number | null;
  liveTotalCost?: number | null;
  costPerOutputUnit?: number | null;
  changeNote?: string | null;
  publishedAt?: string | null;
  ingredients: RecipeIngredientPayload[];
  steps: RecipeStepPayload[];
  images: RecipeMediaPayload[];
  thumbnail?: RecipeMediaPayload | null;
  createdAt: string;
  updatedAt: string;
  _count?: { referencedByIngredients: number };
}

export interface RecipePayload {
  code?: string;
  name: string;
  type: RecipeType;
  categoryId?: number | null;
  outputProductId?: number | null;
  description?: string | null;
  quantity?: number | null;
  quantityUnit?: "ml" | "gram" | null;
  unit?: string | null;
  storage?: string | null;
  changeNote?: string | null;
  ingredients?: RecipeIngredientPayload[];
  steps?: RecipeStepPayload[];
  media?: RecipeMediaPayload[];
}

export interface RecipeQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  ingredientFilters?: string[];
  type?: RecipeType;
  status?: RecipeStatus;
  categoryId?: number;
  orderBy?: "name" | "code" | "updatedAt" | "createdAt" | "totalCost";
  orderDirection?: "asc" | "desc";
}

export interface RecipeIngredientFilterOption {
  value: string;
  label: string;
  group: "Sản phẩm" | "Bán thành phẩm" | "Nguyên liệu ngoài";
}

export interface RecipeIngredientProduct {
  id: number;
  code: string;
  name: string;
  unit?: string | null;
  basePrice?: number;
  conversionValue?: number;
  weight?: number | null;
  weightUnit?: string | null;
  retailPrice?: number | null;
  netWeightGram?: number | null;
  unitCost?: number | null;
}

export interface SemiFinishedRecipeOption {
  id: number;
  code: string;
  name: string;
  quantityUnit?: "ml" | "gram" | null;
  costPerOutputUnit?: number | null;
}

export interface RecipeListResponse {
  data: Recipe[];
  total: number;
  page: number;
  limit: number;
}

export const recipesApi = {
  getAll: (params?: RecipeQueryParams) =>
    apiClient.get<RecipeListResponse>("/recipes", params),
  getById: (id: number) => apiClient.get<Recipe>(`/recipes/${id}`),
  getComments: (id: number) => apiClient.get<RecipeComment[]>(`/recipes/${id}/comments`),
  createComment: (id: number, content: string) =>
    apiClient.post<RecipeComment>(`/recipes/${id}/comments`, { content }),
  updateComment: (id: number, content: string) =>
    apiClient.patch<RecipeComment>(`/recipe-comments/${id}`, { content }),
  deleteComment: (id: number) => apiClient.delete<{ success: true }>(`/recipe-comments/${id}`),
  getCategories: () => apiClient.get<RecipeCategory[]>("/recipe-categories"),
  getIngredientOptions: () =>
    apiClient.get<RecipeIngredientFilterOption[]>("/recipes/ingredient-options"),
  getIngredientProducts: (search?: string) =>
    apiClient.get<RecipeIngredientProduct[]>("/recipes/ingredient-products", {
      search: search || undefined,
    }),
  getSemiFinishedOptions: (search?: string, excludeId?: number) =>
    apiClient.get<SemiFinishedRecipeOption[]>("/recipes/semi-finished-options", {
      search: search || undefined,
      excludeId,
    }),
  createCategory: (data: { name: string; type?: RecipeType }) =>
    apiClient.post<RecipeCategory>("/recipe-categories", data),
  create: (data: RecipePayload) => apiClient.post<Recipe>("/recipes", data),
  update: (id: number, data: Partial<RecipePayload>) =>
    apiClient.patch<Recipe>(`/recipes/${id}`, data),
  remove: (id: number) => apiClient.delete(`/recipes/${id}`),
  publish: (id: number, changeNote?: string) =>
    apiClient.post<Recipe>(`/recipes/${id}/publish`, { changeNote }),
  unpublish: (id: number) => apiClient.post<Recipe>(`/recipes/${id}/unpublish`),
  archive: (id: number) => apiClient.post<Recipe>(`/recipes/${id}/archive`),
  restore: (id: number) => apiClient.post<Recipe>(`/recipes/${id}/restore`),
  clone: (id: number, data?: { code?: string; name?: string }) =>
    apiClient.post<Recipe>(`/recipes/${id}/clone`, data || {}),
  getDependencies: (id: number) => apiClient.get(`/recipes/${id}/dependencies`),
  uploadMedia: async (files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    const token = useAuthStore.getState().token;
    const response = await fetch(`${API_URL}/upload/files?subfolder=recipes`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!response.ok) throw new Error("Không thể upload media");
    return response.json() as Promise<{ items: Array<{ url: string; originalname: string; mimetype: string }>; errors: Array<{ originalname: string; reason: string }> }>;
  },
};
