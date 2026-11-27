"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { LeadCard } from "@/components/reports/lead/leadUi";
import { useSandbox } from "@/lib/hooks/useMessageIntel";
import {
  INTENT_LABEL,
  PURCHASE_LABEL,
  SENTIMENT_LABEL,
  SKIP_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
} from "@/lib/types/messageIntel";

type Line = { role: "staff" | "customer"; text: string };
const yesNo = (v: boolean | null) => (v === null ? "Chưa chắc" : v ? "Có" : "Không");

/** Thử phân loại 1 câu tự nhập (gọi Jev thật, tính vào ngân sách token ngày). */
export function IntelSandboxTab() {
  const [text, setText] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [previous, setPrevious] = useState<Line[]>([]);
  const run = useSandbox();
  const r = run.data;
  const answers = r?.result?.answers as { intent?: { confidence?: number } } | undefined;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <LeadCard
        title="Thử phân loại"
        subtitle="Nhập câu mẫu (nên tự viết, không dán SĐT / tên khách). Gọi Jev thật, tính vào ngân sách ngày.">
        <div className="space-y-3">
          {previous.map((p, i) => (
            <div key={i} className="flex gap-2">
              <div className="dt-seg dt-seg-sm w-fit shrink-0" role="radiogroup" aria-label="Người gửi">
                {(
                  [
                    ["customer", "Khách"],
                    ["staff", "NV"],
                  ] as const
                ).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={p.role === role}
                    data-on={p.role === role}
                    onClick={() => setPrevious((ps) => ps.map((x, j) => (j === i ? { ...x, role } : x)))}>
                    {label}
                  </button>
                ))}
              </div>
              <input
                className="dt-input dt-input-sm flex-1"
                value={p.text}
                maxLength={500}
                placeholder="Tin trước đó"
                onChange={(e) => setPrevious((ps) => ps.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              />
              <button
                type="button"
                className="dt-icon-btn"
                aria-label="Xoá tin trước"
                onClick={() => setPrevious((ps) => ps.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {previous.length < 5 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[13px] text-brand"
              onClick={() => setPrevious((ps) => [...ps, { role: "staff", text: "" }])}>
              <Plus className="w-4 h-4" /> Thêm tin trước (ngữ cảnh)
            </button>
          )}
          <textarea
            className="dt-input w-full min-h-[90px]"
            value={text}
            maxLength={500}
            placeholder="Tin của khách cần phân loại, vd: Ok nhưng hàng lần này vẫn thiếu 2 gói nhé em"
            onChange={(e) => setText(e.target.value)}
          />
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} />
            Tin trong nhóm (người gửi không mặc định là khách)
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!text.trim() || run.isPending}
            onClick={() =>
              run.mutate({ text: text.trim(), isGroup, previous: previous.filter((p) => p.text.trim()) })
            }>
            {run.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Phân loại thử
          </button>
        </div>
      </LeadCard>

      <LeadCard title="Kết quả">
        {!r ? (
          <p className="text-sm" style={{ color: "var(--dt-text-muted)" }}>
            Chưa chạy.
          </p>
        ) : !r.result ? (
          <p className="text-sm">
            {r.rule.status === "completed"
              ? "Luật xử lý: tin chỉ xác nhận → Ý định “Xác nhận”, không gọi AI."
              : `Luật bỏ qua: ${SKIP_LABEL[r.rule.skipReason ?? ""] ?? r.rule.skipReason}.`}
          </p>
        ) : (
          <div className="space-y-3 text-[13px]">
            <dl className="grid grid-cols-[140px_1fr] gap-y-1.5">
              <dt style={{ color: "var(--dt-text-muted)" }}>Ý định</dt>
              <dd className="font-medium">
                {INTENT_LABEL[r.result.labels.intent ?? ""] ?? r.result.labels.intent}
                {answers?.intent?.confidence !== undefined && (
                  <span className="font-normal" style={{ color: "var(--dt-text-muted)" }}>
                    {" "}
                    · độ tin {Math.round((answers.intent.confidence ?? 0) * 100)}%
                  </span>
                )}
              </dd>
              <dt style={{ color: "var(--dt-text-muted)" }}>Chủ đề</dt>
              <dd>{r.result.labels.topics.map((t) => TOPIC_LABEL[t] ?? t).join(", ") || "—"}</dd>
              <dt style={{ color: "var(--dt-text-muted)" }}>Cảm xúc</dt>
              <dd>{SENTIMENT_LABEL[r.result.labels.sentiment ?? ""] ?? "—"}</dd>
              <dt style={{ color: "var(--dt-text-muted)" }}>Độ khẩn / ý định mua</dt>
              <dd>
                {URGENCY_LABEL[r.result.labels.urgency ?? -1] ?? "—"} /{" "}
                {PURCHASE_LABEL[r.result.labels.purchaseIntent ?? -1] ?? "—"}
              </dd>
              <dt style={{ color: "var(--dt-text-muted)" }}>Cần trả lời</dt>
              <dd>{yesNo(r.result.labels.requiresReply)}</dd>
              <dt style={{ color: "var(--dt-text-muted)" }}>Cần quản lý</dt>
              <dd>{yesNo(r.result.labels.requiresEscalation)}</dd>
              <dt style={{ color: "var(--dt-text-muted)" }}>Bất thường</dt>
              <dd>{yesNo(r.result.labels.isAnomaly)}</dd>
            </dl>
            <p style={{ color: "var(--dt-text-muted)" }}>
              {r.result.model} · {r.result.inputTokens.toLocaleString("vi-VN")} token · {r.result.latencyMs} ms
            </p>
            <details>
              <summary className="cursor-pointer text-[12.5px]">Dữ liệu đã ẩn danh gửi Jev</summary>
              <pre className="mt-2 max-h-[260px] overflow-auto rounded-lg p-3 text-[11.5px]" style={{ background: "var(--dt-bg-soft)" }}>
                {JSON.stringify(r.state, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </LeadCard>
    </div>
  );
}
