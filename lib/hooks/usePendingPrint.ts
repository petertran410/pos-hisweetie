"use client";

import { useEffect } from "react";
import { consumePendingPrint, printEntity, printDeliverySlip } from "@/lib/utils/print";
import { toast } from "sonner";

/**
 * Hook gọi 1 lần khi mount: kiểm tra sessionStorage có pending print không,
 * nếu có thì trigger print popup browser.
 * Nếu followUpDelivery = true (dành cho hóa đơn), sau khi in hóa đơn xong
 * sẽ tự động in tiếp phiếu giao hàng.
 */
export function usePendingPrint(): void {
  useEffect(() => {
    const pending = consumePendingPrint();
    if (!pending) return;

    (async () => {
      try {
        await printEntity(pending.templateFor, pending.entityId);
        // Sau khi in hóa đơn xong (user đóng print dialog), in phiếu giao hàng
        if (pending.followUpDelivery) {
          try {
            await printDeliverySlip("invoice", pending.entityId);
          } catch (e: any) {
            toast.error(e?.message || "Không thể in phiếu giao hàng");
          }
        }
      } catch (e: any) {
        toast.error(e?.message || "Không thể in tự động");
      }
    })();
  }, []);
}
