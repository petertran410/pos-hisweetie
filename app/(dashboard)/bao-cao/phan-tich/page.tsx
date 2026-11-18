"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAnalyticsEntry } from "@/components/reports/analytics/useAnalyticsEntry";

// Vào nhóm Phân tích → mở báo cáo đầu tiên user có quyền.
export default function AnalyticsIndexPage() {
  const router = useRouter();
  const { target, prefetch } = useAnalyticsEntry();

  useEffect(() => {
    if (!target) return;
    prefetch(); // hỏi số liệu song song với lúc chuyển trang
    router.replace(target);
  }, [target, prefetch, router]);

  return (
    <div className="flex-1 grid place-items-center text-sm text-gray-500">
      {target ? (
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand" />
      ) : (
        "Bạn chưa có quyền xem báo cáo Phân tích."
      )}
    </div>
  );
}
