"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";

/**
 * Chặn trang tài chính nội bộ: vào được khi user có một trong các quyền đã nêu
 * ở ít nhất một chi nhánh được truy cập.
 */
export function FinancePageGuard({
  permissions,
  children,
}: {
  permissions: Array<{ resource: string; action: string }>;
  children: React.ReactNode;
}) {
  const access = useFinanceAccess();

  if (!access.ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand" />
      </div>
    );
  }

  const allowed = permissions.some((permission) =>
    access.any(permission.resource, permission.action),
  );
  if (!allowed) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldOff className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-800">
            Không có quyền truy cập
          </h2>
          <p className="mb-6 text-gray-500">
            Tài khoản của bạn chưa được cấp quyền chức năng này ở chi nhánh nào
            bạn được truy cập. Vui lòng liên hệ quản trị viên.
          </p>
          <Link
            href="/"
            className="rounded-lg bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
