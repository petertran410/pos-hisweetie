import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RecipePayload, RecipeQueryParams, recipesApi } from "@/lib/api/recipes";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useRecipes(params?: RecipeQueryParams) {
  return useQuery({
    queryKey: ["recipes", params ?? {}],
    queryFn: () => recipesApi.getAll(params),
    staleTime: 60_000,
  });
}

export function useRecipe(id?: number) {
  return useQuery({
    queryKey: ["recipes", "detail", id],
    queryFn: () => recipesApi.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRecipeComments(id?: number) {
  return useQuery({
    queryKey: ["recipes", "comments", id],
    queryFn: () => recipesApi.getComments(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateRecipeComment(recipeId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => recipesApi.createComment(recipeId, content),
    onSuccess: () => client.invalidateQueries({ queryKey: ["recipes", "comments", recipeId] }),
    onError: (e) => toast.error(errorMessage(e, "Không thể gửi bình luận")),
  });
}

export function useUpdateRecipeComment(recipeId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) => recipesApi.updateComment(id, content),
    onSuccess: () => client.invalidateQueries({ queryKey: ["recipes", "comments", recipeId] }),
    onError: (e) => toast.error(errorMessage(e, "Không thể sửa bình luận")),
  });
}

export function useDeleteRecipeComment(recipeId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.deleteComment,
    onSuccess: () => client.invalidateQueries({ queryKey: ["recipes", "comments", recipeId] }),
    onError: (e) => toast.error(errorMessage(e, "Không thể xóa bình luận")),
  });
}

export function useRecipeCategories() {
  return useQuery({
    queryKey: ["recipe-categories"],
    queryFn: recipesApi.getCategories,
    staleTime: 5 * 60_000,
  });
}

export function useRecipeIngredientOptions() {
  return useQuery({
    queryKey: ["recipe-ingredient-options"],
    queryFn: recipesApi.getIngredientOptions,
    staleTime: 5 * 60_000,
  });
}

export function useRecipeIngredientProducts(search?: string, enabled = true) {
  return useQuery({
    queryKey: ["recipe-ingredient-products", search || ""],
    queryFn: () => recipesApi.getIngredientProducts(search),
    enabled,
    staleTime: 60_000,
  });
}

export function useSemiFinishedRecipeOptions(search?: string, excludeId?: number, enabled = true) {
  return useQuery({
    queryKey: ["recipe-semi-finished-options", search || "", excludeId],
    queryFn: () => recipesApi.getSemiFinishedOptions(search, excludeId),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateRecipeCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.createCategory,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["recipe-categories"] });
      toast.success("Đã tạo nhóm công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể tạo nhóm công thức")),
  });
}

export function useCreateRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.create,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipe-ingredient-options"] });
      toast.success("Đã tạo công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể tạo công thức")),
  });
}

export function useUpdateRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecipePayload> }) =>
      recipesApi.update(id, data),
    onSuccess: (recipe) => {
      client.setQueryData(["recipes", "detail", recipe.id], recipe);
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipe-ingredient-options"] });
      toast.success("Đã lưu công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể lưu công thức")),
  });
}

export function usePublishRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changeNote }: { id: number; changeNote?: string }) =>
      recipesApi.publish(id, changeNote),
    onSuccess: (recipe) => {
      client.setQueryData(["recipes", "detail", recipe.id], recipe);
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipe-ingredient-options"] });
      toast.success("Đã publish công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể publish công thức")),
  });
}

export function useUnpublishRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => recipesApi.unpublish(id),
    onSuccess: (recipe) => {
      client.setQueryData(["recipes", "detail", recipe.id], recipe);
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipes", "detail", recipe.id] });
      toast.success("Đã bỏ phiên bản công khai");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể bỏ phiên bản công khai")),
  });
}

export function useArchiveRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.archive,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipe-ingredient-options"] });
      toast.success("Đã lưu trữ công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể lưu trữ công thức")),
  });
}

export function useRestoreRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.restore,
    onSuccess: (recipe) => {
      client.setQueryData(["recipes", "detail", recipe.id], recipe);
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipe-ingredient-options"] });
      toast.success("Đã khôi phục công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể khôi phục công thức")),
  });
}

export function useDeleteRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recipesApi.remove,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["recipes"] });
      client.invalidateQueries({ queryKey: ["recipe-ingredient-options"] });
      toast.success("Đã xóa công thức");
    },
    onError: (e) => toast.error(errorMessage(e, "Không thể xóa công thức")),
  });
}
