"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cai-dat/nguoi-dung");
  }, [router]);

  return null;
}
