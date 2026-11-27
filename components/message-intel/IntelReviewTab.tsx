"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LeadCard } from "@/components/reports/lead/leadUi";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { pct } from "@/lib/dashboard/format";
import { useNextReview, useReviewSummary, useSaveReview } from "@/lib/hooks/useMessageIntel";
import {
  INTENT_LABEL,
  PURCHASE_LABEL,
  SENTIMENT_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
  type ReviewItem,
  type ReviewLabels,
} from "@/lib/types/messageIntel";
import { Empty } from "./IntelOverviewTab";

const EMPTY: ReviewLabels = {
  intent: null,
  topics: [],
  sentiment: null,
  urgency: null,
  purchaseIntent: null,
  requiresReply: null,
  requiresEscalation: null,
  isAnomaly: null,
};
const ROLE_LABEL = { customer: "Khách", staff: "NV", other_member: "TV" } as const;
const vnTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

/** Chấm nhãn mù (không hiện nhãn AI) để đo độ chính xác; kết quả so khớp hiện ở bảng bên. */
export function IntelReviewTab() {
  const next = useNextReview(true);
  const summary = useReviewSummary(true);
  const item = next.data?.item;
  const s = summary.data;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <LeadCard
        title="Chấm nhãn tin khách"
        subtitle={
          next.data
            ? `Bạn đã chấm ${next.data.done} tin · còn ${Math.max(0, next.data.total - next.data.done)} tin AI đã phân loại`
            : undefined
        }>
        {next.isLoading ? (
          <div className="dt-sk h-[240px] rounded-xl" />
        ) : next.error ? (
          <Empty text={(next.error as Error).message} />
        ) : !item ? (
          <Empty text="Đã chấm hết các tin AI đã phân loại. Cảm ơn bạn!" />
        ) : (
          // key theo tin: sang tin mới thì form về trống
          <ReviewForm key={item.msgPid} item={item} />
        )}
      </LeadCard>

      <LeadCard title="So với nhãn AI" subtitle="Nhanh; báo cáo đủ chỉ số dùng script benchmark-eval">
        {!s || !s.matched ? (
          <Empty text="Chưa có tin nào được chấm." />
        ) : (
          <ul className="space-y-2 text-[13px]">
            <li className="flex justify-between">
              <span>Tin đã chấm</span>
              <span className="dt-mono">{s.matched}</span>
            </li>
            {(
              [
                ["Ý định trùng", s.intent],
                ["Cảm xúc trùng", s.sentiment],
                ["Độ khẩn trùng", s.urgency],
                ["Cần trả lời trùng", s.requiresReply],
                ["Bất thường trùng", s.isAnomaly],
                ["Bắt được khiếu nại / bất thường", s.complaintRecall],
              ] as const
            ).map(([label, m]) => (
              <li key={label} className="flex justify-between gap-2">
                <span>{label}</span>
                <span className="dt-mono">
                  {m.rate === null ? "—" : pct(m.rate * 100)}{" "}
                  <span style={{ color: "var(--dt-text-muted)" }}>({m.n})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </LeadCard>
    </div>
  );
}

function ReviewForm({ item }: { item: ReviewItem }) {
  const save = useSaveReview();
  const [labels, setLabels] = useState<ReviewLabels>(EMPTY);
  const [note, setNote] = useState("");
  const set = (patch: Partial<ReviewLabels>) => setLabels((l) => ({ ...l, ...patch }));
  const ready = !!labels.intent && !!labels.sentiment && labels.urgency !== null;

  return (
    <div className="space-y-4">
      <div className="text-[12.5px]" style={{ color: "var(--dt-text-muted)" }}>
        {item.channel} · {item.isGroup ? `Nhóm: ${item.threadName ?? ""}` : "Chat riêng"} · {vnTime(item.messageAt)}
      </div>
      {item.previous.length > 0 && (
        <ul className="space-y-1 text-[13px] rounded-lg p-3" style={{ background: "var(--dt-bg-soft)" }}>
          {item.previous.map((p, i) => (
            <li key={i}>
              <span className="font-medium">
                {ROLE_LABEL[p.role]}
                {p.senderName && p.role !== "staff" ? ` ${p.senderName}` : ""}:
              </span>{" "}
              <span className="whitespace-pre-wrap break-words">{p.text}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-lg border-2 border-brand p-3">
        <div className="text-[12px] mb-1" style={{ color: "var(--dt-text-muted)" }}>
          Tin cần chấm{item.senderName ? ` (${item.senderName})` : ""}
          {item.quote ? ` · trả lời: "${item.quote.slice(0, 80)}"` : ""}
        </div>
        <div className="text-[15px] font-medium whitespace-pre-wrap break-words">{item.text}</div>
      </div>

      <Field label="Ý định *">
        <div className="max-w-xs">
          <SearchableSelect
            size="sm"
            placeholder="Chọn ý định chính…"
            value={labels.intent ?? ""}
            onChange={(v) => set({ intent: v || null })}
            options={Object.entries(INTENT_LABEL).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>
      </Field>
      <Field label="Chủ đề (tối đa 3)">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(TOPIC_LABEL).map(([k, v]) => {
            const on = labels.topics.includes(k);
            return (
              <button
                key={k}
                type="button"
                className="dt-chip rounded-full border px-2.5 py-1 text-[12.5px] transition-colors disabled:opacity-40"
                data-on={on}
                aria-pressed={on}
                disabled={!on && labels.topics.length >= 3}
                onClick={() => set({ topics: on ? labels.topics.filter((t) => t !== k) : [...labels.topics, k] })}>
                {v}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cảm xúc *">
          <Seg options={Object.entries(SENTIMENT_LABEL)} value={labels.sentiment} onChange={(sentiment) => set({ sentiment })} />
        </Field>
        <Field label="Độ khẩn *">
          <Seg
            options={URGENCY_LABEL.map((v, i) => [String(i), v])}
            value={labels.urgency === null ? null : String(labels.urgency)}
            onChange={(v) => set({ urgency: Number(v) })}
          />
        </Field>
        <Field label="Ý định mua">
          <Seg
            options={PURCHASE_LABEL.map((v, i) => [String(i), v])}
            value={labels.purchaseIntent === null ? null : String(labels.purchaseIntent)}
            onChange={(v) => set({ purchaseIntent: Number(v) })}
          />
        </Field>
        {(
          [
            ["requiresReply", "Cần trả lời"],
            ["requiresEscalation", "Cần quản lý"],
            ["isAnomaly", "Bất thường"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <Seg
              options={[
                ["true", "Có"],
                ["false", "Không"],
              ]}
              value={labels[key] === null ? null : String(labels[key])}
              onChange={(v) => set({ [key]: v === "true" })}
            />
          </Field>
        ))}
      </div>
      <Field label="Ghi chú">
        <input
          className="dt-input dt-input-sm w-full"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Không chắc / lý do…"
        />
      </Field>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!ready || save.isPending}
        onClick={() => save.mutate({ msgPid: item.msgPid, labels, note: note.trim() || undefined })}>
        {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        Lưu và chấm tin tiếp
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12.5px] font-medium mb-1">{label}</div>
      {children}
    </div>
  );
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: (readonly [string, string])[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="dt-seg dt-seg-sm w-fit flex-wrap" role="radiogroup">
      {options.map(([k, v]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} data-on={value === k} onClick={() => onChange(k)}>
          {v}
        </button>
      ))}
    </div>
  );
}
