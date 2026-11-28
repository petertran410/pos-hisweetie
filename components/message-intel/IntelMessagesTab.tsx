"use client";

import { useState } from "react";
import { TablePagination } from "@/components/shared/TablePagination";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useIntelMessages } from "@/lib/hooks/useMessageIntel";
import type { IntelMessagesParams, IntelRangeParams } from "@/lib/api/messageIntel";
import {
  INTENT_LABEL,
  SENTIMENT_LABEL,
  SKIP_LABEL,
  STATUS_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
  type IntelMessage,
} from "@/lib/types/messageIntel";
import { Empty } from "./IntelOverviewTab";

type Filters = Pick<IntelMessagesParams, "status" | "intent" | "topic" | "sentiment" | "flag">;

const vnTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

const SENTIMENT_TONE: Record<string, string> = {
  positive: "bg-green-50 text-green-700 border-green-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
  negative: "bg-red-50 text-red-700 border-red-200",
};

export function IntelMessagesTab({ range }: { range: IntelRangeParams }) {
  const [filters, setFilters] = useState<Filters>({ status: "completed" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isFetching, error } = useIntelMessages({ ...range, ...filters, page, limit });
  const set = (patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const select = (
    label: string,
    value: string | undefined,
    options: Record<string, string>,
    onChange: (v: string | undefined) => void,
  ) => (
    <div className="w-48">
      <SearchableSelect
        size="sm"
        clearable
        placeholder={`${label}: tất cả`}
        value={value ?? ""}
        onChange={(v) => onChange(v || undefined)}
        options={Object.entries(options).map(([k, v]) => ({ value: k, label: v }))}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {select("Trạng thái", filters.status, STATUS_LABEL, (status) => set({ status }))}
        {select("Ý định", filters.intent, INTENT_LABEL, (intent) => set({ intent }))}
        {select("Chủ đề", filters.topic, TOPIC_LABEL, (topic) => set({ topic }))}
        {select("Cảm xúc", filters.sentiment, SENTIMENT_LABEL, (sentiment) => set({ sentiment }))}
        {select(
          "Cờ",
          filters.flag,
          { anomaly: "Bất thường", escalation: "Cần quản lý", reply: "Cần trả lời" },
          (flag) => set({ flag: flag as Filters["flag"] }),
        )}
      </div>
      {data && !data.contentVisible && (
        <p className="text-[12.5px]" style={{ color: "var(--dt-text-muted)" }}>
          Bạn chưa có quyền xem chat Smax nên nội dung tin được ẩn, chỉ hiện nhãn.
        </p>
      )}
      {error ? (
        <Empty text={(error as Error).message} />
      ) : (
        <div className={`dt-panel overflow-x-auto ${isFetching ? "opacity-70" : ""}`}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left" style={{ color: "var(--dt-text-muted)" }}>
                <th className="py-2 px-3 font-medium whitespace-nowrap">Thời gian</th>
                <th className="py-2 px-3 font-medium">Kênh / hội thoại</th>
                <th className="py-2 px-3 font-medium min-w-[260px]">Tin nhắn</th>
                <th className="py-2 px-3 font-medium">Ý định</th>
                <th className="py-2 px-3 font-medium">Chủ đề</th>
                <th className="py-2 px-3 font-medium">Cảm xúc / khẩn</th>
                <th className="py-2 px-3 font-medium">Cờ</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((m) => <Row key={m.id} m={m} />)}
            </tbody>
          </table>
          {data && !data.items.length && <Empty text="Không có tin nào khớp bộ lọc trong kỳ." />}
        </div>
      )}
      {data && data.total > 0 && (
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(data.total / limit))}
          total={data.total}
          limit={limit}
          limitOptions={[20, 50, 100]}
          unit="tin"
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function Row({ m }: { m: IntelMessage }) {
  const flags = [
    m.isAnomaly && "Bất thường",
    m.requiresEscalation && "Cần quản lý",
    m.requiresReply && "Cần trả lời",
  ].filter(Boolean) as string[];
  return (
    <tr className="border-t align-top" style={{ borderColor: "var(--dt-border)" }}>
      <td className="py-2 px-3 whitespace-nowrap dt-mono">{vnTime(m.messageAt)}</td>
      <td className="py-2 px-3">
        <div className="font-medium">{m.channel}</div>
        <div className="text-[12px] line-clamp-1" style={{ color: "var(--dt-text-muted)" }}>
          {m.isGroup ? "Nhóm: " : ""}
          {m.threadName ?? m.tid}
        </div>
      </td>
      <td className="py-2 px-3">
        {m.text !== null ? (
          <>
            {m.senderName && (
              <span className="text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
                {m.senderName}:{" "}
              </span>
            )}
            {m.burstSize && (
              <span
                className="mr-1 rounded border px-1 text-[11px]"
                style={{ borderColor: "var(--dt-border)", color: "var(--dt-text-muted)" }}
                title="Các tin khách gửi liên tiếp được gộp, AI phân loại cả cụm">
                Gộp {m.burstSize} tin
              </span>
            )}
            <span className="whitespace-pre-wrap break-words">{m.text}</span>
          </>
        ) : (
          <span style={{ color: "var(--dt-text-muted)" }}>(ẩn)</span>
        )}
        {m.contextPartial && (
          <div className="text-[11px] text-amber-700 mt-0.5">Ngữ cảnh có thể thiếu (kho chưa có tin cũ hơn)</div>
        )}
      </td>
      <td className="py-2 px-3">
        {m.status === "completed" ? (
          <>
            <div className="font-medium">{INTENT_LABEL[m.intent ?? ""] ?? m.intent}</div>
            <div className="text-[11.5px]" style={{ color: "var(--dt-text-muted)" }}>
              {m.source === "rule"
                ? "theo luật"
                : m.intentConfidence !== null
                  ? `độ tin ${Math.round(m.intentConfidence * 100)}%`
                  : "AI"}
            </div>
          </>
        ) : (
          <span className="text-[12px]" style={{ color: "var(--dt-text-muted)" }} title={m.lastError ?? undefined}>
            {m.status === "skipped" ? (SKIP_LABEL[m.skipReason ?? ""] ?? "Bỏ qua") : STATUS_LABEL[m.status]}
          </span>
        )}
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-wrap gap-1">
          {m.topics.map((t) => (
            <span key={t} className="rounded border px-1 text-[11px] bg-sky-50 text-sky-700 border-sky-200">
              {TOPIC_LABEL[t] ?? t}
            </span>
          ))}
        </div>
      </td>
      <td className="py-2 px-3 whitespace-nowrap">
        {m.sentiment && (
          <span className={`rounded border px-1 text-[11px] ${SENTIMENT_TONE[m.sentiment] ?? ""}`}>
            {SENTIMENT_LABEL[m.sentiment] ?? m.sentiment}
          </span>
        )}
        {m.urgency !== null && (
          <div className="text-[11.5px] mt-0.5" style={{ color: m.urgency >= 2 ? "#C0392B" : "var(--dt-text-muted)" }}>
            {URGENCY_LABEL[m.urgency]}
          </div>
        )}
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-wrap gap-1">
          {flags.map((f) => (
            <span key={f} className="rounded border px-1 text-[11px] bg-amber-50 text-amber-800 border-amber-200">
              {f}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}
