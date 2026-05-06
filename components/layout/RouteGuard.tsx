"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { getRoutePermission } from "@/lib/permissions/registry";

const SUPER_ADMIN_ROLE = "Super Admin";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !user) return;

    if (user.roles?.includes(SUPER_ADMIN_ROLE)) return;

    const required = getRoutePermission(pathname);
    if (!required) return;

    const key = `${required.resource}:${required.action}`;
    if (!user.permissions?.includes(key)) {
      router.replace("/");
    }
  }, [pathname, user, isAuthenticated, _hasHydrated, router]);

  return <>{children}</>;
}
