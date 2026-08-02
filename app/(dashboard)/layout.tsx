"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SepayPendingNotifier } from "@/components/sepay/SepayPendingNotifier";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <RouteGuard>
        <div className="flex flex-col" style={{ height: "calc(100vh / 0.85)" }}>
          <DashboardHeader />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
        <SepayPendingNotifier />
      </RouteGuard>
    </ProtectedRoute>
  );
}
