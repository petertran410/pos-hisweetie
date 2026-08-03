"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Chức năng "Kiểm hàng loại B" đã được thay thế bằng "Chuyển loại tồn" (CLT).
export default function InventoryCheckRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/san-pham/chuyen-loai-ton");
  }, [router]);
  return null;
}
