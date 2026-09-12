import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { API_URL, getAuthHeaders } from "../config/api";

export interface UseAllPackingParams {
  branchId?: number;
  branchIds?: number[];
  type?: "all" | "giao-hang" | "dong-hang" | "loading" | string;
  search?: string;
  invoiceSearch?: string;
  customerSearch?: string;
  paymentMethod?: string;
  fromCreatedDate?: string;
  toCreatedDate?: string;
  pageSize?: number;
  currentItem?: number;
  [key: string]: unknown;
}

export function useAllPacking(
  params?: UseAllPackingParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["all-packing", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.branchId) queryParams.append("branchId", String(params.branchId));
      if (params?.branchIds?.length) {
        params.branchIds.forEach((id: number) =>
          queryParams.append("branchIds", String(id))
        );
      }
      if (params?.type) queryParams.append("type", params.type);
      if (params?.search) queryParams.append("search", params.search);
      if (params?.invoiceSearch)
        queryParams.append("invoiceSearch", params.invoiceSearch);
      if (params?.customerSearch)
        queryParams.append("customerSearch", params.customerSearch);
      if (params?.paymentMethod)
        queryParams.append("paymentMethod", params.paymentMethod);
      if (params?.fromCreatedDate)
        queryParams.append("fromCreatedDate", params.fromCreatedDate);
      if (params?.toCreatedDate)
        queryParams.append("toCreatedDate", params.toCreatedDate);
      if (params?.pageSize) queryParams.append("pageSize", String(params.pageSize));
      if (params?.currentItem !== undefined && params?.currentItem !== null)
        queryParams.append("currentItem", String(params.currentItem));

      const res = await fetch(
        `${API_URL}/all-packing?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch all packing");
      return res.json();
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
