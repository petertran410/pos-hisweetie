"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useIsAdmin } from "@/lib/hooks/useCan";
import { branchesApi } from "@/lib/api/branches";
import {
  dashboardApi,
  type RangeKey,
  type PeriodKey,
  type TaskRow,
} from "@/lib/api/dashboard";
import { money, vi, deltaPct, BRANCH_PALETTE } from "@/lib/dashboard/format";
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from "@/lib/types/invoice";
import { MobileSheet } from "./MobileSheet";
import { MobileSparkline, MobileTrendChart } from "./MobileCharts";
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  AlignJustify,
  CreditCard,
  FileText,
  Truck,
  AlertTriangle,
  MapPin,
  ChevronDown,
  Check,
  Plus,
  Wallet,
  Boxes,
  BarChart3,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";

const RANGES: { key: RangeKey; label: string; word: string }[] = [
  { key: "today", label: "Hôm nay", word: "hôm nay" },
  { key: "yesterday", label: "Hôm qua", word: "hôm qua" },
  { key: "week", label: "7 ngày", word: "7 ngày qua" },
  { key: "month", label: "Tháng này", word: "tháng này" },
];

const RANGE_SUB: Record<RangeKey, string> = {
  today: "Theo giờ · hôm nay",
  yesterday: "Theo giờ · hôm qua",
  week: "Theo ngày · 7 ngày qua",
  month: "Theo tuần · tháng này",
};

// Map khoảng thời gian chung (RangeKey) sang PeriodKey cho So sánh chi nhánh.
const RANGE_TO_PERIOD: Record<RangeKey, PeriodKey> = {
  today: "today",
  yesterday: "yesterday",
  week: "d7",
  month: "thisMonth",
};

type TaskType = "orders" | "debt" | "cod" | "stock";

const TASK_TABS: { key: TaskType; label: string }[] = [
  { key: "orders", label: "Đơn xử lý" },
  { key: "debt", label: "Công nợ" },
  { key: "cod", label: "Cần giao" },
  { key: "stock", label: "Tồn cảnh báo" },
];

const TASK_TITLE: Record<TaskType, string> = {
  orders: "Đơn cần xử lý",
  debt: "Công nợ đến hạn",
  cod: "Cần giao (COD)",
  stock: "Tồn cảnh báo",
};

const TASK_ICON: Record<TaskType, { cls: string; icon: React.ReactNode }> = {
  orders: { cls: "dt-ic-cy", icon: <Receipt className="w-[19px] h-[19px]" /> },
  debt: { cls: "dt-ic-go", icon: <CreditCard className="w-[19px] h-[19px]" /> },
  cod: { cls: "dt-ic-de", icon: <Truck className="w-[19px] h-[19px]" /> },
  stock: {
    cls: "dt-ic-er",
    icon: <AlertTriangle className="w-[19px] h-[19px]" />,
  },
};

const LINK: Record<TaskType, string> = {
  orders: "/don-hang/dat-hang",
  debt: "/don-hang/hoa-don",
  cod: "/don-hang/hoa-don",
  stock: "/san-pham/danh-sach",
};

function statusInfo(r: TaskRow, type: TaskType): { cls: string; label: string } {
  if (type === "debt") {
    const cls =
      r.status === "overdue" ? "err" : r.status === "due" ? "warn" : "info";
    const label =
      r.status === "overdue"
        ? "Quá hạn"
        : r.status === "due"
          ? "Đến hạn"
          : "Trong hạn";
    return { cls, label };
  }
  if (type === "stock") {
    return {
      cls: r.status === "low" ? "warn" : "err",
      label:
        r.status === "negative"
          ? "Âm kho"
          : r.status === "out"
            ? "Hết hàng"
            : "Sắp hết",
    };
  }
  if (type === "cod") {
    // Trạng thái hóa đơn (1-8) — nhãn giống trang Hóa đơn.
    const st = r.invoiceStatus ?? Number(r.status);
    const cls =
      st === INVOICE_STATUS.FAILED_DELIVERY
        ? "err"
        : st === INVOICE_STATUS.PROCESSING
          ? "warn"
          : "info";
    return { cls, label: INVOICE_STATUS_LABELS[st] || r.status };
  }
  if (type === "orders") {
    const s = r.status;
    const cls =
      s === "completed"
        ? "ok"
        : s === "pending" || s === "Draft"
          ? "warn"
          : "info";
    const label =
      s === "pending" || s === "Draft"
        ? "Phiếu tạm"
        : s === "partially_invoiced"
          ? "Đã ra 1 phần HĐ"
          : s === "confirmed"
            ? "Đã xác nhận"
            : s === "completed"
              ? "Hoàn thành"
              : s;
    return { cls, label };
  }
  return { cls: "info", label: r.status };
}

const ST_BG: Record<string, string> = {
  warn: "rgba(201,168,76,.14)",
  info: "rgba(0,183,204,.12)",
  ok: "rgba(46,139,143,.14)",
  err: "rgba(192,57,43,.1)",
};
const ST_FG: Record<string, string> = {
  warn: "#9A7A2A",
  info: "#00B7CC",
  ok: "#2E8B8F",
  err: "#C0392B",
};

function StatusChip({ cls, label }: { cls: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[11px] font-semibold px-2 py-0.5 rounded-[20px] mt-1"
      style={{ background: ST_BG[cls], color: ST_FG[cls] }}>
      <i
        className="w-[5px] h-[5px] rounded-full"
        style={{ background: "currentColor" }}
      />
      {label}
    </span>
  );
}

function rightValue(r: TaskRow, type: TaskType) {
  if (type === "stock") {
    return (
      <>
        <div className={`amt ${r.value < 0 ? "neg" : ""}`}>{vi(r.value)}</div>
        <span className="text-[11px]" style={{ color: "var(--dt-text-muted)" }}>
          {r.unit}
        </span>
      </>
    );
  }
  return <div className="amt">{money(r.value)}</div>;
}

function timeSub(r: TaskRow, type: TaskType): string {
  if (type === "debt") {
    const a = r.ageDays ?? 0;
    if (a > 0) return `Trễ ${a} ngày`;
    if (a === 0) return "Đến hạn hôm nay";
    return `Còn ${-a} ngày`;
  }
  if (type === "stock") return r.status === "negative" ? "Âm kho" : "Sắp hết";
  if (r.time) {
    const d = new Date(r.time);
    if (!isNaN(d.getTime()))
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
  }
  return "";
}

interface KpiDef {
  show: boolean;
  cls: string;
  icon: React.ReactNode;
  name: string;
  value: string;
  suffix?: string;
  delta?: string;
  dir?: "up" | "down" | "flat";
}

export function DashboardMobileView() {
  const isAdmin = useIsAdmin();
  const canSeeProfit = isAdmin;

  const [range, setRange] = useState<RangeKey>("today");
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [branchMetric, setBranchMetric] = useState<"rev" | "profit">("rev");
  const [taskTab, setTaskTab] = useState<TaskType>("orders");
  const [branchSheet, setBranchSheet] = useState(false);
  const [detail, setDetail] = useState<{ row: TaskRow; type: TaskType } | null>(
    null
  );

  const { data: branches } = useQuery({
    queryKey: ["dash-branches"],
    queryFn: () => branchesApi.getMyBranches(),
  });

  const stats = useQuery({
    queryKey: ["dash-stats", range, branchId],
    queryFn: () => dashboardApi.getStats(range, branchId),
  });
  const trend = useQuery({
    queryKey: ["dash-trend", range, branchId],
    queryFn: () => dashboardApi.getRevenueTrend(range, branchId),
  });
  const branchCmp = useQuery({
    queryKey: ["dash-branchcmp-m", range, branchMetric],
    queryFn: () =>
      dashboardApi.getBranchComparison(RANGE_TO_PERIOD[range], branchMetric),
  });
  const tasks = useQuery({
    queryKey: ["dash-tasks-m", taskTab, branchId],
    queryFn: () => dashboardApi.getTasks(taskTab, branchId),
  });
  const taskCounts = useQuery({
    queryKey: ["dash-taskcounts-m", branchId],
    queryFn: () => dashboardApi.getTaskCounts(branchId),
  });
  const activities = useQuery({
    queryKey: ["dash-acts"],
    queryFn: () => dashboardApi.getRecentActivities(8),
  });

  const s = stats.data;

  const branchLabel = useMemo(() => {
    if (!branchId) return "Tất cả CN";
    return branches?.find((b) => b.id === branchId)?.name ?? "Chi nhánh";
  }, [branchId, branches]);

  // Branch comparison → tổng theo từng chi nhánh (dạng bars).
  const branchBars = useMemo(() => {
    const list = (branchCmp.data?.branches ?? []).map((b, i) => ({
      id: b.id,
      name: b.name,
      total: b.total,
      color: BRANCH_PALETTE[i % BRANCH_PALETTE.length],
    }));
    return list.sort((a, b) => b.total - a.total);
  }, [branchCmp.data]);
  const branchMax = Math.max(...branchBars.map((b) => b.total), 1);

  const kpis: KpiDef[] = (
    [
      {
        show: true,
        cls: "dt-ic-te",
        icon: <Receipt className="w-[18px] h-[18px]" />,
        name: "Số hóa đơn",
        value: vi(s?.invoiceCount ?? 0),
        delta: s ? deltaPct(s.invoiceChange) : undefined,
        dir: (s?.invoiceChange ?? 0) >= 0 ? "up" : "down",
      },
      {
        show: true,
        cls: "dt-ic-de",
        icon: <AlignJustify className="w-[18px] h-[18px]" />,
        name: "TB/đơn",
        value: money(s?.aov ?? 0),
        delta: s ? deltaPct(s.aovChange) : undefined,
        dir: (s?.aovChange ?? 0) >= 0 ? "up" : "down",
      },
      {
        show: true,
        cls: "dt-ic-go",
        icon: <CreditCard className="w-[18px] h-[18px]" />,
        name: "Công nợ phải thu",
        value: money(s?.totalCustomerDebt ?? 0),
        delta: s ? `${money(s.unpaidAmount)}` : undefined,
        dir: "down",
      },
      {
        show: true,
        cls: "dt-ic-te",
        icon: <FileText className="w-[18px] h-[18px]" />,
        name: "HĐ còn phải thu",
        value: vi(s?.unpaidInvoices ?? 0),
        suffix: "HĐ",
      },
      {
        show: true,
        cls: "dt-ic-cy",
        icon: <Truck className="w-[18px] h-[18px]" />,
        name: "COD luân chuyển",
        value: money(s?.codAmount ?? 0),
        delta: s ? `${s.codCount} đơn` : undefined,
        dir: "up",
      },
      {
        show: true,
        cls: "dt-ic-er",
        icon: <AlertTriangle className="w-[18px] h-[18px]" />,
        name: "Tồn cảnh báo",
        value: vi((s?.lowStockProducts ?? 0) + (s?.outOfStockProducts ?? 0)),
        suffix: "mã",
        delta:
          s && s.negativeStock > 0 ? `${s.negativeStock} âm kho` : "ổn định",
        dir: s && s.negativeStock > 0 ? "down" : "flat",
      },
    ] as KpiDef[]
  ).filter((k) => k.show);

  const QUICK = [
    { href: "/ban-hang", cls: "dt-ic-cy", icon: <Plus className="w-[21px] h-[21px]" />, label: "Tạo đơn" },
    { href: "/khach-hang", cls: "dt-ic-go", icon: <Wallet className="w-[21px] h-[21px]" />, label: "Thu nợ" },
    { href: "/san-pham/nhap-hang", cls: "dt-ic-te", icon: <Boxes className="w-[21px] h-[21px]" />, label: "Nhập kho" },
    { href: "/bao-cao/khach-hang", cls: "dt-ic-de", icon: <BarChart3 className="w-[21px] h-[21px]" />, label: "Báo cáo" },
  ];

  return (
    <div className="dt-dash dt-m">
      {/* Filter pills */}
      <div className="dt-m-filter">
        <button className="dt-m-pill" onClick={() => setBranchSheet(true)}>
          <MapPin className="w-[14px] h-[14px]" />
          <span>{branchLabel}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {RANGES.map((r) => (
          <button
            key={r.key}
            className="dt-m-pill"
            data-on={range === r.key}
            onClick={() => setRange(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="dt-m-body">
        {/* Hero */}
        <div className="dt-m-hero">
          <div className="lab">
            <i /> Doanh thu {RANGES.find((r) => r.key === range)?.word}
          </div>
          <div className="big">{money(s?.currentRevenue ?? 0)}</div>
          <span className="delta">
            {(s?.revenueChange ?? 0) >= 0 ? (
              <TrendingUp className="w-[13px] h-[13px]" />
            ) : (
              <TrendingDown className="w-[13px] h-[13px]" />
            )}
            {s ? `${deltaPct(s.revenueChange)} so kỳ trước` : "—"}
          </span>
          <MobileSparkline data={trend.data ?? []} />
          {canSeeProfit && (
            <div className="pf">
              <TrendingUp className="w-4 h-4" style={{ color: "#FFE9B0" }} />
              Lợi nhuận
              <span className="pm">biên {Math.round((s?.marginAvg ?? 0) * 100)}%</span>
              <span className="pv">{money(s?.profit ?? 0)}</span>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="dt-m-sec">
          <h2>Chỉ số chính</h2>
        </div>
        <div className="dt-m-kpis">
          {kpis.map((k, i) => (
            <div key={i} className="dt-m-kpi">
              <span className={`ic ${k.cls}`}>{k.icon}</span>
              <div className="nm">{k.name}</div>
              <div className="v">
                {k.value}
                {k.suffix && <small> {k.suffix}</small>}
              </div>
              {k.delta && (
                <div className={`d ${k.dir}`}>
                  {k.dir === "up" && <TrendingUp className="w-3 h-3" />}
                  {k.dir === "down" && <TrendingDown className="w-3 h-3" />}
                  <span>{k.delta}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Trend chart */}
        <div className="dt-m-card" style={{ marginTop: 18 }}>
          <div className="ch">
            <div>
              <h3>Doanh thu{canSeeProfit ? " / lợi nhuận" : ""}</h3>
              <div className="sub">{RANGE_SUB[range]}</div>
            </div>
          </div>
          <div className="cb">
            <MobileTrendChart data={trend.data ?? []} showProfit={canSeeProfit} />
          </div>
        </div>

        {/* Branch compare */}
        <div className="dt-m-card" style={{ marginTop: 14 }}>
          <div className="ch">
            <div>
              <h3>So sánh chi nhánh</h3>
              <div className="sub">
                {branchMetric === "profit" ? "Lợi nhuận" : "Doanh thu"} ·{" "}
                {RANGES.find((r) => r.key === range)?.word}
              </div>
            </div>
            {canSeeProfit && (
              <div className="dt-m-miniseg ml-auto">
                <button
                  data-on={branchMetric === "rev"}
                  onClick={() => setBranchMetric("rev")}>
                  DT
                </button>
                <button
                  data-on={branchMetric === "profit"}
                  onClick={() => setBranchMetric("profit")}>
                  LN
                </button>
              </div>
            )}
          </div>
          <div className="cb">
            {branchBars.length === 0 ? (
              <div
                className="text-center py-6 text-[13px]"
                style={{ color: "var(--dt-text-muted)" }}>
                Chưa có dữ liệu
              </div>
            ) : (
              branchBars.map((b) => (
                <div key={b.id} className="dt-m-brow">
                  <div className="t">
                    <em style={{ background: b.color }} />
                    {b.name.split("—")[0].trim()}
                    <span className="bv">{money(b.total)}</span>
                  </div>
                  <div className="bar">
                    <i
                      style={{
                        width: `${(b.total / branchMax) * 100}%`,
                        background:
                          branchMetric === "profit"
                            ? "linear-gradient(90deg,#E8C96A,#C9A84C)"
                            : "linear-gradient(90deg,#00B7CC,#2E8B8F)",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="dt-m-sec">
          <h2>Thao tác nhanh</h2>
        </div>
        <div className="dt-m-qa">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href}>
              <span className={`qi ${q.cls}`}>{q.icon}</span>
              {q.label}
            </Link>
          ))}
        </div>

        {/* Tasks */}
        <div className="dt-m-sec">
          <h2>Việc cần làm</h2>
        </div>
        <div className="dt-m-tseg">
          {TASK_TABS.map((t) => (
            <button
              key={t.key}
              className="dt-m-tchip"
              data-on={taskTab === t.key}
              onClick={() => setTaskTab(t.key)}>
              {t.label}
              <span className="c">{taskCounts.data?.[t.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-[10px] mt-3">
          {tasks.isLoading ? (
            <div
              className="text-center py-8 text-[13.5px]"
              style={{ color: "var(--dt-text-muted)" }}>
              Đang tải…
            </div>
          ) : (tasks.data ?? []).length === 0 ? (
            <div
              className="text-center py-8 text-[13.5px]"
              style={{ color: "var(--dt-text-muted)" }}>
              Không có mục nào.
            </div>
          ) : (
            (tasks.data ?? []).map((r, i) => {
              const st = statusInfo(r, taskTab);
              return (
                <button
                  key={`${r.code}-${i}`}
                  className="dt-m-titem"
                  onClick={() => setDetail({ row: r, type: taskTab })}>
                  <span className={`tic ${TASK_ICON[taskTab].cls}`}>
                    {TASK_ICON[taskTab].icon}
                  </span>
                  <div className="tm">
                    <span className="code">{r.code}</span>
                    <b>{r.partner}</b>
                    <span>
                      {r.branchName ? `${r.branchName} · ` : ""}
                      {timeSub(r, taskTab)}
                    </span>
                    <div>
                      <StatusChip cls={st.cls} label={st.label} />
                    </div>
                  </div>
                  <div className="tr">{rightValue(r, taskTab)}</div>
                </button>
              );
            })
          )}
        </div>

        {/* Activity */}
        <div className="dt-m-sec">
          <h2>Hoạt động gần đây</h2>
        </div>
        <div className="dt-m-card">
          <div className="cb">
            {(activities.data ?? []).length === 0 ? (
              <div
                className="text-center py-6 text-[13px]"
                style={{ color: "var(--dt-text-muted)" }}>
                Chưa có hoạt động
              </div>
            ) : (
              (activities.data ?? []).map((a) => (
                <div key={a.id} className="dt-m-ait">
                  <span className="aic">
                    <ShoppingCart className="w-[17px] h-[17px]" />
                  </span>
                  <div className="ab">
                    <div className="txt">
                      <b style={{ fontWeight: 600 }}>{a.customerName}</b> đặt hàng{" "}
                      <span className="tg">{a.code}</span> ·{" "}
                      <b style={{ fontWeight: 600 }}>{money(a.grandTotal)}</b>
                    </div>
                    <div className="meta">
                      {new Date(a.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <Link href="/ban-hang" className="dt-m-fab" aria-label="Tạo đơn mới">
        <Plus className="w-[26px] h-[26px]" />
      </Link>

      {/* Branch sheet */}
      <MobileSheet
        open={branchSheet}
        onClose={() => setBranchSheet(false)}
        title="Chọn chi nhánh"
        subtitle="Lọc số liệu theo cơ sở">
        <button
          className="dt-m-titem"
          style={{
            width: "100%",
            marginBottom: 10,
            ...(branchId === undefined
              ? { borderColor: "var(--dt-primary)", background: "var(--dt-cyan-bg)" }
              : {}),
          }}
          onClick={() => {
            setBranchId(undefined);
            setBranchSheet(false);
          }}>
          <span className="tic dt-ic-cy">
            <MapPin className="w-[19px] h-[19px]" />
          </span>
          <div className="tm">
            <b>Tất cả chi nhánh</b>
            <span>Gộp toàn hệ thống</span>
          </div>
          {branchId === undefined && (
            <Check className="w-5 h-5" style={{ color: "var(--dt-primary)" }} />
          )}
        </button>
        {(branches ?? []).map((b) => (
          <button
            key={b.id}
            className="dt-m-titem"
            style={{
              width: "100%",
              marginBottom: 10,
              ...(branchId === b.id
                ? { borderColor: "var(--dt-primary)", background: "var(--dt-cyan-bg)" }
                : {}),
            }}
            onClick={() => {
              setBranchId(b.id);
              setBranchSheet(false);
            }}>
            <span className="tic dt-ic-te">
              <MapPin className="w-[19px] h-[19px]" />
            </span>
            <div className="tm">
              <b>{b.name}</b>
            </div>
            {branchId === b.id && (
              <Check className="w-5 h-5" style={{ color: "var(--dt-primary)" }} />
            )}
          </button>
        ))}
      </MobileSheet>

      {/* Detail sheet */}
      <MobileSheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${TASK_TITLE[detail.type]} · ${detail.row.code}` : ""}
        subtitle={detail?.row.partner}
        footer={
          detail ? (
            <Link
              href={LINK[detail.type]}
              className="dt-m-btn dt-m-btn-pri"
              onClick={() => setDetail(null)}>
              Mở chi tiết <ChevronRight className="w-4 h-4" />
            </Link>
          ) : undefined
        }>
        {detail && (
          <dl className="dt-m-dl">
            <div className="r">
              <dt>Đối tác</dt>
              <dd>{detail.row.partner}</dd>
            </div>
            {detail.row.branchName && (
              <div className="r">
                <dt>Chi nhánh</dt>
                <dd>{detail.row.branchName}</dd>
              </div>
            )}
            <div className="r">
              <dt>{detail.type === "stock" ? "Tồn hiện tại" : "Giá trị"}</dt>
              <dd
                style={{
                  color:
                    detail.type === "stock" && detail.row.value < 0
                      ? "var(--dt-error)"
                      : "inherit",
                }}>
                {detail.type === "stock"
                  ? `${vi(detail.row.value)} ${detail.row.unit ?? ""}`
                  : money(detail.row.value)}
              </dd>
            </div>
            {detail.type === "stock" && detail.row.minQuality != null && (
              <div className="r">
                <dt>Tồn tối thiểu</dt>
                <dd>
                  {vi(detail.row.minQuality)} {detail.row.unit}
                </dd>
              </div>
            )}
            <div className="r">
              <dt>Tình trạng</dt>
              <dd>{timeSub(detail.row, detail.type)}</dd>
            </div>
            <div className="r">
              <dt>Trạng thái</dt>
              <dd>
                <StatusChip
                  cls={statusInfo(detail.row, detail.type).cls}
                  label={statusInfo(detail.row, detail.type).label}
                />
              </dd>
            </div>
          </dl>
        )}
      </MobileSheet>
    </div>
  );
}
