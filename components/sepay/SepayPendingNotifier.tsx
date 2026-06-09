"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sepayApi } from "@/lib/api/sepay";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";
import {
  buildSepayTxHref,
  readSepayToastWatermark,
  writeSepayToastWatermark,
  SEPAY_TOAST_WATERMARK_KEY,
} from "@/lib/sepay/notification";

const POLL_INTERVAL = 10000; // 10s

/**
 * Bắn TOAST tức thời khi có giao dịch Sepay mới (kênh cảnh báo nhanh).
 * Mount 1 lần ở dashboard layout → chạy ở mọi trang.
 *
 * Nguồn thông báo "xem lại" (chuông) đã do backend lưu (model Notification);
 * component này KHÔNG ghi localStorage cho danh sách thông báo.
 *
 * Chống trùng giữa các tab: mốc "đã toast" (latestId) lưu CHUNG trong
 * localStorage + lắng nghe `storage` event. Tab nào toast xong thì ghi mốc,
 * các tab khác nhận event và cập nhật mốc in-memory ngay → KHÔNG pop lại cùng
 * một giao dịch. Lần đầu hệ thống chưa có mốc → ghi mốc hiện tại, không toast
 * giao dịch cũ.
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

  // Mốc đã toast — đồng bộ với localStorage (dùng chung mọi tab).
  const lastSeenIdRef = useRef<number | null>(null);

  // Khởi tạo mốc từ localStorage + lắng nghe thay đổi từ tab khác.
  useEffect(() => {
    lastSeenIdRef.current = readSepayToastWatermark();
    const handler = (e: StorageEvent) => {
      if (e.key !== SEPAY_TOAST_WATERMARK_KEY) return;
      const n = e.newValue ? Number(e.newValue) : null;
      if (n !== null && Number.isFinite(n)) {
        // Tab khác đã toast giao dịch này → nâng mốc, tránh pop lại.
        if (lastSeenIdRef.current === null || n > lastSeenIdRef.current) {
          lastSeenIdRef.current = n;
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

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

    // Lần đầu (chưa có mốc nào trong localStorage): chỉ ghi nhận mốc, không
    // bắn toast cho giao dịch cũ.
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = latestId;
      writeSepayToastWatermark(latestId);
      return;
    }

    // Có giao dịch mới hơn mốc đã toast (mọi tab) → toast + nâng mốc dùng chung.
    if (latestId > lastSeenIdRef.current) {
      lastSeenIdRef.current = latestId;
      writeSepayToastWatermark(latestId);

      toast.success("Khách vừa chuyển khoản cần xử lý", {
        id: "sepay-pending",
        description: detail || undefined,
        duration: 10000,
        action: { label: "Xem ngay", onClick: goToTx },
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    }
  }, [data, router, queryClient]);

  return null;
}
