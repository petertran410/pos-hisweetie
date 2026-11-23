"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { vi } from "@/lib/dashboard/format";
import {
  dailyReportApi,
  type DailyChatReport as Report,
  type DailySavedDay,
} from "@/lib/ai/daily-report";
import { LeadCard } from "@/components/reports/lead/leadUi";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import {
  SortableTable,
  type SortColumn,
} from "@/components/reports/lead/SortableTable";

const dmy = (day: string) =>
  `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
const todayVn = () =>
  new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const muted = { color: "var(--dt-text-muted)" };

type Complaint = Report["complaints"][number] & { i: number };
type Pending = Report["pending"][number] & { i: number };
type Discrepancy = Report["discrepancies"][number] & { i: number };

function Tile({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    // Nền xanh nhạt cố định: --dt-bg-soft tối ở bảng Tối trong khi khung báo cáo giữ nền sáng
    <div
      className="rounded-lg p-3"
      style={{ background: "rgba(0, 183, 204, 0.07)" }}
    >
      <div
        className="text-[12.5px] font-medium"
        style={{ color: "var(--dt-text-secondary)" }}
      >
        {label}
      </div>
      <div
        className="text-[24px] font-bold leading-tight dt-mono mt-1"
        style={hot ? { color: "#C0392B" } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

const customerCell = (customer: string, channel: string) => (
  <div className="min-w-[160px]">
    <div className="font-medium">{customer}</div>
    <div className="text-[12px]" style={muted}>
      {channel}
    </div>
  </div>
);

/** Nội dung một báo cáo: tổng quan + khiếu nại + yêu cầu chờ + cảnh báo giá (đầy đủ, không giới hạn dòng). */
function ReportView({ report }: { report: Report }) {
  const open = report.complaints.filter((c) => !c.handled).length;
  const complaints: Complaint[] = report.complaints.map((c, i) => ({
    ...c,
    i,
  }));
  const pending: Pending[] = report.pending.map((p, i) => ({ ...p, i }));
  const discrepancies: Discrepancy[] = report.discrepancies.map((d, i) => ({
    ...d,
    i,
  }));

  const complaintCols: SortColumn<Complaint>[] = [
    {
      key: "status",
      header: "Trạng thái",
      sortValue: (c) => (c.handled ? 1 : 0),
      render: (c) =>
        c.handled ? (
          <span className="whitespace-nowrap" style={muted}>
            Đã phản hồi
          </span>
        ) : (
          <span
            className="whitespace-nowrap font-semibold"
            style={{ color: "#C0392B" }}
          >
            🔴 Chưa xử lý
          </span>
        ),
    },
    {
      key: "customer",
      header: "Khách hàng · kênh",
      sortValue: (c) => c.customer,
      render: (c) => customerCell(c.customer, c.channel),
    },
    {
      key: "issue",
      header: "Nội dung",
      sortValue: (c) => c.issue,
      render: (c) => c.issue,
    },
  ];
  const pendingCols: SortColumn<Pending>[] = [
    {
      key: "since",
      header: "Giờ",
      sortValue: (p) => p.since ?? "",
      render: (p) => (
        <span className="dt-mono whitespace-nowrap">{p.since ?? "—"}</span>
      ),
    },
    {
      key: "customer",
      header: "Khách hàng · kênh",
      sortValue: (p) => p.customer,
      render: (p) => customerCell(p.customer, p.channel),
    },
    {
      key: "request",
      header: "Nội dung cần xử lý",
      sortValue: (p) => p.request,
      render: (p) => p.request,
    },
  ];
  const discrepancyCols: SortColumn<Discrepancy>[] = [
    {
      key: "product",
      header: "Sản phẩm",
      sortValue: (d) => d.product,
      render: (d) => <span className="font-medium">{d.product}</span>,
    },
    {
      key: "prices",
      header: "Giá ghi nhận (khách · kênh)",
      sortValue: (d) => d.prices.length,
      render: (d) => (
        <ul className="m-0 list-none p-0 space-y-0.5">
          {d.prices.map((p, j) => (
            <li key={j}>
              <b className="dt-mono">{vi(p.price)}đ</b>{" "}
              <span style={muted}>
                — {p.customer} · {p.channel}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <>
      <LeadCard title="Tổng quan">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <Tile label="Hội thoại" value={vi(report.stats.threads)} />
          <Tile label="Tin nhắn" value={vi(report.stats.messages)} />
          <Tile
            label={`Khiếu nại (${vi(open)} chưa xử lý)`}
            value={vi(report.complaints.length)}
            hot={open > 0}
          />
          <Tile label="Yêu cầu cần rà soát" value={vi(report.pending.length)} />
          <Tile label="Cảnh báo giá" value={vi(report.discrepancies.length)} />
        </div>
      </LeadCard>

      <LeadCard
        title={`🔴 Phàn nàn / Khiếu nại (${vi(complaints.length)})`}
        subtitle="Đã phản hồi không đồng nghĩa đã giải quyết xong — cần đối soát kết quả thực tế"
      >
        {complaints.length ? (
          <SortableTable
            caption="Phàn nàn / khiếu nại"
            columns={complaintCols}
            rows={complaints}
            rowKey={(c) => c.i}
            defaultSort={{ key: "status", dir: "asc" }}
          />
        ) : (
          <p className="text-[13px] py-4 text-center" style={muted}>
            Không có.
          </p>
        )}
      </LeadCard>

      <LeadCard
        title={`🟠 Khách nhắc / Yêu cầu chưa được xử lý (${vi(pending.length)})`}
        subtitle="Mới nhất trước"
      >
        {pending.length ? (
          <SortableTable
            caption="Yêu cầu chưa xử lý"
            columns={pendingCols}
            rows={pending}
            rowKey={(p) => p.i}
            defaultSort={{ key: "since", dir: "desc" }}
          />
        ) : (
          <p className="text-[13px] py-4 text-center" style={muted}>
            Không có.
          </p>
        )}
      </LeadCard>

      <LeadCard
        title={`💰 Cảnh báo báo giá lệch (${vi(discrepancies.length)})`}
        subtitle="Cần đối chiếu quy cách, kênh bán và bảng giá trước khi kết luận có sai lệch"
      >
        {discrepancies.length ? (
          <SortableTable
            caption="Cảnh báo báo giá lệch"
            columns={discrepancyCols}
            rows={discrepancies}
            rowKey={(d) => d.i}
            defaultSort={{ key: "product", dir: "asc" }}
          />
        ) : (
          <p className="text-[13px] py-4 text-center" style={muted}>
            Không có.
          </p>
        )}
      </LeadCard>
    </>
  );
}

/**
 * Báo cáo chat cuối ngày (gửi nhóm Lark 18:00): xem lại bản đã gửi theo ngày (đầy đủ, không giới hạn
 * 10 dòng như trên Lark), hoặc tạo bản xem trước cho một ngày (không gửi Lark).
 */
export function DailyChatReport({
  initialDay,
}: {
  initialDay?: string | null;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"saved" | "preview">("saved");
  const [picked, setPicked] = useState<string | null>(initialDay ?? null);
  const [previewDay, setPreviewDay] = useState(todayVn());

  const days = useQuery({
    queryKey: ["dailyChatReportDays"],
    queryFn: dailyReportApi.savedDays,
  });
  // Mặc định: ngày trên link (Lark) hoặc ngày gửi gần nhất
  const day = picked ?? days.data?.[0]?.day ?? null;
  const saved = useQuery({
    queryKey: ["dailyChatReport", day],
    queryFn: () => dailyReportApi.saved(day!),
    enabled: mode === "saved" && !!day,
  });
  const preview = useQuery({
    queryKey: ["dailyChatReportPreview"],
    queryFn: dailyReportApi.preview,
    enabled: mode === "preview",
    refetchInterval: (q) => (q.state.data?.status === "running" ? 4000 : false),
  });

  const startPreview = async () => {
    try {
      const job = await dailyReportApi.startPreview(previewDay);
      queryClient.setQueryData(["dailyChatReportPreview"], job);
      setMode("preview");
    } catch (e) {
      toast.error((e as Error).message || "Không tạo được bản xem trước");
    }
  };

  const meta: DailySavedDay | undefined = days.data?.find((d) => d.day === day);
  const p = preview.data;
  const running = p?.status === "running";

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 space-y-3 max-w-[1800px]">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h1 className="text-xl font-bold leading-tight">
              Báo cáo chat cuối ngày
            </h1>
            <p className="text-[12.5px] mt-0.5" style={muted}>
              Gửi nhóm Lark 18:00 hằng ngày · AI tổng hợp, cần đối chiếu hội
              thoại gốc trước khi xử lý
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-[13px]">
            <span style={{ color: "var(--dt-text-secondary)" }}>
              Bản đã gửi
            </span>
            <div className="w-[220px]">
              <SearchableSelect
                size="sm"
                options={(days.data ?? []).map((d) => ({
                  value: d.day,
                  label: `${dmy(d.day)} · gửi ${hm(d.sentAt)}`,
                }))}
                value={mode === "saved" ? (day ?? "") : ""}
                onChange={(v) => {
                  setPicked(v);
                  setMode("saved");
                }}
                placeholder={
                  mode === "preview"
                    ? "Đang xem bản xem trước"
                    : "Chưa có báo cáo đã gửi"
                }
                searchPlaceholder="Tìm ngày…"
                disabled={!days.data?.length}
              />
            </div>
          </div>
          <span
            className="mx-1 h-5 w-px"
            style={{ background: "var(--dt-border)" }}
            aria-hidden
          />
          <div className="flex items-center gap-2 text-[13px]">
            <span style={{ color: "var(--dt-text-secondary)" }}>
              Xem trước ngày
            </span>
            <div className="w-[160px]">
              <DatePickerInput
                value={previewDay}
                maxDate={todayVn()}
                onChange={setPreviewDay}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={startPreview}
            disabled={running || !previewDay}
            title="AI tổng hợp lại hội thoại của ngày đã chọn (vài phút, tính lượt AI) — không gửi Lark"
            className="dt-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {running ? "Đang tổng hợp…" : "Tạo bản xem trước"}
          </button>
        </div>

        {mode === "preview" ? (
          !p || p.status === "idle" ? null : p.status === "running" ? (
            <LeadCard title={`Bản xem trước ${dmy(p.day)}`}>
              <p
                className="flex items-center gap-2 text-[13px] py-6 justify-center"
                style={muted}
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Đang đọc hội thoại
                mọi kênh Smax và tổng hợp — thường mất 2–4 phút.
              </p>
            </LeadCard>
          ) : p.status === "error" ? (
            <LeadCard title={`Bản xem trước ${dmy(p.day)}`}>
              <p
                className="text-[13px] py-6 text-center"
                style={{ color: "#C0392B" }}
              >
                Không tạo được: {p.error}
              </p>
            </LeadCard>
          ) : p.report ? (
            <>
              <p className="text-[12.5px]" style={muted}>
                Bản xem trước ngày <b>{dmy(p.day)}</b> — chưa gửi Lark.
              </p>
              <ReportView report={p.report} />
            </>
          ) : null
        ) : days.isLoading || saved.isLoading ? (
          <p className="flex items-center gap-2 text-[13px] py-6" style={muted}>
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải…
          </p>
        ) : !day ? (
          <LeadCard title="Chưa có báo cáo đã gửi">
            <p className="text-[13px] py-4" style={muted}>
              Báo cáo gửi nhóm Lark lúc 18:00 sẽ được lưu ở đây. Có thể tạo bản
              xem trước cho một ngày bất kỳ.
            </p>
          </LeadCard>
        ) : saved.data?.report ? (
          <>
            <p className="text-[12.5px]" style={muted}>
              Bản đã gửi nhóm Lark lúc <b>{hm(saved.data.sentAt!)}</b> ngày{" "}
              {dmy(day)}.
            </p>
            <ReportView report={saved.data.report} />
          </>
        ) : (
          <LeadCard title={`Báo cáo ${dmy(day)}`}>
            <p className="text-[13px] pb-3" style={muted}>
              Báo cáo ngày này gửi trước khi POS lưu nội dung chi tiết — chỉ còn
              số liệu tóm tắt. Bấm &quot;Tạo bản xem trước&quot; với ngày{" "}
              {dmy(day)} để xem lại danh sách.
            </p>
            {meta && (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Tile label="Hội thoại" value={vi(meta.threads)} />
                <Tile label="Khiếu nại" value={vi(meta.complaints)} />
                <Tile label="Yêu cầu cần rà soát" value={vi(meta.pending)} />
                <Tile label="Cảnh báo giá" value={vi(meta.discrepancies)} />
              </div>
            )}
          </LeadCard>
        )}
      </div>
    </div>
  );
}
