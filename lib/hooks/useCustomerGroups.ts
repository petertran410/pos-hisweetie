import { useQuery } from "@tanstack/react-query";
import { customerGroupsApi } from "@/lib/api/customer-groups";

export function useCustomerGroups() {
  return useQuery({
    queryKey: ["customer-groups"],
    queryFn: customerGroupsApi.getCustomerGroups,
  });
}
