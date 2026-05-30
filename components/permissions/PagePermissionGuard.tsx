"use client";

import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { ShieldOff } from "lucide-react";
import Link from "next/link";

interface PagePermissionGuardProps {
  resource: string;
  action: string;
  children: React.ReactNode;
}

export function PagePermissionGuard({
  resource,
  action,
  children,
}: PagePermissionGuardProps) {
  const { _hasHydrated, isProfileSynced, isAuthenticated } = useAuthStore();
  const hasPermission = usePermission(resource, action);

  // Hiện loading khi:
  // - Chưa rehydrate localStorage xong, HOẶC
  // - Đã đăng nhập nhưng chưa sync profile từ backend trong session hiện tại.
  //   Đây là điểm quan trọng: tránh hiện UI "Không có quyền" dựa trên
  //   permissions cache cũ (snapshot lúc login lần trước, có thể đã stale
  //   nếu admin vừa cấp/sửa quyền). RouteGuard chịu trách nhiệm fetch
  //   /auth/profile và bật cờ isProfileSynced khi xong.
  if (!_hasHydrated || (isAuthenticated && !isProfileSynced)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-500 mb-6">
            Tài khoản của bạn chưa được cấp quyền truy cập chức năng này. Vui
            lòng liên hệ quản trị viên.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Về trang chủ
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Quyền cần thiết: {resource}:{action}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
