import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: usersApi.getUsers,
  });
}

export function useUser(id: number | null) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => usersApi.getUser(id!),
    enabled: !!id,
  });
}
