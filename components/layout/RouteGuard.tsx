"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { getRoutePermission } from "@/lib/permissions/registry";
import { authApi } from "@/lib/api/auth";

const SUPER_ADMIN_ROLE = "Super Admin";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    _hasHydrated,
    isProfileSynced,
    setAuth,
    clearAuth,
  } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  // Tránh fetch chồng chéo cho cùng một (token, branchId).
  const lastSyncedKey = useRef<string | null>(null);

  // Refetch /auth/profile khi:
  // - Vừa rehydrate xong và có token nhưng chưa sync trong session này.
  // - selectedBranch thay đổi (permissions phụ thuộc branch).
  // Điều này đảm bảo permissions trên localStorage không bao giờ bị stale
  // quá 1 lần load trang. Nếu token đã invalidate (permissionVersion lệch),
  // backend trả 401 → clearAuth + redirect /login.
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !token || !user) return;

    const branchId = selectedBranch?.id;
    const key = `${token}:${branchId ?? ""}`;
    if (lastSyncedKey.current === key && isProfileSynced) return;

    let cancelled = false;
    lastSyncedKey.current = key;

    (async () => {
      try {
        const profile = await authApi.getProfile(token, branchId);
        if (cancelled) return;
        setAuth(profile, token);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        // 401 → token cũ/permissionVersion lệch → đá về login
        if (message) {
          // Lỗi mạng hoặc 5xx: không clear auth, để user retry.
          // Chỉ clear khi chắc chắn là lỗi auth.
          const msg = message.toLowerCase();
          if (
            msg.includes("unauthorized") ||
            msg.includes("đăng nhập") ||
            msg.includes("token") ||
            msg.includes("quyền của bạn đã được thay đổi")
          ) {
            clearAuth();
            if (typeof window !== "undefined") {
              sessionStorage.setItem(
                "auth-error",
                "Quyền của bạn đã được thay đổi. Vui lòng đăng nhập lại."
              );
              window.location.href = "/login";
            }
            return;
          }
        }
        // Lỗi khác (mạng, 5xx): giữ permissions cũ, log để debug.
        console.error("[RouteGuard] sync profile failed:", err);
        // Cho phép thử lại lần sau nếu key đổi
        lastSyncedKey.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    _hasHydrated,
    isAuthenticated,
    token,
    user,
    selectedBranch?.id,
    isProfileSynced,
    setAuth,
    clearAuth,
  ]);

  // Route-level guard: chặn truy cập trang không có quyền (sau khi đã sync).
  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated || !user) return;
    // Chưa sync xong → đợi (dùng cache cũ để check sẽ sai).
    if (!isProfileSynced) return;
    if (user.roles?.includes(SUPER_ADMIN_ROLE)) return;

    const required = getRoutePermission(pathname);
    if (!required) return;

    if (Array.isArray(required)) {
      const hasAny = required.some((def) =>
        user.permissions?.includes(`${def.resource}:${def.action}`)
      );
      if (!hasAny) router.replace("/");
    } else {
      const key = `${required.resource}:${required.action}`;
      if (!user.permissions?.includes(key)) router.replace("/");
    }
  }, [
    pathname,
    user,
    isAuthenticated,
    _hasHydrated,
    isProfileSynced,
    router,
  ]);

  return <>{children}</>;
}
