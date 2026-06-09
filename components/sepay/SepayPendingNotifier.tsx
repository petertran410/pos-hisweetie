"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sepayApi } from "@/lib/api/sepay";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";

const POLL_INTERVAL = 10000; // 10s

/**
 * Thông báo toàn cục giao dịch Sepay cần xử lý (chưa gán khách).
 * Mount 1 lần ở dashboard layout → hiện ở mọi trang.
 * Poll định kỳ; khi xuất hiện giao dịch mới (latestId tăng so với lần thấy
 * trước) thì bắn toast.
 *
 * Mốc "đã thấy" lưu RIÊNG trong từng tab (useRef, không dùng localStorage)
 * → khi có giao dịch mới, MỌI tab đang mở đều pop toast.
 * Lần đầu mount mỗi tab chỉ ghi nhận mốc, không pop lại giao dịch cũ.
 */
export function SepayPendingNotifier() {
  const router = useRouter();
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

    if (!latestId || count === 0) return;

    // Mô tả giao dịch mới nhất: số tiền + tài khoản + ngân hàng.
    const amount = latest ? formatCurrency(Number(latest.amountIn)) : "";
    const bankInfo = latest
      ? [latest.bankBrandName, latest.accountNumber].filter(Boolean).join(" - ")
      : "";
    const detail = [amount && `+${amount}`, bankInfo]
      .filter(Boolean)
      .join(" • ");
    const moreText = count > 1 ? ` (và ${count - 1} giao dịch khác)` : "";

    const goToPage = () =>
      router.push("/tai-chinh/bien-dong-so-du?status=processing");

    // Lần đầu mount trong tab này: chỉ ghi nhận mốc, không bắn toast cũ.
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = latestId;
      return;
    }

    // Có giao dịch mới hơn mốc đã thấy trong tab → báo.
    if (latestId > lastSeenIdRef.current) {
      toast.success("Khách vừa chuyển khoản cần xử lý", {
        id: "sepay-pending",
        description: detail ? `${detail}${moreText}` : undefined,
        duration: 10000,
        action: { label: "Xem ngay", onClick: goToPage },
      });
      lastSeenIdRef.current = latestId;
    }
  }, [data, router]);

  return null;
}
