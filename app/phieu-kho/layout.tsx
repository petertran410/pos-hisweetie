"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import "@/app/dashboard.css";

/** Trang riêng tạo phiếu kho trên điện thoại (giống /bao-don): chỉ có header. */
export default function PhieuKhoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, _hasHydrated, router, pathname]);

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="dt-dash flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
