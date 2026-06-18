"use client";

import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
}

/**
 * Spinner xoay dùng chung (Loader2 + animate-spin).
 * Mặc định w-4 h-4 — phù hợp đặt trong nút. Truyền className để override.
 */
export function Spinner({ className }: SpinnerProps) {
  return <Loader2 className={`animate-spin ${className ?? "w-4 h-4"}`} />;
}
