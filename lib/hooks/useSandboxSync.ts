import { useEffect } from "react";
import { useSandboxStore } from "@/lib/store/sandbox";

/**
 * Lắng nghe storage event từ tab khác để đồng bộ trạng thái sandbox.
 * Browser chỉ fire `storage` event ở các tab KHÁC (không phải tab ghi),
 * nên không gây loop vô hạn.
 *
 * Gọi 1 lần duy nhất ở layout level (DashboardLayout hoặc DashboardHeader).
 */
export function useSandboxSync() {
  const setSandbox = useSandboxStore((s) => s.setSandbox);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== "sandbox-storage" || !e.newValue) return;

      try {
        const parsed = JSON.parse(e.newValue);
        // Zustand persist lưu dưới dạng { state: { isSandbox, ... }, version: 0 }
        const next = parsed?.state?.isSandbox;
        if (typeof next === "boolean") {
          setSandbox(next);
        }
      } catch {
        // ignore malformed JSON
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [setSandbox]);
}
