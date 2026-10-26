"use client";

import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { SepayPendingNotifier } from "@/components/sepay/SepayPendingNotifier";
<<<<<<< HEAD
import { RealtimeSync } from "@/lib/realtime/useRealtimeSync";
=======
import { ZaloChatSidebar } from "@/components/chat/ZaloChatSidebar";
>>>>>>> build_report

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <RouteGuard>
          <div
            className="flex flex-col"
            style={{ height: "calc(100vh / 0.85)" }}>
            <DashboardHeader />
            <div className="flex flex-1 min-h-0">
              <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
              <ZaloChatSidebar />
            </div>
          </div>
          <SepayPendingNotifier />
          <RealtimeSync />
        </RouteGuard>
      </ProtectedRoute>
    </Suspense>
  );
}
