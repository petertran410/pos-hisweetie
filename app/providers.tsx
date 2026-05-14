"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useState } from "react";
import { useAuthStore } from "@/lib/store/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // Xử lý lỗi tập trung cho tất cả useQuery (fires 1 lần sau khi hết retry)
          onError: (error: any) => {
            toast.error(error.message || "Có lỗi xảy ra");
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // Không retry trên 4xx — tránh gọi lại server vô ích
            retry: (failureCount, error: any) => {
              if (error?.status >= 400 && error?.status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  const { _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      {children}
    </QueryClientProvider>
  );
}
