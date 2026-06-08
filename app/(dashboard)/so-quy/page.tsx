"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Route cũ /so-quy đã chuyển sang /tai-chinh/so-quy.
 * Giữ lại để redirect cho bookmark / link cũ, bảo toàn query param (vd ?Code=).
 */
export default function SoQuyRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`/tai-chinh/so-quy${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return null;
}
