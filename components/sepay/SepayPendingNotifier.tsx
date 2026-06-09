"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sepayApi } from "@/lib/api/sepay";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";

const POLL_INTERVAL = 30000; // 30s
const STORAGE_KEY = "sepay-pending-last-seen-id";

/**
 * Thông báo toàn cục giao dịch Sepay cần xử lý (chưa gán khách).
 * Mount 1 lần ở dashboard layout → hiện ở mọi trang.
 * Poll định kỳ; khi xuất hiện giao dịch mới (latestId tăng so với lần thấy
 * trước, lưu localStorage để không spam giữa các tab/lần load) thì bắn toast.
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

  // Tránh bắn toast ngay lần load đầu (chỉ báo khi có cái MỚI hơn đã thấy).
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    const { count, latestId, latest } = data;

    if (!latestId || count === 0) return;

    const lastSeen = Number(localStorage.getItem(STORAGE_KEY) || 0);

    // Mô tả giao dịch mới nhất: số tiền + tài khoản + ngân hàng.
    const amount = latest ? formatCurrency(Number(latest.amountIn)) : "";
    const bankInfo = latest
      ? [latest.bankBrandName, latest.accountNumber]
          .filter(Boolean)
          .join(" - ")
      : "";
    const detail = [amount && `+${amount}`, bankInfo]
      .filter(Boolean)
      .join(" • ");
    const moreText = count > 1 ? ` (và ${count - 1} giao dịch khác)` : "";

    const goToPage = () =>
      router.push("/tai-chinh/bien-dong-so-du?status=processing");

    // Lần đầu mount trong phiên: chỉ ghi nhận mốc, không bắn toast cũ.
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (latestId > lastSeen) {
        toast.info(`Có ${count} giao dịch chuyển khoản cần xử lý`, {
          id: "sepay-pending",
          description: detail ? `${detail}${moreText}` : undefined,
          duration: 8000,
          action: { label: "Xem", onClick: goToPage },
        });
        localStorage.setItem(STORAGE_KEY, String(latestId));
      }
      return;
    }

    // Các lần poll sau: có giao dịch mới hơn mốc đã thấy → báo.
    if (latestId > lastSeen) {
      toast.success("Khách vừa chuyển khoản cần xử lý", {
        id: "sepay-pending",
        description: detail ? `${detail}${moreText}` : undefined,
        duration: 10000,
        action: { label: "Xem ngay", onClick: goToPage },
      });
      localStorage.setItem(STORAGE_KEY, String(latestId));
    }
  }, [data, router]);

  return null;
}
