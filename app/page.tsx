"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  dashboardApi,
  type DashboardStats,
  type TodayStats,
  type RevenueChartItem,
  type TopCustomer,
  type TopProduct,
  type LowStockProduct,
  type RecentOrder,
  type RecentActivity,
} from "@/lib/api/dashboard";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  AlertTriangle,
  Loader2,
  DollarSign,
  Undo2,
  BarChart3,
  Clock,
  FileText,
} from "lucide-react";

// ===== HELPERS =====

const ORDER_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ xử lý", cls: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Đã xác nhận", cls: "bg-blue-100 text-blue-800" },
  processing: { label: "Đang xử lý", cls: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Hoàn thành", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "Đã hủy", cls: "bg-red-100 text-red-800" },
  delivering: { label: "Đang giao", cls: "bg-purple-100 text-purple-800" },
};

function formatCompact(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
  }
  if (abs >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + " tr";
  }
  if (abs >= 1_000) {
    return (value / 1_000).toFixed(0) + "k";
  }
  return value.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

// ===== MAIN =====

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueChartItem[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [s, t, chart, cust, prod, stock, orders, acts] =
          await Promise.all([
            dashboardApi.getStats(),
            dashboardApi.getTodayStats(),
            dashboardApi.getRevenueChart(6),
            dashboardApi.getTopCustomers(10),
            dashboardApi.getTopProducts(10),
            dashboardApi.getLowStock(10),
            dashboardApi.getRecentOrders(10),
            dashboardApi.getRecentActivities(15),
          ]);
        setStats(s);
        setTodayStats(t);
        setRevenueChart(chart);
        setTopCustomers(cust);
        setTopProducts(prod);
        setLowStock(stock);
        setRecentOrders(orders);
        setActivities(acts);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [_hasHydrated, isAuthenticated]);

  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const maxRevenue = Math.max(...revenueChart.map((d) => d.revenue), 1);
  const maxProductRevenue = Math.max(
    ...topProducts.map((p) => p.totalRevenue),
    1
  );
  const maxCustomerPurchased = Math.max(
    ...topCustomers.map((c) => Number(c.totalPurchased)),
    1
  );

  return (
    <div>
      <DashboardHeader />
      <div className="p-6 bg-gray-50 min-h-[calc(100vh-56px)] overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* =============== ROW 1: KẾT QUẢ HÔM NAY =============== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 bg-white rounded-lg border p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Kết quả bán hàng hôm nay
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <span className="text-xs text-gray-500">Doanh thu</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(todayStats?.todayRevenue || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {todayStats?.todayOrders || 0} đơn hàng
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-xs text-gray-500">Hóa đơn</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(todayStats?.todayInvoiceRevenue || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {todayStats?.todayInvoiceCount || 0} hóa đơn
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                        <Undo2 className="w-3.5 h-3.5 text-orange-600" />
                      </div>
                      <span className="text-xs text-gray-500">Trả hàng</span>
                    </div>
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(todayStats?.todayReturns || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {todayStats?.todayReturnCount || 0} phiếu trả
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-xs text-gray-500">
                        Doanh thu thuần
                      </span>
                    </div>
                    <div className="text-lg font-bold text-emerald-700">
                      {formatCurrency(todayStats?.todayNetRevenue || 0)}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      DT - Trả hàng
                    </div>
                  </div>
                </div>
              </div>

              {/* Cảnh báo công nợ */}
              <div className="bg-white rounded-lg border p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    Công nợ
                  </span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Khách hàng nợ</span>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(stats?.totalCustomerDebt || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Nợ NCC</span>
                    <div className="text-sm font-semibold text-gray-700">
                      {formatCurrency(stats?.totalSupplierDebt || 0)}
                    </div>
                  </div>
                </div>
                <Link
                  href="/khach-hang"
                  className="text-xs text-blue-600 hover:underline mt-2">
                  Xem chi tiết →
                </Link>
              </div>
            </div>

            {/* =============== ROW 2: 4 STAT CARDS THÁNG =============== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Doanh thu tháng này
                  </span>
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats?.currentRevenue || 0)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {(stats?.revenueChange || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span
                    className={`text-xs font-medium ${(stats?.revenueChange || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {(stats?.revenueChange || 0) >= 0 ? "+" : ""}
                    {stats?.revenueChange || 0}% so với tháng trước
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Đơn hàng tháng này
                  </span>
                  <ShoppingCart className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats?.currentMonthOrders || 0)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Tháng trước: {formatCurrency(stats?.lastRevenue || 0)}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Công nợ khách hàng
                  </span>
                  <Users className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(stats?.totalCustomerDebt || 0)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Công nợ NCC: {formatCurrency(stats?.totalSupplierDebt || 0)}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    Cảnh báo tồn kho
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-4">
                  <div>
                    <span className="text-xl font-bold text-amber-600">
                      {stats?.lowStockProducts || 0}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">sắp hết</span>
                  </div>
                  <div>
                    <span className="text-xl font-bold text-red-600">
                      {stats?.outOfStockProducts || 0}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">hết hàng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* =============== ROW 3: BIỂU ĐỒ + HOẠT ĐỘNG =============== */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
              {/* Biểu đồ doanh thu */}
              <div className="lg:col-span-3 bg-white rounded-lg border p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Doanh thu 6 tháng gần nhất
                  </h2>
                  <span className="text-xs text-gray-400">Tháng này</span>
                </div>

                {revenueChart.length > 0 ? (
                  <div className="mt-2">
                    {/* Y-axis labels + bars */}
                    <div className="flex">
                      {/* Y axis */}
                      <div className="flex flex-col justify-between h-52 pr-2 text-right">
                        {[1, 0.75, 0.5, 0.25, 0].map((pct) => (
                          <span
                            key={pct}
                            className="text-[10px] text-gray-400 leading-none">
                            {formatCompact(maxRevenue * pct)}
                          </span>
                        ))}
                      </div>
                      {/* Bars */}
                      <div className="flex-1 flex items-end gap-3 h-52 border-l border-b border-gray-100 pl-2 pb-1">
                        {revenueChart.map((item, idx) => {
                          const pct =
                            maxRevenue > 0
                              ? (item.revenue / maxRevenue) * 100
                              : 0;
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center justify-end h-full">
                              <div
                                className="w-full max-w-[48px] bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors cursor-default relative group"
                                style={{
                                  height: `${Math.max(pct, 1)}%`,
                                }}>
                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                  {formatCurrency(item.revenue)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* X axis labels */}
                    <div className="flex ml-10 pl-2 mt-1">
                      {revenueChart.map((item, idx) => (
                        <div key={idx} className="flex-1 text-center">
                          <span className="text-[10px] text-gray-400">
                            {item.month}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-52 flex items-center justify-center text-sm text-gray-400">
                    Chưa có dữ liệu
                  </div>
                )}
              </div>

              {/* Hoạt động gần đây */}
              <div className="bg-white rounded-lg border p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-700">
                    Hoạt động gần đây
                  </h2>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[280px] space-y-0.5 pr-1">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
                      <FileText className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-medium text-blue-600">
                            {act.customerName}
                          </span>{" "}
                          vừa{" "}
                          <span className="font-medium text-blue-600">
                            đặt hàng
                          </span>{" "}
                          với giá trị{" "}
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(act.grandTotal)}
                          </span>
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {timeAgo(act.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-6">
                      Chưa có hoạt động
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* =============== ROW 4: TOP SẢN PHẨM + TOP KHÁCH HÀNG =============== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Top sản phẩm bán chạy */}
              <div className="bg-white rounded-lg border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    <BarChart3 className="w-4 h-4 inline mr-1 text-blue-500" />
                    Top 10 hàng bán chạy
                  </h2>
                  <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                    Tháng này
                  </span>
                </div>
                <div className="space-y-2.5">
                  {topProducts.map((product, idx) => {
                    const pct =
                      maxProductRevenue > 0
                        ? (product.totalRevenue / maxProductRevenue) * 100
                        : 0;
                    return (
                      <div key={product.productId}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-xs text-gray-700 truncate max-w-[65%]"
                            title={product.name}>
                            {product.name}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                            {formatCompact(product.totalRevenue)}
                          </span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-sm transition-all duration-500"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {topProducts.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-6">
                      Chưa có dữ liệu
                    </div>
                  )}
                </div>
              </div>

              {/* Top khách hàng */}
              <div className="bg-white rounded-lg border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    <Users className="w-4 h-4 inline mr-1 text-green-500" />
                    Top 10 khách mua nhiều nhất
                  </h2>
                  <Link
                    href="/khach-hang"
                    className="text-[11px] text-blue-600 hover:underline">
                    Xem tất cả
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {topCustomers.map((customer) => {
                    const purchased = Number(customer.totalPurchased);
                    const pct =
                      maxCustomerPurchased > 0
                        ? (purchased / maxCustomerPurchased) * 100
                        : 0;
                    return (
                      <div key={customer.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-xs text-gray-700 truncate max-w-[60%]"
                            title={customer.name}>
                            {customer.name}
                            {customer.customerType && (
                              <span className="text-gray-400 ml-1">
                                ({customer.customerType})
                              </span>
                            )}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                            {formatCompact(purchased)}
                          </span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-sm transition-all duration-500"
                            style={{ width: `${Math.max(pct, 1)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {topCustomers.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-6">
                      Chưa có dữ liệu
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* =============== ROW 5: ĐƠN HÀNG + TỒN KHO =============== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Đơn hàng gần đây */}
              <div className="bg-white rounded-lg border">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Đơn hàng gần đây
                  </h2>
                  <Link
                    href="/don-hang/dat-hang"
                    className="text-xs text-blue-600 hover:underline">
                    Xem tất cả
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="px-4 py-2 text-left font-medium">
                          Mã đơn
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Khách hàng
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Tổng tiền
                        </th>
                        <th className="px-4 py-2 text-center font-medium">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const si = ORDER_STATUS_MAP[order.orderStatus] || {
                          label: order.orderStatus,
                          cls: "bg-gray-100 text-gray-800",
                        };
                        return (
                          <tr
                            key={order.id}
                            className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-blue-600 text-xs">
                                {order.code}
                              </span>
                              <div className="text-[10px] text-gray-400">
                                {formatDate(order.orderDate)}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[180px] truncate">
                              {order.customerName}
                            </td>
                            <td className="px-4 py-2.5 text-right text-xs font-medium">
                              {formatCurrency(order.grandTotal)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${si.cls}`}>
                                {si.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {recentOrders.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-400 text-sm">
                            Chưa có đơn hàng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sản phẩm sắp hết hàng */}
              <div className="bg-white rounded-lg border">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-sm font-semibold text-gray-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500 inline mr-1" />
                    Sản phẩm sắp hết hàng
                  </h2>
                  <Link
                    href="/san-pham/danh-sach"
                    className="text-xs text-blue-600 hover:underline">
                    Xem kho
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="px-4 py-2 text-left font-medium">
                          Sản phẩm
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Chi nhánh
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Tồn
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Tối thiểu
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStock.map((item) => (
                        <tr key={item.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2.5">
                            <div className="text-xs font-medium text-gray-900 truncate max-w-[180px]">
                              {item.productName}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {item.productCode}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">
                            {item.branchName}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`text-xs font-bold ${item.onHand === 0 ? "text-red-600" : "text-amber-600"}`}>
                              {item.onHand}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-0.5">
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                            {item.minQuality} {item.unit}
                          </td>
                        </tr>
                      ))}
                      {lowStock.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-400 text-sm">
                            Không có sản phẩm sắp hết hàng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
