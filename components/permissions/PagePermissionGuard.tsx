"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";

interface PagePermissionGuardProps {
  resource: string;
  action: string;
  scope?: string;
  redirectTo?: string;
  children: React.ReactNode;
}

export function PagePermissionGuard({
  resource,
  action,
  scope,
  redirectTo = "/",
  children,
}: PagePermissionGuardProps) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const hasPermission = usePermission(resource, action, scope);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && !hasPermission) {
      router.replace(redirectTo);
    }
  }, [hasPermission, _hasHydrated, isAuthenticated, router, redirectTo]);

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Không có quyền truy cập
          </h1>
          <p className="text-gray-600 mb-6">
            Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị
            viên để được cấp quyền.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
