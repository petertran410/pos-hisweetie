"use client";

import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PermissionProvider } from "@/lib/contexts/PermissionContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ProtectedRoute>
        <PermissionProvider>
          <div className={`${inter.className} flex flex-col min-h-screen`}>
            <DashboardHeader />
            <main className="flex-1 overflow-hidden">{children}</main>
            <Toaster position="top-right" richColors />
          </div>
        </PermissionProvider>
      </ProtectedRoute>
    </QueryClientProvider>
  );
}
