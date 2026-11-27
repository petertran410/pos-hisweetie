"use client";

import { AlertTriangle, CheckCircle2, Clock, Inbox, PieChart } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { HBarChart } from "@/components/dashboard/HBarChart";
import { LeadCard, RateCell } from "@/components/reports/lead/leadUi";
import { pct, timeAgo, vi } from "@/lib/dashboard/format";
import { useIntelOverview } from "@/lib/hooks/useMessageIntel";
import type { IntelRangeParams } from "@/lib/api/messageIntel";
import {
  INTENT_LABEL,
  SENTIMENT_LABEL,
  SKIP_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
} from "@/lib/types/messageIntel";

const bars = (rows: { key: string | number | null; count: number }[], label: (k: string) => string) =>
  rows
    .filter((r) => r.key !== null)
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ id: String(r.key), label: label(String(r.key)), value: r.count }));

export function IntelOverviewTab({ range }: { range: IntelRangeParams }) {
  const { data, isLoading, error } = useIntelOverview(range);
  if (error) return <Empty text={(error as Error).message} />;
  if (isLoading || !data) return <div className="dt-sk h-[320px] rounded-xl" />;
  const t = data.totals;
  const coverage = t.coverage === null ? null : t.coverage * 100;
  const lowCoverage = coverage !== null && coverage < 95;
  const count = (n: number) => vi(n);

  return (
    <div className="space-y-4">
      {lowCoverage && (
        <div className="flex gap-2 items-start rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Mới phân loại {pct(coverage!)} tin cần hiểu trong kỳ: số liệu dưới đây chưa đầy đủ. Không kết luận &quot;không có
            khiếu nại&quot; khi độ phủ còn thấp.
          </span>
        </div>
      )}
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-5">
        <KpiCard
          icon={<Inbox className="w-[18px] h-[18px]" />}
          iconBg="var(--dt-color-cyan-soft, #E6F7F9)"
          iconColor="#00B7CC"
          name="Tin trong kỳ"
          value={count(t.messages)}
          vs={`${count(t.eligible)} tin của khách cần hiểu`}
        />
        <KpiCard
          icon={<PieChart className="w-[18px] h-[18px]" />}
          iconBg="#E6F7F9"
          iconColor="#0D3B42"
          name="Độ phủ"
          value={coverage === null ? "—" : pct(coverage)}
          vs="đã có nhãn / tin cần hiểu"
        />
        <KpiCard
          icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
          iconBg="#E8F5EE"
          iconColor="#2E8B8F"
          name="Đã phân loại"
          value={count(t.completed)}
          vs={`AI ${count(t.completedByJev)} · luật ${count(t.completedByRule)}`}
        />
        <KpiCard
          icon={<Clock className="w-[18px] h-[18px]" />}
          iconBg="#FFF5E0"
          iconColor="#B7791F"
          name="Chờ phân loại"
          value={count(t.pending)}
          vs={t.oldestPendingAt ? `tin cũ nhất ${timeAgo(t.oldestPendingAt)}` : t.failed ? `${count(t.failed)} lỗi` : "không tồn"}
        />
        <KpiCard
          icon={<AlertTriangle className="w-[18px] h-[18px]" />}
          iconBg="rgba(192,57,43,0.08)"
          iconColor="#C0392B"
          name="Khiếu nại / bất thường"
          value={`${count(data.flags.complaint)} / ${count(data.flags.anomaly)}`}
          vs={`${count(data.flags.escalation)} tin cần quản lý`}
          accent="#C0392B"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LeadCard title="Ý định" subtitle="Ý định chính của tin khách đã phân loại">
          <HBarChart
            items={bars(data.intents, (k) => INTENT_LABEL[k] ?? k)}
            formatValue={vi}
            formatAxis={vi}
            integer
            emptyText="Chưa có tin được phân loại trong kỳ."
          />
        </LeadCard>
        <LeadCard title="Chủ đề" subtitle="Một tin có thể có nhiều chủ đề">
          <HBarChart
            items={bars(data.topics, (k) => TOPIC_LABEL[k] ?? k)}
            formatValue={vi}
            formatAxis={vi}
            integer
            barColor="#0D3B42"
            emptyText="Chưa có chủ đề trong kỳ."
          />
        </LeadCard>
        <LeadCard title="Cảm xúc và độ khẩn">
          <div className="grid gap-4 sm:grid-cols-2">
            <Shares rows={bars(data.sentiments, (k) => SENTIMENT_LABEL[k] ?? k)} />
            <Shares rows={bars(data.urgency, (k) => URGENCY_LABEL[Number(k)] ?? k)} />
          </div>
        </LeadCard>
        <LeadCard title="Tin không cần AI" subtitle="Luật xử lý trước khi gọi Jev (không tốn token)">
          <Shares
            rows={Object.entries(data.skipped)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => ({ id: k, label: SKIP_LABEL[k] ?? k, value: v }))}
          />
        </LeadCard>
      </div>

      <LeadCard title="Theo kênh" subtitle="Tin nhóm thấy ở nhiều kênh chỉ tính ở 1 kênh đại diện">
        {data.channels.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--dt-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Kênh</th>
                  <th className="py-2 px-3 font-medium text-right">Tin</th>
                  <th className="py-2 px-3 font-medium text-right">Cần hiểu</th>
                  <th className="py-2 px-3 font-medium text-right">Chờ</th>
                  <th className="py-2 px-3 font-medium text-right">Lỗi</th>
                  <th className="py-2 pl-3 font-medium text-right">Độ phủ</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((c) => (
                  <tr key={c.pagePid} className="border-t" style={{ borderColor: "var(--dt-border)" }}>
                    <td className="py-2 pr-3">{c.name}</td>
                    <td className="py-2 px-3 text-right dt-mono">{vi(c.total)}</td>
                    <td className="py-2 px-3 text-right dt-mono">{vi(c.eligible)}</td>
                    <td className="py-2 px-3 text-right dt-mono">{vi(c.pending)}</td>
                    <td className="py-2 px-3 text-right dt-mono">{vi(c.failed)}</td>
                    <td className="py-2 pl-3">
                      {c.eligible ? <RateCell value={(c.completed / c.eligible) * 100} max={100} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Chưa có kênh nào có tin được phân loại trong kỳ." />
        )}
      </LeadCard>
    </div>
  );
}

/** Danh sách tỷ lệ ngắn (nhãn · số · thanh). */
function Shares({ rows }: { rows: { id: string; label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <Empty text="Chưa có dữ liệu." />;
  return (
    <ul className="space-y-2 text-[13px]">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex justify-between gap-2">
            <span>{r.label}</span>
            <span className="dt-mono" style={{ color: "var(--dt-text-secondary)" }}>
              {vi(r.value)} · {pct((r.value / total) * 100)}
            </span>
          </div>
          <div className="h-[6px] rounded-full overflow-hidden mt-1" style={{ background: "var(--dt-border)" }}>
            <div className="dt-bar-fill h-full rounded-full" style={{ width: `${(r.value / total) * 100}%`, background: "#00B7CC" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="py-8 text-center text-sm" style={{ color: "var(--dt-text-muted)" }}>
      {text}
    </div>
  );
}
