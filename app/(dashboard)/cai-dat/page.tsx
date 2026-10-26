"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCan } from "@/lib/hooks/useCan";

export default function SettingsPage() {
  const router = useRouter();
  const canViewUsers = useCan("users", "view");

  useEffect(() => {
    // Ai cũng xem được thiết bị đăng nhập; trang Người dùng cần quyền.
    router.replace(canViewUsers ? "/cai-dat/nguoi-dung" : "/cai-dat/thiet-bi");
  }, [router, canViewUsers]);

  return null;
}
