"use client";

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useEffect, useState } from "react";
import { initBranchCrossTabSync } from "@/lib/store/branch";
import { initNotificationPrefsCrossTabSync } from "@/lib/store/notificationPrefs";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          // Xử lý lỗi tập trung cho tất cả useQuery (fires 1 lần sau khi hết retry)
          onError: (error: { status?: number; message?: string }) => {
            const status = error?.status;

            // 401: đã tự clear auth + redirect sang /login → không cần toast.
            if (status === 401) return;

            // 403 (không có quyền): KHÔNG popup. UI đã chủ động ẩn chức năng
            // user không có quyền (useFilteredNav/usePermission/PagePermissionGuard),
            // nên toast 403 chỉ gây phiền (spam mỗi lần reload/refetch query).
            if (status === 403) return;

            toast.error(error.message || "Có lỗi xảy ra");
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // Không retry trên 4xx — tránh gọi lại server vô ích
            retry: (failureCount, error: Error) => {
              const status = (error as Error & { status?: number }).status;
              if (status && status >= 400 && status < 500) return false;
              return failureCount < 2;
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

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

  // Đồng bộ trạng thái "tắt thông báo" (mute chuông) giữa các tab.
  useEffect(() => initNotificationPrefsCrossTabSync(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* closeButton: mọi toast đều có nút X để người dùng tắt nhanh. */}
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            // Sonner mặc định đặt nút X ở góc TRÁI và chỉ rõ khi hover.
            // Đưa sang phải + luôn hiển thị cho dễ bấm (nhất là trên mobile).
            // Nét chữ X (svg stroke) dày hơn + màu đậm hơn cho dễ thấy.
            closeButton:
              "!left-auto !right-0 !top-0 !translate-x-1/3 !-translate-y-1/3 !opacity-100 !text-gray-700 !border-gray-300 hover:!bg-gray-100 [&>svg]:!stroke-[2.5] [&>svg]:!w-3.5 [&>svg]:!h-3.5",
          },
        }}
      />
      {children}
    </QueryClientProvider>
  );
}
