"use client";

import { useEffect } from "react";
import { consumePendingPrint, printEntity } from "@/lib/utils/print";
import { toast } from "sonner";

/**
 * Hook gọi 1 lần khi mount: kiểm tra sessionStorage có pending print không,
 * nếu có thì trigger print popup browser.
 */
export function usePendingPrint(): void {
  useEffect(() => {
    const pending = consumePendingPrint();
    if (!pending) return;

    printEntity(pending.templateFor, pending.entityId).catch((e: any) => {
      toast.error(e?.message || "Không thể in tự động");
    });
  }, []);
}
