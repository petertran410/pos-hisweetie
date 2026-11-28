"use client";

import { useState } from "react";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { LeadCard } from "@/components/reports/lead/leadUi";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { confirmAction } from "@/lib/chat/confirm";
import { pct, vi } from "@/lib/dashboard/format";
import { useIntelControl, useIntelStatus } from "@/lib/hooks/useMessageIntel";
import { STATUS_LABEL, type IntelControl } from "@/lib/types/messageIntel";
import { Empty } from "./IntelOverviewTab";

const VERSION_STATUS = { draft: "Nháp", active: "Đang chạy", retired: "Ngừng" } as const;
const ALERT_REASON = { escalation: "Cần quản lý", complaint: "Khiếu nại khẩn", anomaly: "Bất thường khẩn" } as const;
const ALERT_STATUS = { sending: "Đang gửi", sent: "Đã gửi", grouped: "Gộp", recalled: "Thu hồi", failed: "Lỗi gửi" } as const;
/** Chat id nhóm Lark (khớp backend LARK_CHAT_ID). */
const LARK_CHAT_ID = /^oc_[A-Za-z0-9]{10,64}$/;
const dateInput = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
/** Ngày (giờ VN) → mốc UTC đầu ngày. */
const vnStart = (day: string) => new Date(`${day}T00:00:00+07:00`).toISOString();

/** Điều khiển worker: tạm dừng / tiếp tục, ngân sách, phiên bản, backfill, thử lại lỗi (message_intel:manage). */
export function IntelSettingsTab() {
  const { data, isLoading, error } = useIntelStatus();
  const control = useIntelControl();
  const [budget, setBudget] = useState<string>("");
  const [bfFrom, setBfFrom] = useState(() => dateInput(new Date(Date.now() - 7 * 86_400_000)));
  const [bfTo, setBfTo] = useState(() => dateInput(new Date()));
  const [bfScope, setBfScope] = useState<"config" | "all">("config");
  const [th, setTh] = useState({ yes: "0.7", no: "0.3", topic: "0.5" });
  const [chatId, setChatId] = useState("");
  if (error) return <Empty text={(error as Error).message} />;
  if (isLoading || !data) return <div className="dt-sk h-[320px] rounded-xl" />;
  const { runtime, config, versions, queue } = data;
  const act = async (body: IntelControl, confirmText?: string) => {
    if (confirmText && !(await confirmAction(confirmText))) return;
    control.mutate(body);
  };
  const used = runtime.dailyTokenBudget ? (runtime.tokensToday / runtime.dailyTokenBudget) * 100 : 0;
  const failed = queue.failed?.count ?? 0;
  // Tiến độ quét = phần đã đi từ điểm bắt đầu tới tin lớn nhất lúc bấm (id smax_messages)
  const bfStart = Number(runtime.backfillStartId ?? runtime.backfillCursor) || 0;
  const bfSpan = Math.max(0, (Number(runtime.backfillUntilId) || 0) - bfStart);
  const bfDone = Math.min(bfSpan, Math.max(0, (Number(runtime.backfillCursor) || 0) - bfStart));
  const bfProgress = bfSpan ? bfDone / bfSpan : 0;
  const waiting = ["pending", "retry", "processing"].reduce((n, k) => n + (queue[k]?.count ?? 0), 0);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <LeadCard
        title="Trạng thái"
        right={
          <button
            type="button"
            disabled={control.isPending}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white ${runtime.paused ? "bg-brand" : "bg-amber-600"}`}
            onClick={() =>
              act(
                { action: runtime.paused ? "resume" : "pause" },
                runtime.paused ? "Tiếp tục gửi tin cho AI phân loại?" : undefined,
              )
            }>
            {runtime.paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {runtime.paused ? "Tiếp tục" : "Tạm dừng"}
          </button>
        }>
        <ul className="space-y-1.5 text-[13px]">
          <Item label="Worker (MESSAGE_INTEL_ENABLED)" value={config.enabled ? "Bật" : "Tắt"} warn={!config.enabled} />
          <Item label="Chế độ" value={config.dryRun ? "Dry-run (không gọi AI)" : "Chạy thật"} warn={config.dryRun} />
          <Item label="API key Jev" value={config.jevConfigured ? "Đã cấu hình" : "Chưa có"} warn={!config.jevConfigured} />
          <Item
            label="Jev dự phòng (OpenCode Go)"
            value={config.jevFallbackConfigured ? "Đã cấu hình" : "Chưa có"}
            warn={!config.jevFallbackConfigured}
          />
          <Item label="Gửi AI" value={runtime.paused ? "Đang tạm dừng" : "Đang chạy"} warn={runtime.paused} />
          <Item label="Kênh đang bật" value={config.pagePids.length ? `${config.pagePids.length} kênh` : "Tất cả kênh"} />
          <Item label="Song song / lô" value={`${config.concurrency} / ${config.batch} tin mỗi 15 giây`} />
        </ul>
        <p className="mt-2 text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
          Bật/tắt worker, dry-run, kênh được bật đặt trong biến môi trường backend.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          {Object.entries(queue).map(([k, v]) => (
            <span key={k} className="rounded-full px-2 py-0.5" style={{ background: "var(--dt-bg-soft)" }}>
              {STATUS_LABEL[k] ?? k}: <b>{vi(v.count)}</b>
            </span>
          ))}
        </div>
        {failed > 0 && (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-brand"
            onClick={() => act({ action: "retry_failed" }, `Đưa ${failed} tin lỗi về hàng đợi để thử lại?`)}>
            <RotateCcw className="w-4 h-4" /> Thử lại {vi(failed)} tin lỗi
          </button>
        )}
      </LeadCard>

      <LeadCard title="Ngân sách token / ngày" subtitle="Hết ngân sách thì tự dừng, 0:00 giờ VN đặt lại. Giá Jev: 0,042 USD / 1 triệu token.">
        <div className="text-[13px] mb-2">
          Hôm nay: <b className="dt-mono">{vi(runtime.tokensToday)}</b> / {vi(runtime.dailyTokenBudget)} token ({pct(used)}) ·
          khoảng {vi(Math.floor(Math.max(0, runtime.dailyTokenBudget - runtime.tokensToday) / 2200))} tin nữa
        </div>
        <div className="h-[6px] rounded-full overflow-hidden mb-3" style={{ background: "var(--dt-border)" }}>
          <div className="dt-bar-fill h-full rounded-full" style={{ width: `${Math.min(100, used)}%`, background: used >= 100 ? "#C0392B" : "#00B7CC" }} />
        </div>
        <div className="flex gap-2">
          <input
            className="dt-input dt-input-sm w-40"
            inputMode="numeric"
            placeholder={String(runtime.dailyTokenBudget)}
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))}
            aria-label="Ngân sách token mỗi ngày"
          />
          <button
            type="button"
            className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            disabled={!budget || control.isPending}
            onClick={() => {
              act({ action: "set_budget", tokens: Number(budget) });
              setBudget("");
            }}>
            Lưu
          </button>
        </div>
      </LeadCard>

      <LeadCard title="Phân loại tin cũ (backfill)" subtitle="Chỉ chạy khi đã duyệt chất lượng (benchmark). Tốn token theo số tin.">
        {runtime.backfillStatus === "running" ? (
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
              Đang quét {runtime.backfillFrom && new Date(runtime.backfillFrom).toLocaleDateString("vi-VN")} →{" "}
              {runtime.backfillTo && new Date(runtime.backfillTo).toLocaleDateString("vi-VN")}
              {runtime.backfillPagePids.length ? ` · ${runtime.backfillPagePids.length} kênh` : " · tất cả kênh"}
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1" style={{ color: "var(--dt-text-secondary)" }}>
                <span>Quét kho tin, tạo việc cho AI</span>
                <span className="dt-mono font-semibold">{pct(bfProgress * 100)}</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "var(--dt-border)" }}
                role="progressbar"
                aria-label="Tiến độ quét tin cũ"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(bfProgress * 100)}>
                <div
                  className="dt-bar-fill h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${Math.max(2, bfProgress * 100)}%`, background: "#00B7CC" }}
                />
              </div>
              <div className="text-[12px] mt-1" style={{ color: "var(--dt-text-muted)" }}>
                Đã quét {vi(bfDone)} / {vi(bfSpan)} tin trong kho · chờ AI phân loại: {vi(waiting)} tin
              </div>
            </div>
            <button type="button" className="text-brand" onClick={() => act({ action: "cancel_backfill" }, "Dừng phân loại tin cũ?")}>
              Dừng
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-[13px]">
            {runtime.backfillStatus === "done" && <div style={{ color: "var(--dt-text-muted)" }}>Lượt trước đã quét xong.</div>}
            <div className="flex flex-wrap items-center gap-2">
              <DatePickerInput className="dt-input dt-input-sm w-36 flex items-center justify-between text-left" value={bfFrom} onChange={setBfFrom} maxDate={bfTo} placeholder="Từ ngày" />
              <span>→</span>
              <DatePickerInput className="dt-input dt-input-sm w-36 flex items-center justify-between text-left" value={bfTo} onChange={setBfTo} minDate={bfFrom} placeholder="Đến ngày" />
              <div className="dt-seg dt-seg-sm w-fit" role="radiogroup" aria-label="Phạm vi kênh">
                {(
                  [
                    ["config", "Kênh đang bật"],
                    ["all", "Tất cả kênh"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={bfScope === k} data-on={bfScope === k} onClick={() => setBfScope(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white disabled:opacity-50"
              disabled={!bfFrom || !bfTo || bfFrom > bfTo || control.isPending}
              onClick={() =>
                act(
                  {
                    action: "backfill",
                    from: vnStart(bfFrom),
                    to: new Date(new Date(vnStart(bfTo)).getTime() + 86_400_000).toISOString(),
                    pagePids: bfScope === "config" ? config.pagePids : [],
                  },
                  `Phân loại tin cũ từ ${bfFrom} đến ${bfTo}? Tin sẽ được gửi cho AI (trong ngân sách token ngày).`,
                )
              }>
              Bắt đầu
            </button>
          </div>
        )}
      </LeadCard>

      <LeadCard
        title="Cảnh báo quản lý (Lark)"
        subtitle="Cần quản lý · khiếu nại độ khẩn ≥ Ưu tiên · bất thường Khẩn cấp. Chỉ tin trong 2 giờ, gộp theo hội thoại 4 giờ, bỏ tin thu hồi.">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[13px]">
            <div className="font-medium">Gửi cảnh báo vào nhóm Lark</div>
            <div style={{ color: "var(--dt-text-muted)" }}>{data.alerts.enabled ? "Đang bật" : "Đang tắt"}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={data.alerts.enabled}
            aria-label="Bật / tắt gửi cảnh báo Lark"
            disabled={control.isPending}
            onClick={() =>
              act(
                { action: "set_alerts", alertsEnabled: !data.alerts.enabled },
                data.alerts.enabled
                  ? "Tắt gửi cảnh báo vào nhóm Lark?"
                  : `Bật gửi cảnh báo vào nhóm Lark ${data.alerts.chatId}? Tin khiếu nại / bất thường mới sẽ được gửi vào nhóm.`,
              )
            }
            className={`shrink-0 relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              data.alerts.enabled ? "bg-brand focus:ring-brand" : "bg-gray-300 focus:ring-gray-400"
            } ${control.isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                data.alerts.enabled ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <label className="block text-[12.5px] mb-1" htmlFor="intel-alert-chat">
          Chat id nhóm Lark nhận{" "}
          <span style={{ color: "var(--dt-text-muted)" }}>
            {data.alerts.defaultChat ? "(đang dùng nhóm mặc định Báo cáo hàng ngày Sale Chat)" : ""}
          </span>
        </label>
        <div className="flex gap-2 mb-1">
          <input
            id="intel-alert-chat"
            className="dt-input dt-input-sm flex-1 dt-mono"
            placeholder={data.alerts.chatId}
            value={chatId}
            onChange={(e) => setChatId(e.target.value.trim())}
          />
          <button
            type="button"
            className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
            disabled={!chatId || !LARK_CHAT_ID.test(chatId) || chatId === data.alerts.chatId || control.isPending}
            onClick={() => {
              act({ action: "set_alerts", alertChatId: chatId }, `Đổi nhóm nhận cảnh báo sang ${chatId}? Topic cảnh báo của ngày sẽ bắt đầu lại trong nhóm mới.`);
              setChatId("");
            }}>
            Lưu
          </button>
          {!data.alerts.defaultChat && (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-[13px]"
              style={{ borderColor: "var(--dt-border)" }}
              disabled={control.isPending}
              onClick={() => act({ action: "set_alerts", alertChatId: "" }, "Về nhóm mặc định Báo cáo hàng ngày Sale Chat?")}>
              Mặc định
            </button>
          )}
        </div>
        <p className="text-[12px] mb-3" style={{ color: chatId && !LARK_CHAT_ID.test(chatId) ? "#C0392B" : "var(--dt-text-muted)" }}>
          {chatId && !LARK_CHAT_ID.test(chatId)
            ? "Chat id có dạng oc_… (lấy trong Cài đặt nhóm Lark)."
            : "Bot Lark của POS phải có trong nhóm thì mới gửi được."}
        </p>
        {data.alerts.recent.length ? (
          <table className="w-full text-[12.5px]">
            <tbody>
              {data.alerts.recent.map((a) => (
                <tr key={a.id} className="border-t" style={{ borderColor: "var(--dt-border)" }} title={a.error ?? undefined}>
                  <td className="py-1.5 pr-2 dt-mono whitespace-nowrap">
                    {new Date(a.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </td>
                  <td className="py-1.5 px-2">{ALERT_REASON[a.reason]}</td>
                  <td className={`py-1.5 pl-2 text-right ${a.status === "failed" ? "text-red-600" : ""}`}>{ALERT_STATUS[a.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-[12.5px]" style={{ color: "var(--dt-text-muted)" }}>
            Chưa có cảnh báo nào.
          </p>
        )}
      </LeadCard>

      <LeadCard title="Phiên bản bộ câu hỏi" subtitle="Phiên bản đã chạy không sửa được; đổi ngưỡng = tạo phiên bản mới rồi kích hoạt.">
        <table className="w-full text-[13px] mb-3">
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="border-t" style={{ borderColor: "var(--dt-border)" }}>
                <td className="py-1.5 pr-2">
                  #{v.id} {v.name}
                </td>
                <td className="py-1.5 px-2" style={{ color: "var(--dt-text-muted)" }}>
                  {v.model}
                </td>
                <td className="py-1.5 px-2">{VERSION_STATUS[v.status]}</td>
                <td className="py-1.5 pl-2 text-right">
                  {v.status === "draft" && (
                    <button
                      type="button"
                      className="text-brand"
                      onClick={() =>
                        act(
                          { action: "activate", versionId: v.id },
                          `Kích hoạt phiên bản "${v.name}"? Phiên bản đang chạy sẽ ngừng; tin mới từ giờ phân loại theo phiên bản này.`,
                        )
                      }>
                      Kích hoạt
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-wrap items-end gap-2 text-[12.5px]">
          {(["yes", "no", "topic"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-0.5">
              {k === "yes" ? "Ngưỡng có" : k === "no" ? "Ngưỡng không" : "Ngưỡng chủ đề"}
              <input
                className="dt-input dt-input-sm w-20"
                inputMode="decimal"
                value={th[k]}
                onChange={(e) => setTh((t) => ({ ...t, [k]: e.target.value }))}
              />
            </label>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand px-3 py-1.5 font-medium text-brand disabled:opacity-50"
            disabled={control.isPending}
            onClick={() =>
              act({
                action: "create_version_v1",
                name: `v1 (${th.yes}/${th.no}/${th.topic})`,
                thresholds: { yes: Number(th.yes), no: Number(th.no), topic: Number(th.topic) },
              })
            }>
            {control.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo phiên bản nháp
          </button>
        </div>
      </LeadCard>
    </div>
  );
}

function Item({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <li className="flex justify-between gap-3">
      <span style={{ color: "var(--dt-text-secondary)" }}>{label}</span>
      <span className={`font-medium ${warn ? "text-amber-700" : ""}`}>{value}</span>
    </li>
  );
}
