"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import "@/app/dashboard.css";

export default function BaoDonLayout({
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand" />
      </div>
    );
  }

  return <div className="dt-dash min-h-screen">{children}</div>;
}
