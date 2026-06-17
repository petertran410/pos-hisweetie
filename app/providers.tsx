"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { initBranchCrossTabSync } from "@/lib/store/branch";

// Nhớ các thông báo "không có quyền" (403) đã hiển thị để chỉ toast 1 lần,
// tránh lặp lại mỗi khi người dùng chuyển trang trong cùng phiên app.
const shownForbiddenMessages = new Set<string>();

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // Xử lý lỗi tập trung cho tất cả useQuery (fires 1 lần sau khi hết retry)
          onError: (error: any, query) => {
            const status = error?.status;

            // 401: đã tự clear auth + redirect sang /login → không cần toast.
            if (status === 401) return;

            // Query "tra cứu phụ" (vd: product picker trong form) có thể tự
            // tắt toast lỗi toàn cục qua meta.silentForbidden — tránh popup
            // "không có quyền" khi UI đã chủ động ẩn chức năng đó.
            if (status === 403 && query?.meta?.silentForbidden) return;

            // 403 (không có quyền): chỉ hiển thị 1 lần cho mỗi nội dung,
            // không spam mỗi lần chuyển trang/refetch.
            if (status === 403) {
              const message =
                error?.message || "Bạn không có quyền thực hiện thao tác này";
              if (shownForbiddenMessages.has(message)) return;
              shownForbiddenMessages.add(message);
              toast.error(message, { id: `forbidden:${message}` });
              return;
            }

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

  // Đồng bộ chi nhánh giữa các tab: khi 1 tab đổi chi nhánh, các tab còn lại
  // cập nhật selectedBranch (qua sự kiện `storage`) rồi invalidate toàn bộ
  // query để dữ liệu tự refetch theo chi nhánh mới (header X-Branch-Id).
  // RouteGuard reactive theo selectedBranch?.id nên permissions cũng tự đồng bộ.
  useEffect(() => {
    const cleanup = initBranchCrossTabSync(() => {
      queryClient.invalidateQueries();
    });
    return cleanup;
  }, [queryClient]);

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
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
