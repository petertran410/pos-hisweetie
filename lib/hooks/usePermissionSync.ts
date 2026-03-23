import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/auth";
import { useBranchStore } from "../store/branch";
import { authApi } from "../api/auth";

const SYNC_INTERVAL = 5 * 60 * 1000;

export function usePermissionSync() {
  const { token, user, setAuth } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token || !user) return;

    const syncPermissions = async () => {
      try {
        const branchId = useBranchStore.getState().selectedBranch?.id;
        const profile = await authApi.getProfile(token, branchId || undefined);
        if (profile && profile.permissions) {
          const currentPerms = JSON.stringify(user.permissions);
          const newPerms = JSON.stringify(profile.permissions);

          if (currentPerms !== newPerms) {
            setAuth(
              {
                ...user,
                permissions: profile.permissions,
                branchIds: profile.branchIds || user.branchIds,
                roles: profile.roles || user.roles,
              },
              token
            );
          }
        }
      } catch {}
    };

    syncPermissions();

    intervalRef.current = setInterval(syncPermissions, SYNC_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);
}
