"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated) {
      if (isAuthenticated) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, _hasHydrated, router]);

  return (
    <div>
      <DashboardHeader />
      <div className="p-6">
        <h1 className="text-2xl font-bold">Home</h1>
        <p className="text-gray-600 mt-2">Trang này đang được phát triển</p>
      </div>
    </div>
  );
}
