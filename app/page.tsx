"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth";
import { useCan, useIsAdmin } from "@/lib/hooks/useCan";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { RouteGuard } from "@/components/layout/RouteGuard";
import { branchesApi } from "@/lib/api/branches";
import {
  dashboardApi,
  type RangeKey,
  type PeriodKey,
  type TopMetric,
  type CategoryDimension,
  type CustomDates,
  PERIOD_LABEL,
  BRANCH_PERIODS,
} from "@/lib/api/dashboard";
import { money, vi, deltaPct } from "@/lib/dashboard/format";
import { KpiCard, type DeltaDir } from "@/components/dashboard/KpiCard";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { CategoryDonut } from "@/components/dashboard/CategoryDonut";
import { BranchCompareChart } from "@/components/dashboard/BranchCompareChart";
import { FinancePanel } from "@/components/dashboard/FinancePanel";
import { TaskTabs, type TaskType } from "@/components/dashboard/TaskTabs";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { TopBuyers } from "@/components/dashboard/TopBuyers";
import {
  DashSelect,
  DashRangeSeg,
  customLabel,
} from "@/components/dashboard/DashSelect";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardMobileView } from "@/components/dashboard/mobile/DashboardMobileView";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  AlignJustify,
  CreditCard,
  FileText,
  Truck,
  AlertTriangle,
  Plus,
  Download,
  MapPin,
  Loader2,
} from "lucide-react";
import "./dashboard.css";

// Mốc thời gian chung (không gồm "custom" — mục đó do bộ chọn ngày lo).
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "week", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "lastMonth", label: "Tháng trước" },
];

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Theo giờ · hôm nay",
  yesterday: "Theo giờ · hôm qua",
  week: "Theo ngày · 7 ngày qua",
  month: "Theo ngày · tháng này",
  lastMonth: "Theo ngày · tháng trước",
  custom: "",
};

const rangeSubtitle = (r: RangeKey, c?: CustomDates) =>
  r === "custom" ? customLabel(c) : RANGE_LABEL[r];

const TOP_METRICS: { key: TopMetric; label: string }[] = [
  { key: "rev", label: "Theo doanh thu" },
  { key: "qty", label: "Theo số lượng" },
  { key: "profit", label: "Theo lợi nhuận" },
];

const BRANCH_OPTIONS = BRANCH_PERIODS.map((p) => ({
  key: p,
  label: PERIOD_LABEL[p],
}));

/** Chỉ giữ khoảng ngày khi đang ở chế độ "custom" (dùng cho queryKey + API). */
const cust = (key: string, c?: CustomDates) =>
  key === "custom" ? c : undefined;

const dir = (n: number): DeltaDir => (n > 0 ? "up" : n < 0 ? "down" : "flat");

/**
 * Trang "/" nằm NGOÀI layout (dashboard) nên phải tự bọc RouteGuard: access
 * token và hồ sơ/quyền chỉ nằm trong bộ nhớ, reload trang là mất — RouteGuard
 * lấy lại token (refresh cookie) + /auth/profile rồi mới hiển thị. Thiếu nó,
 * user = null → header thiếu menu và trang trống cho tới khi chuyển trang.
 */
export default function Home() {
  return (
    <RouteGuard>
      <HomeContent />
    </RouteGuard>
  );
}

function HomeContent() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const canViewDashboard = useCan("dashboard", "view");
  const isAdmin = useIsAdmin();
  // Lợi nhuận/biên là dữ liệu nhạy cảm — chỉ admin/super admin thấy.
  const canSeeProfit = isAdmin;

  // ── Bộ lọc dashboard ──
  const [range, setRange] = useState<RangeKey>("today");
  const [rangeCustom, setRangeCustom] = useState<CustomDates>();
  const [branchId, setBranchId] = useState<number | undefined>(undefined); // undefined = tất cả
  const [finRange, setFinRange] = useState<PeriodKey>("all");
  const [finCustom, setFinCustom] = useState<CustomDates>();
  const [branchMetric, setBranchMetric] = useState<"rev" | "profit">("rev");
  const [branchRange, setBranchRange] = useState<PeriodKey>("d7");
  const [branchCustom, setBranchCustom] = useState<CustomDates>();
  const [taskTab, setTaskTab] = useState<TaskType>("orders");
  // Mỗi tab giữ bộ lọc riêng.
  const [taskFilters, setTaskFilters] = useState<Record<TaskType, string>>({
    orders: "",
    debt: "",
    cod: "",
    stock: "",
  });
  const taskStatus = taskFilters[taskTab];
  const setTaskStatus = (s: string) =>
    setTaskFilters((prev) => ({ ...prev, [taskTab]: s }));
  const [topMetric, setTopMetric] = useState<TopMetric>("rev");
  // Top hàng bán chạy & Top khách có bộ lọc thời gian riêng (mặc định Tháng này).
  const [topRange, setTopRange] = useState<RangeKey>("month");
  const [topCustom, setTopCustom] = useState<CustomDates>();
  const [buyerRange, setBuyerRange] = useState<RangeKey>("month");
  const [buyerCustom, setBuyerCustom] = useState<CustomDates>();
  const [catDim, setCatDim] = useState<CategoryDimension>("parent");
  // Toggle hiển thị đường trên biểu đồ doanh thu/lợi nhuận (luôn giữ tối thiểu 1).
  const [showRev, setShowRev] = useState(true);
  const [showLn, setShowLn] = useState(true);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, _hasHydrated, router]);

  const enabled = _hasHydrated && isAuthenticated && canViewDashboard;

  // ── Queries ──
  const { data: branches } = useQuery({
    queryKey: ["dash-branches"],
    queryFn: () => branchesApi.getMyBranches(),
    enabled,
  });

  const rc = cust(range, rangeCustom);
  const stats = useQuery({
    queryKey: ["dash-stats", range, branchId, rc],
    queryFn: () => dashboardApi.getStats(range, branchId, rc),
    enabled,
  });

  const trend = useQuery({
    queryKey: ["dash-trend", range, branchId, rc],
    queryFn: () => dashboardApi.getRevenueTrend(range, branchId, rc),
    enabled,
  });

  const category = useQuery({
    queryKey: ["dash-category", range, branchId, catDim, rc],
    queryFn: () =>
      dashboardApi.getCategoryBreakdown(range, branchId, catDim, rc),
    enabled,
  });

  const bc = cust(branchRange, branchCustom);
  const branchCmp = useQuery({
    queryKey: ["dash-branchcmp", branchRange, branchMetric, bc],
    queryFn: () =>
      dashboardApi.getBranchComparison(branchRange, branchMetric, bc),
    enabled,
  });

  const fc = cust(finRange, finCustom);
  const finance = useQuery({
    queryKey: ["dash-finance", finRange, branchId, fc],
    queryFn: () => dashboardApi.getFinance(finRange, branchId, fc),
    enabled,
  });

  const tasks = useQuery({
    queryKey: ["dash-tasks", taskTab, branchId, taskStatus],
    queryFn: () =>
      dashboardApi.getTasks(taskTab, branchId, 500, taskStatus || undefined),
    enabled,
  });

  // Đếm tổng thật cho badge các tab (count() phía backend, không cap theo limit).
  const taskCounts = useQuery({
    queryKey: ["dash-taskcounts", branchId],
    queryFn: () => dashboardApi.getTaskCounts(branchId),
    enabled,
  });

  const tc = cust(topRange, topCustom);
  const topProducts = useQuery({
    queryKey: ["dash-top", topRange, branchId, topMetric, tc],
    queryFn: () =>
      dashboardApi.getTopProducts({
        limit: 10,
        range: topRange,
        custom: tc,
        branchId,
        metric: topMetric,
      }),
    enabled,
  });

  const buc = cust(buyerRange, buyerCustom);
  const topBuyers = useQuery({
    queryKey: ["dash-top-buyers", buyerRange, branchId, buc],
    queryFn: () =>
      dashboardApi.getTopBuyers({
        limit: 10,
        range: buyerRange,
        custom: buc,
        branchId,
      }),
    enabled,
  });

  const activities = useQuery({
    queryKey: ["dash-acts"],
    queryFn: () => dashboardApi.getRecentActivities(12),
    enabled,
  });

  // Chưa có dữ liệu lần nào (dataUpdatedAt = 0) thì hiện "--:--" thay vì gọi
  // Date.now() trong lúc render (React yêu cầu render phải thuần).
  const liveAt = useMemo(
    () =>
      stats.dataUpdatedAt
        ? new Date(stats.dataUpdatedAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--",
    [stats.dataUpdatedAt],
  );

  // ── Guards ──
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (!canViewDashboard) {
    return (
      <div>
        <DashboardHeader />
        <div className="p-6 bg-gray-50 min-h-[calc(100vh-56px)] overflow-auto" />
      </div>
    );
  }

  const s = stats.data;
  const taskTabs = [
    { key: "orders" as TaskType, label: "Đơn cần xử lý", roles: [] },
    { key: "debt" as TaskType, label: "Công nợ đến hạn", roles: [] },
    { key: "cod" as TaskType, label: "Cần giao (COD)", roles: [] },
    { key: "stock" as TaskType, label: "Tồn cảnh báo", roles: [] },
  ];

  return (
    <div>
      <DashboardHeader />

      {/* ── Mobile (dưới md) ── */}
      <div className="md:hidden">
        <DashboardMobileView />
      </div>

      {/* ── Desktop (từ md) ── */}
      <div className="hidden md:block dt-dash min-h-[calc(100vh-56px)] overflow-auto">
        {/* Subbar */}
        <div className="flex items-center gap-[14px] flex-wrap px-7 pt-4 pb-[14px]">
          <div className="mr-auto">
            <h1 className="text-[22px] font-bold tracking-tight">Tổng quan</h1>
            <div
              className="text-[13px] mt-px"
              style={{ color: "var(--dt-text-muted)" }}>
              Toàn cảnh vận hành &amp; tài chính các chi nhánh
            </div>
          </div>

          <div className="flex items-center gap-[7px]">
            <MapPin
              className="w-4 h-4"
              style={{ color: "var(--dt-text-muted)" }}
            />
            <select
              className="dt-select"
              value={branchId ?? "all"}
              onChange={(e) =>
                setBranchId(
                  e.target.value === "all" ? undefined : Number(e.target.value),
                )
              }>
              <option value="all">Tất cả chi nhánh</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <DashRangeSeg
            options={RANGES}
            value={range}
            custom={rangeCustom}
            onChange={(k, c) => {
              setRange(k);
              if (c) setRangeCustom(c);
            }}
          />

          <div className="flex items-center gap-[10px]">
            <span
              className="inline-flex items-center gap-[7px] text-[12.5px] px-3 py-[6px] rounded-[20px]"
              style={{
                color: "var(--dt-text-secondary)",
                background: "var(--dt-cyan-bg)",
              }}>
              <i
                className="w-[7px] h-[7px] rounded-full dt-pulse"
                style={{ background: "var(--dt-success)" }}
              />
              Cập nhật <span className="dt-mono">{liveAt}</span>
            </span>
            <Link
              href="/bao-cao/khach-hang"
              className="inline-flex items-center gap-[7px] rounded-[4px] font-semibold px-4 py-[9px] text-[13.5px] border-[1.5px] transition"
              style={{
                borderColor: "var(--dt-border)",
                color: "var(--dt-text-secondary)",
              }}>
              <Download className="w-4 h-4" /> Xuất báo cáo
            </Link>
            <Link
              href="/ban-hang"
              className="inline-flex items-center gap-[7px] rounded-[4px] font-semibold px-4 py-[9px] text-[13.5px] text-white transition"
              style={{ background: "var(--dt-primary)" }}>
              <Plus className="w-4 h-4" /> Tạo đơn mới
            </Link>
          </div>
        </div>

        <div className="px-7 pb-16">
          {/* ── KPIs ── */}
          <div className="grid gap-4 mb-2 grid-cols-[repeat(auto-fit,minmax(208px,1fr))]">
            <KpiCard
              icon={<DollarSign className="w-[18px] h-[18px]" />}
              iconBg="rgba(0,183,204,.12)"
              iconColor="#00B7CC"
              accent="#00B7CC"
              name="Doanh thu"
              value={money(s?.currentRevenue ?? 0)}
              delta={s ? deltaPct(s.revenueChange) : undefined}
              deltaDir={dir(s?.revenueChange ?? 0)}
              vs="so với kỳ trước"
            />
            {canSeeProfit && (
              <KpiCard
                icon={<TrendingUp className="w-[18px] h-[18px]" />}
                iconBg="rgba(201,168,76,.16)"
                iconColor="#9A7A2A"
                accent="#C9A84C"
                name="Lợi nhuận (tạm tính)"
                value={money(s?.profit ?? 0)}
                delta={
                  s
                    ? `biên ${Math.round((s.marginAvg ?? 0) * 100)}%`
                    : undefined
                }
                deltaDir={dir(s?.profitChange ?? 0)}
                vs="theo giá vốn kho"
              />
            )}
            <KpiCard
              icon={<Receipt className="w-[18px] h-[18px]" />}
              iconBg="rgba(46,139,143,.14)"
              iconColor="#2E8B8F"
              accent="#2E8B8F"
              name="Số hóa đơn"
              value={vi(s?.invoiceCount ?? 0)}
              delta={s ? deltaPct(s.invoiceChange) : undefined}
              deltaDir={dir(s?.invoiceChange ?? 0)}
              vs="so với kỳ trước"
            />
            <KpiCard
              icon={<AlignJustify className="w-[18px] h-[18px]" />}
              iconBg="rgba(26,95,106,.14)"
              iconColor="#1A5F6A"
              accent="#1A5F6A"
              name="Giá trị TB/đơn"
              value={money(s?.aov ?? 0)}
              delta={s ? deltaPct(s.aovChange) : undefined}
              deltaDir={dir(s?.aovChange ?? 0)}
              vs="so với kỳ trước"
            />
            <KpiCard
              icon={<CreditCard className="w-[18px] h-[18px]" />}
              iconBg="rgba(201,168,76,.16)"
              iconColor="#9A7A2A"
              accent="#C9A84C"
              name="Công nợ phải thu"
              value={money(s?.totalCustomerDebt ?? 0)}
              delta={s ? money(s.unpaidAmount) : undefined}
              deltaDir="down"
              vs="chưa tất toán"
            />
            <KpiCard
              icon={<FileText className="w-[18px] h-[18px]" />}
              iconBg="rgba(46,139,143,.14)"
              iconColor="#2E8B8F"
              accent="#2E8B8F"
              name="HĐ còn phải thu"
              value={vi(s?.unpaidInvoices ?? 0)}
              valueSuffix="đơn"
              vs="chưa tất toán"
            />
            <KpiCard
              icon={<Truck className="w-[18px] h-[18px]" />}
              iconBg="rgba(0,183,204,.12)"
              iconColor="#00A5B5"
              accent="#00A5B5"
              name="COD đang luân chuyển"
              value={money(s?.codAmount ?? 0)}
              delta={s ? `${s.codCount} đơn` : undefined}
              deltaDir="up"
            />
            <KpiCard
              icon={<AlertTriangle className="w-[18px] h-[18px]" />}
              iconBg="rgba(192,57,43,.1)"
              iconColor="#C0392B"
              accent="#C0392B"
              name="Tồn cảnh báo"
              value={vi(
                (s?.lowStockProducts ?? 0) + (s?.outOfStockProducts ?? 0),
              )}
              valueSuffix="mã"
              delta={
                s && s.negativeStock > 0
                  ? `${s.negativeStock} mã âm kho`
                  : "Ổn định"
              }
              deltaDir={s && s.negativeStock > 0 ? "down" : "flat"}
            />
          </div>

          {/* ── Trend + Category ── */}
          <div className="grid gap-4 mb-4 lg:grid-cols-[1.7fr_1fr] grid-cols-1">
            <div className="dt-panel">
              <div
                className="flex items-center gap-3 p-[17px_20px] border-b"
                style={{ borderColor: "var(--dt-border)" }}>
                <div>
                  <h3 className="text-[15.5px] font-bold">
                    Doanh thu{canSeeProfit ? " / lợi nhuận" : ""} theo thời gian
                  </h3>
                  <div
                    className="text-[12.5px] mt-0.5"
                    style={{ color: "var(--dt-text-muted)" }}>
                    {rangeSubtitle(range, rangeCustom)}
                  </div>
                </div>
                <button
                  type="button"
                  aria-pressed={showRev}
                  title={
                    showRev ? "Ẩn đường doanh thu" : "Hiện đường doanh thu"
                  }
                  onClick={() => {
                    // Không tắt nếu DT đang là chỉ số active duy nhất.
                    if (showRev && !showLn) return;
                    setShowRev((v) => !v);
                  }}
                  className="ml-auto text-[11.5px] font-semibold px-[11px] py-1 rounded-[20px] cursor-pointer transition-opacity"
                  style={{
                    color: "var(--dt-primary)",
                    background: "rgba(0,183,204,.08)",
                    opacity: showRev ? 1 : 0.45,
                  }}>
                  DT {money(s?.currentRevenue ?? 0)}
                </button>
                {canSeeProfit && (
                  <button
                    type="button"
                    aria-pressed={showLn}
                    title={
                      showLn ? "Ẩn đường lợi nhuận" : "Hiện đường lợi nhuận"
                    }
                    onClick={() => {
                      // Không tắt nếu LN đang là chỉ số active duy nhất.
                      if (showLn && !showRev) return;
                      setShowLn((v) => !v);
                    }}
                    className="text-[11.5px] font-semibold px-[11px] py-1 rounded-[20px] cursor-pointer transition-opacity"
                    style={{
                      color: "#9A7A2A",
                      background: "rgba(201,168,76,.13)",
                      opacity: showLn ? 1 : 0.45,
                    }}>
                    LN {money(s?.profit ?? 0)}
                  </button>
                )}
              </div>
              <div className="p-[18px_20px]">
                <RevenueTrendChart
                  data={trend.data ?? []}
                  showProfit={canSeeProfit}
                  showRevenue={showRev}
                  showProfitLine={canSeeProfit && showLn}
                />
              </div>
            </div>

            <div className="dt-panel">
              <div
                className="flex items-center gap-3 p-[17px_20px] border-b"
                style={{ borderColor: "var(--dt-border)" }}>
                <div>
                  <h3 className="text-[15.5px] font-bold">
                    Cơ cấu theo nhóm hàng
                  </h3>
                  <div
                    className="text-[12.5px] mt-0.5"
                    style={{ color: "var(--dt-text-muted)" }}>
                    Tỷ trọng doanh thu ·{" "}
                    {rangeSubtitle(range, rangeCustom).replace(
                      /^Theo (giờ|ngày) · /,
                      "",
                    )}
                  </div>
                </div>
                <select
                  className="dt-select dt-select-sm ml-auto"
                  value={catDim}
                  onChange={(e) =>
                    setCatDim(e.target.value as CategoryDimension)
                  }>
                  <option value="parent">Loại hàng</option>
                  <option value="middle">Nguồn gốc</option>
                  <option value="child">Danh mục</option>
                </select>
              </div>
              <div className="p-[18px_20px]">
                <CategoryDonut data={category.data ?? []} />
              </div>
            </div>
          </div>

          {/* ── Top 10 hàng bán chạy + Top 10 khách mua nhiều nhất ── */}
          <div className="grid gap-4 mb-4 lg:grid-cols-2 grid-cols-1">
            <div className="dt-panel flex flex-col">
              <div
                className="flex items-center gap-3 p-[17px_20px] border-b flex-wrap"
                style={{ borderColor: "var(--dt-border)" }}>
                <h3 className="text-[15.5px] font-bold">
                  Top 10 hàng bán chạy
                </h3>
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  <DashSelect
                    ariaLabel="Tiêu chí xếp hạng"
                    options={TOP_METRICS.filter(
                      (m) => m.key !== "profit" || canSeeProfit,
                    )}
                    value={topMetric}
                    onChange={(v) => {
                      if (v === "profit" && !canSeeProfit) return;
                      setTopMetric(v);
                    }}
                  />
                  <DashSelect
                    ariaLabel="Thời gian top hàng bán chạy"
                    options={RANGES}
                    value={topRange}
                    custom={topCustom}
                    allowCustom
                    onChange={(k, c) => {
                      setTopRange(k);
                      if (c) setTopCustom(c);
                    }}
                  />
                </div>
              </div>
              <div className="p-[18px_20px] flex-1">
                <TopProducts
                  items={topProducts.data ?? []}
                  metric={topMetric}
                  loading={topProducts.isLoading}
                />
              </div>
            </div>

            <div className="dt-panel flex flex-col">
              <div
                className="flex items-center gap-3 p-[17px_20px] border-b flex-wrap"
                style={{ borderColor: "var(--dt-border)" }}>
                <h3 className="text-[15.5px] font-bold">
                  Top 10 khách mua nhiều nhất
                </h3>
                <div className="ml-auto">
                  <DashSelect
                    ariaLabel="Thời gian top khách mua nhiều nhất"
                    options={RANGES}
                    value={buyerRange}
                    custom={buyerCustom}
                    allowCustom
                    onChange={(k, c) => {
                      setBuyerRange(k);
                      if (c) setBuyerCustom(c);
                    }}
                  />
                </div>
              </div>
              <div className="p-[18px_20px] flex-1">
                <TopBuyers
                  items={topBuyers.data ?? []}
                  loading={topBuyers.isLoading}
                />
              </div>
            </div>
          </div>

          {/* ── Branch compare + Finance ── */}
          <div className="grid gap-4 mb-4 lg:grid-cols-2 grid-cols-1">
            <div className="dt-panel flex flex-col">
              <div
                className="flex items-center gap-3 p-[17px_20px] border-b flex-wrap"
                style={{ borderColor: "var(--dt-border)" }}>
                <div>
                  <h3 className="text-[15.5px] font-bold">So sánh chi nhánh</h3>
                  <div
                    className="text-[12.5px] mt-0.5"
                    style={{ color: "var(--dt-text-muted)" }}>
                    {branchMetric === "profit" ? "Lợi nhuận" : "Doanh thu"} ·{" "}
                    {branchRange === "custom"
                      ? customLabel(branchCustom)
                      : PERIOD_LABEL[branchRange].toLowerCase()}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  {canSeeProfit && (
                    <div className="dt-seg dt-seg-sm">
                      <button
                        data-on={branchMetric === "rev"}
                        onClick={() => setBranchMetric("rev")}>
                        Doanh thu
                      </button>
                      <button
                        data-on={branchMetric === "profit"}
                        onClick={() => setBranchMetric("profit")}>
                        Lợi nhuận
                      </button>
                    </div>
                  )}
                  <DashSelect
                    ariaLabel="Thời gian so sánh chi nhánh"
                    options={BRANCH_OPTIONS}
                    value={branchRange}
                    custom={branchCustom}
                    allowCustom
                    onChange={(k, c) => {
                      setBranchRange(k);
                      if (c) setBranchCustom(c);
                    }}
                  />
                </div>
              </div>
              <div className="p-[18px_20px]">
                <BranchCompareChart
                  data={branchCmp.data ?? { labels: [], branches: [] }}
                />
              </div>
            </div>

            <FinancePanel
              data={finance.data}
              finRange={finRange}
              finCustom={finCustom}
              onFinRangeChange={(k, c) => {
                setFinRange(k);
                if (c) setFinCustom(c);
              }}
            />
          </div>

          {/* ── Tasks + Activity ── */}
          <div className="grid gap-4 mb-4 lg:grid-cols-[1.7fr_1fr] grid-cols-1">
            <TaskTabs
              tabs={taskTabs}
              active={taskTab}
              onTabChange={setTaskTab}
              rows={tasks.data ?? []}
              counts={taskCounts.data ?? {}}
              loading={tasks.isLoading}
              statusFilter={taskStatus}
              onStatusFilterChange={setTaskStatus}
            />
            <div className="dt-panel flex flex-col">
              <div
                className="flex items-center gap-3 p-[17px_20px] border-b"
                style={{ borderColor: "var(--dt-border)" }}>
                <div>
                  <h3 className="text-[15.5px] font-bold">Hoạt động gần đây</h3>
                  <div
                    className="text-[12.5px] mt-0.5"
                    style={{ color: "var(--dt-text-muted)" }}>
                    Đơn hàng mới nhất toàn hệ thống
                  </div>
                </div>
                <span
                  className="ml-auto inline-flex items-center gap-[7px] text-[12.5px] px-3 py-[6px] rounded-[20px]"
                  style={{
                    color: "var(--dt-text-secondary)",
                    background: "var(--dt-cyan-bg)",
                  }}>
                  <i
                    className="w-[7px] h-[7px] rounded-full dt-pulse"
                    style={{ background: "var(--dt-success)" }}
                  />
                  Trực tiếp
                </span>
              </div>
              <ActivityFeed items={activities.data ?? []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
