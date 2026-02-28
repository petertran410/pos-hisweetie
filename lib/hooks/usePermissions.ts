import { useMemo } from "react";
import { useAuthStore } from "../store/auth";

export function usePermission(resource: string, action: string): boolean {
  const { user } = useAuthStore();

  if (!user || !user.permissions) {
    return false;
  }

  const permissionKey = `${resource}:${action}`;
  return user.permissions.includes(permissionKey);
}
