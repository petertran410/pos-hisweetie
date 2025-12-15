import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api/categories";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getCategories,
  });
};

export const useRootCategories = () => {
  return useQuery({
    queryKey: ["categories", "roots"],
    queryFn: categoriesApi.getRootCategories,
  });
};
