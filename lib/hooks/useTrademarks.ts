import { useQuery } from "@tanstack/react-query";
import { trademarksApi } from "@/lib/api/trademarks";

export const useTrademarks = () => {
  return useQuery({
    queryKey: ["trademarks"],
    queryFn: trademarksApi.getTrademarks,
  });
};
