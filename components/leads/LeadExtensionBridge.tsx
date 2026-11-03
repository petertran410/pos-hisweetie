"use client";

import { useEffect } from "react";
import { leadsApi } from "@/lib/api/leads";
import { useAuthStore } from "@/lib/store/auth";
import type { LeadInput } from "@/lib/types/lead";

const LEAD_FIELDS = ["name", "phone", "source", "category", "channelPid", "channelName", "need", "cskhNote"] as const;

/**
 * Cầu nối cho extension Chrome "Tạo lead nhanh" (pos-hisweetie/extension/lead-collector):
 * content script của extension gửi window.postMessage → tab POS gọi API bằng phiên đăng nhập của chính nó
 * (token chỉ nằm trong bộ nhớ tab, không lộ ra extension). Chỉ cho phép vài thao tác lead.
 */
export function LeadExtensionBridge() {
  useEffect(() => {
    const handle = async (op: string, payload: Record<string, unknown>) => {
      switch (op) {
        case "session": {
          const { user, token } = useAuthStore.getState();
          return token ? { userName: user?.name ?? null } : null;
        }
        case "channels":
          return leadsApi.channels();
        case "checkPhone":
          return leadsApi.checkPhone(String(payload.phone ?? ""));
        case "createLead": {
          const body: Record<string, string> = {};
          for (const f of LEAD_FIELDS) if (typeof payload[f] === "string" && payload[f]) body[f] = payload[f] as string;
          return leadsApi.create(body as LeadInput);
        }
        default:
          throw new Error("Thao tác không hỗ trợ");
      }
    };

    const onMessage = async (e: MessageEvent) => {
      if (e.source !== window || e.data?.type !== "hs-ext-request") return;
      const { id, op, payload } = e.data;
      try {
        const result = await handle(String(op), payload ?? {});
        window.postMessage({ type: "hs-ext-response", id, ok: true, result }, window.location.origin);
      } catch (err) {
        const error = (err as Error).message || "Có lỗi xảy ra";
        window.postMessage({ type: "hs-ext-response", id, ok: false, error }, window.location.origin);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
