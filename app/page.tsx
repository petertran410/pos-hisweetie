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
  type RevenueChartItem,
  type TopCustomer,
  type LowStockProduct,
  type RecentOrder,
} from "@/lib/api/dashboard";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";

const ORDER_STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Chờ xử lý", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Đã xác nhận", className: "bg-blue-100 text-blue-800" },
  processing: {
    label: "Đang xử lý",
    className: "bg-indigo-100 text-indigo-800",
  },
  completed: { label: "Hoàn thành", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Đã hủy", className: "bg-red-100 text-red-800" },
  delivering: {
    label: "Đang giao",
    className: "bg-purple-100 text-purple-800",
  },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; className: string }> =
  {
    unpaid: { label: "Chưa thanh toán", className: "bg-red-100 text-red-800" },
    partial: {
      label: "Thanh toán 1 phần",
      className: "bg-yellow-100 text-yellow-800",
    },
    paid: { label: "Đã thanh toán", className: "bg-green-100 text-green-800" },
  };

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueChart, setRevenueChart] = useState<RevenueChartItem[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (!_hasHydrated || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [statsData, chartData, customersData, stockData, ordersData] =
          await Promise.all([
            dashboardApi.getStats(),
            dashboardApi.getRevenueChart(6),
            dashboardApi.getTopCustomers(5),
            dashboardApi.getLowStock(10),
            dashboardApi.getRecentOrders(10),
          ]);

        setStats(statsData);
        setRevenueChart(chartData);
        setTopCustomers(customersData);
        setLowStock(stockData);
        setRecentOrders(ordersData);
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

  return (
    <div>
      <DashboardHeader />
      <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)] overflow-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-5">Tổng quan</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* === STAT CARDS === */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Doanh thu */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    Doanh thu tháng này
                  </span>
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(stats?.currentRevenue || 0)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {(stats?.revenueChange || 0) >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      (stats?.revenueChange || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                    {(stats?.revenueChange || 0) >= 0 ? "+" : ""}
                    {stats?.revenueChange || 0}% so với tháng trước
                  </span>
                </div>
              </div>

              {/* Đơn hàng */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    Đơn hàng tháng này
                  </span>
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {stats?.currentMonthOrders || 0}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Công nợ NCC: {formatCurrency(stats?.totalSupplierDebt || 0)}
                </div>
              </div>

              {/* Công nợ KH */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    Công nợ khách hàng
                  </span>
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(stats?.totalCustomerDebt || 0)}
                </div>
                <Link
                  href="/khach-hang"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  Xem chi tiết →
                </Link>
              </div>

              {/* Tồn kho */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    Cảnh báo tồn kho
                  </span>
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="flex items-baseline gap-3">
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

            {/* === REVENUE CHART + TOP CUSTOMERS === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <div className="lg:col-span-2 bg-white rounded-lg border p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Doanh thu 6 tháng gần nhất
                </h2>
                {revenueChart.length > 0 ? (
                  <div className="flex items-end gap-2 h-48">
                    {revenueChart.map((item, idx) => {
                      const heightPct =
                        maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-gray-500 font-medium">
                            {item.revenue > 0
                              ? formatCurrency(
                                  Math.round(item.revenue / 1000000)
                                ) + "tr"
                              : "0"}
                          </span>
                          <div className="w-full flex justify-center">
                            <div
                              className="w-8 bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600 min-h-[4px]"
                              style={{ height: `${Math.max(heightPct, 2)}%` }}
                              title={formatCurrency(item.revenue)}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                    Chưa có dữ liệu
                  </div>
                )}
              </div>

              {/* Top Customers */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Top khách hàng
                  </h2>
                  <Link
                    href="/khach-hang"
                    className="text-xs text-blue-600 hover:underline">
                    Xem tất cả
                  </Link>
                </div>
                <div className="space-y-3">
                  {topCustomers.map((customer, idx) => (
                    <div key={customer.id} className="flex items-center gap-3">
                      <span className="w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {customer.name}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {customer.orderCount} đơn •{" "}
                          {customer.customerType || "—"}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(customer.totalPurchased))}
                        </div>
                        {Number(customer.totalDebt) > 0 && (
                          <div className="text-[11px] text-red-500">
                            Nợ: {formatCurrency(Number(customer.totalDebt))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {topCustomers.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">
                      Chưa có dữ liệu
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === RECENT ORDERS + LOW STOCK === */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
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
                        const statusInfo = ORDER_STATUS_MAP[
                          order.orderStatus
                        ] || {
                          label: order.orderStatus,
                          className: "bg-gray-100 text-gray-800",
                        };
                        return (
                          <tr
                            key={order.id}
                            className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-blue-600">
                                {order.code}
                              </span>
                              <div className="text-[11px] text-gray-400">
                                {formatDate(order.orderDate)}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700">
                              {order.customerName}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium">
                              {formatCurrency(order.grandTotal)}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusInfo.className}`}>
                                {statusInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {recentOrders.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-400">
                            Chưa có đơn hàng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Low Stock */}
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
                            <div className="font-medium text-gray-900 truncate max-w-[180px]">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {item.productCode}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-xs">
                            {item.branchName}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`font-bold ${
                                item.onHand === 0
                                  ? "text-red-600"
                                  : "text-amber-600"
                              }`}>
                              {item.onHand}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                              {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500">
                            {item.minQuality} {item.unit}
                          </td>
                        </tr>
                      ))}
                      {lowStock.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-gray-400">
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
