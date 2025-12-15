import { useQuery } from "@tanstack/react-query";
import { variantsApi } from "@/lib/api/variants";

export const useVariants = () => {
  return useQuery({
    queryKey: ["variants"],
    queryFn: variantsApi.getVariants,
  });
};
