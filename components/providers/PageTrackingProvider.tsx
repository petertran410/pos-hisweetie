"use client";

import { usePageTracking } from "@/lib/hooks/usePageTracking";

export function PageTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  usePageTracking();
  return <>{children}</>;
}
