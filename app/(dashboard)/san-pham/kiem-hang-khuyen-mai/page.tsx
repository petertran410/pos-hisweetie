"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Chức năng "Kiểm hàng khuyến mãi" đã được thay thế bằng "Chuyển loại tồn" (CLT).
export default function InventoryPromoCheckRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/san-pham/chuyen-loai-ton");
  }, [router]);
  return null;
}
