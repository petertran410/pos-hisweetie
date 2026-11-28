"use client";

import { useQuery } from "@tanstack/react-query";
import { messageIntelApi } from "@/lib/api/messageIntel";
import { INTENT_LABEL, TOPIC_LABEL } from "@/lib/types/messageIntel";

const dmy = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

/**
 * Hồ sơ AI của khách (Message Intelligence): khiếu nại / bất thường / đặt hàng trong 90 ngày từ nhãn từng
 * tin ở các hội thoại đã gắn khách. Chưa bật phân loại tin hoặc chưa có tin → không hiện gì.
 */
export function CustomerIntelSummary({ customerId }: { customerId: number }) {
  const { data } = useQuery({
    queryKey: ["message-intel", "customer", customerId],
    queryFn: () => messageIntelApi.customerSummary(customerId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!data || !("linked" in data) || !data.linked || !data.messages) return null;
  const stat = (n: number, label: string, warn = false) => (
    <span className={warn && n > 0 ? "font-semibold text-red-600" : ""}>
      {n} {label}
    </span>
  );

  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">AI phân tích chat 90 ngày</h4>
      <div className="flex flex-col gap-1 px-1 text-xs text-gray-600">
        <p className="m-0 flex flex-wrap gap-x-2">
          {stat(data.messages, "tin khách")}·{stat(data.complaints, "khiếu nại", true)}·
          {stat(data.anomalies, "bất thường", true)}·{stat(data.orders, "đặt hàng")}
        </p>
        <p className="m-0">
          Cảm xúc: {data.positive} tích cực · {data.negative} tiêu cực
          {data.topTopics.length > 0 && (
            <> · hay nhắc: {data.topTopics.map((t) => TOPIC_LABEL[t.key] ?? t.key).join(", ")}</>
          )}
        </p>
        {data.lastIssue && (
          <p className="m-0 rounded bg-red-50 px-1.5 py-1 text-red-800">
            Vấn đề gần nhất {dmy(data.lastIssue.at)} ({INTENT_LABEL[data.lastIssue.intent ?? ""] ?? "Bất thường"})
            {data.lastIssue.text ? `: "${data.lastIssue.text}"` : ""}
          </p>
        )}
        <p className="m-0 text-[11px] text-gray-400">Nhãn do AI gắn theo từng tin, có thể sai.</p>
      </div>
    </div>
  );
}
