"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";

export function usePageTracking() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    const sessionId =
      sessionStorage.getItem("sessionId") || `session-${user.id}-${Date.now()}`;
    sessionStorage.setItem("sessionId", sessionId);

    const logPageView = async () => {
      try {
        await fetch("/api/audit-logs/page-view", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId,
          },
          body: JSON.stringify({
            userId: user.id,
            userName: user.name,
            branchId: user.branchId,
            path: pathname,
            timestamp: new Date().toISOString(),
            sessionId,
          }),
        });
      } catch (error) {
        console.error("Page tracking error:", error);
      }
    };

    logPageView();
  }, [pathname, user]);
}
