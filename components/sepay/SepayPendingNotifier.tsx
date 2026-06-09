"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sepayApi } from "@/lib/api/sepay";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";
import { buildSepayTxHref } from "@/lib/sepay/notification";

const POLL_INTERVAL = 10000; // 10s

/**
 * Bắn TOAST tức thời khi có giao dịch Sepay mới (kênh cảnh báo nhanh).
 * Mount 1 lần ở dashboard layout → chạy ở mọi trang.
 *
 * Nguồn thông báo "xem lại" (chuông) đã do backend lưu (model Notification);
 * component này KHÔNG còn ghi localStorage. Khi phát hiện giao dịch mới, ngoài
 * toast còn invalidate badge "unread-count" để chuông cập nhật ngay (không phải
 * chờ vòng poll 5s kế tiếp).
 *
 * Mốc "đã thấy" lưu RIÊNG từng tab (useRef) → mọi tab đều pop toast.
 * Lần đầu mount mỗi tab chỉ ghi nhận mốc, không pop lại giao dịch cũ.
 */
export function SepayPendingNotifier() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canView = usePermission("sepay", "view");
  const { isAuthenticated, isProfileSynced } = useAuthStore();
  const enabled = canView && isAuthenticated && isProfileSynced;

  const { data } = useQuery({
    queryKey: ["sepay-pending-summary"],
    queryFn: () => sepayApi.getPendingSummary(),
    enabled,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  // Mốc giao dịch đã thấy — riêng cho tab này.
  const lastSeenIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    const { count, latestId, latest } = data;

    if (!latestId || count === 0 || !latest) return;

    // Mô tả giao dịch mới nhất: số tiền + tài khoản + ngân hàng.
    const amount = formatCurrency(Number(latest.amountIn));
    const bankInfo = [latest.bankBrandName, latest.accountNumber]
      .filter(Boolean)
      .join(" - ");
    const detail = [amount && `+${amount}`, bankInfo].filter(Boolean).join(" • ");

    const goToTx = () => router.push(buildSepayTxHref(latest));

    // Lần đầu mount trong tab này: chỉ ghi nhận mốc, không bắn toast cũ.
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = latestId;
      return;
    }

    // Có giao dịch mới hơn mốc đã thấy trong tab → toast + làm mới badge chuông.
    if (latestId > lastSeenIdRef.current) {
      toast.success("Khách vừa chuyển khoản cần xử lý", {
        id: "sepay-pending",
        description: detail || undefined,
        duration: 10000,
        action: { label: "Xem ngay", onClick: goToTx },
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
      lastSeenIdRef.current = latestId;
    }
  }, [data, router, queryClient]);

  return null;
}
