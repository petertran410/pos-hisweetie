"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { usePermissionSync } from "@/lib/hooks/usePermissionSync";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  usePermissionSync();
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <DashboardHeader />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
