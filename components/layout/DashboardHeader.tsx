"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import { BranchSelector } from "./BranchSelector";
import {
  useFilteredPosActions,
  useFilteredSections,
  useFilteredMenuItems,
} from "@/lib/hooks/useCan";
import { ROUTE_PERMISSIONS } from "@/lib/permissions/registry";
import { PermissionGate } from "../permissions/PermissionGate";
import {
  Menu,
  X,
  ChevronDown,
  Settings,
  LogOut,
  ShoppingCart,
} from "lucide-react";

export function DashboardHeader() {
  const router = useRouter();
  // ── Desktop states (giữ nguyên) ──
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  // ── Mobile states (thêm mới) ──
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedMobileSection, setExpandedMobileSection] = useState<
    string | null
  >(null);

  const { user, clearAuth } = useAuthStore();
  const posActions = useFilteredPosActions();

  const handleLogout = () => {
    clearAuth();
    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  const closeMobileMenu = () => setShowMobileMenu(false);

  const toggleMobileSection = (key: string) =>
    setExpandedMobileSection((prev) => (prev === key ? null : key));

  // ── Data (giữ nguyên từ source thực tế) ──
  const productSubmenu = useMemo(
    () => [
      {
        title: "Hàng hóa",
        items: [
          { label: "Danh sách hàng hóa", href: "/san-pham/danh-sach" },
          { label: "Thiết lập giá", href: "/san-pham/thiet-lap-gia" },
        ],
      },
      {
        title: "Kiểm kho",
        items: [
          { label: "Kiểm kho", href: "/san-pham/kiem-kho" },
          { label: "Kiểm hàng loại B", href: "/san-pham/kiem-hang-loai-b" },
        ],
      },
      {
        title: "Kho hàng",
        items: [
          { label: "Chuyển hàng", href: "/san-pham/chuyen-hang" },
          { label: "Sản xuất", href: "/san-pham/san-xuat" },
          { label: "Xuất hủy", href: "/san-pham/xuat-huy" },
        ],
      },
      {
        title: "Nhập hàng",
        items: [
          { label: "Nhà cung cấp", href: "/san-pham/nha-cung-cap" },
          { label: "Đặt hàng nhập", href: "/san-pham/dat-hang-nhap" },
          { label: "Nhập hàng", href: "/san-pham/nhap-hang" },
          { label: "Trả hàng nhập", href: "/san-pham/tra-hang-nhap" },
        ],
      },
    ],
    []
  );

  const orderSubmenu = useMemo(
    () => [
      { label: "Đặt hàng", href: "/don-hang/dat-hang" },
      { label: "Hóa đơn", href: "/don-hang/hoa-don" },
      { label: "Hóa đơn VAT", href: "/don-hang/hoa-don-vat" },
      { label: "Trả hàng", href: "/don-hang/tra-hang" },
      { label: "Cấn trừ công nợ", href: "/don-hang/can-tru-cong-no" },
      { label: "Báo đơn", href: "/don-hang/bao-don" },
    ],
    []
  );

  const filteredProductSubmenu = useFilteredSections(
    productSubmenu,
    ROUTE_PERMISSIONS
  );
  const filteredOrderSubmenu = useFilteredMenuItems(
    orderSubmenu,
    ROUTE_PERMISSIONS
  );

  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [showMobileMenu]);

  return (
    <header className=" text-gray-700">
      <div className="flex items-center h-14">
        {/* ═══════════════════════════════════════════════
            DESKTOP LAYOUT — hidden dưới lg
        ════════════════════════════════════════════════ */}
        <div className="hidden lg:flex items-center flex-1 h-full">
          <div className="px-4 flex items-center gap-8">
            <Link href="/" className="font-bold text-lg">
              Hisweetie
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="px-4 py-2 hover:bg-gray-400 rounded transition-colors">
                Tổng quan
              </Link>

              {filteredProductSubmenu.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredMenu("products")}
                  onMouseLeave={() => setHoveredMenu(null)}>
                  <button className="px-4 py-2 hover:bg-gray-400 rounded transition-colors">
                    Hàng hóa
                  </button>
                  {hoveredMenu === "products" && (
                    <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md min-w-max z-50 border">
                      <div className="flex gap-6 p-6">
                        {filteredProductSubmenu.map((section) => (
                          <div key={section.title}>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50">
                              {section.title}
                            </div>
                            <ul>
                              {section.items.map((item) => (
                                <li key={item.href}>
                                  <Link
                                    href={item.href}
                                    className="block px-4 py-2 hover:bg-gray-400 rounded-md text-md transition-colors">
                                    {item.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {filteredOrderSubmenu.length > 0 && (
                <div
                  className="relative"
                  onMouseEnter={() => setHoveredMenu("orders")}
                  onMouseLeave={() => setHoveredMenu(null)}>
                  <button className="px-4 py-2 hover:bg-gray-400 rounded transition-colors">
                    Đơn hàng
                  </button>
                  {hoveredMenu === "orders" && (
                    <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md z-50 border">
                      <ul>
                        {filteredOrderSubmenu.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className="block px-5 py-2 min-w-max hover:bg-gray-400 rounded-md text-md transition-colors">
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <PermissionGate resource="customers" action="view">
                <Link
                  href="/khach-hang"
                  className="px-4 py-2 hover:bg-gray-400 rounded transition-colors">
                  Khách hàng
                </Link>
              </PermissionGate>

              <PermissionGate resource="cash_flows" action="view">
                <Link
                  href="/so-quy"
                  className="px-4 py-2 hover:bg-gray-400 rounded transition-colors">
                  Sổ quỹ
                </Link>
              </PermissionGate>

              <Link
                href="/bao-cao/khach-hang"
                className="px-4 py-2 hover:bg-gray-400 rounded transition-colors">
                Báo cáo
              </Link>
            </nav>
          </div>

          <div className="ml-auto px-4 flex items-center gap-4">
            {posActions.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setHoveredMenu("pos")}
                onMouseLeave={() => setHoveredMenu(null)}>
                <button className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-400 transition-colors font-medium">
                  🛒 Bán hàng
                </button>
                {hoveredMenu === "pos" && (
                  <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md min-w-max z-50 border">
                    <ul className="px-2 py-2">
                      {posActions.map((item) => (
                        <li key={item.key}>
                          <Link
                            href={item.href}
                            className="block px-4 py-2 hover:bg-gray-400 rounded-md text-md transition-colors">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <BranchSelector />

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-400 rounded transition-colors">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm">{user?.name}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <div className="flex flex-col">
                    <Link
                      href="/cai-dat"
                      className="px-4 py-2 text-sm hover:bg-gray-100">
                      Cài Đặt
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            MOBILE LAYOUT — hiện dưới lg
        ════════════════════════════════════════════════ */}
        <div className="flex lg:hidden items-center justify-between w-full px-4">
          <Link href="/" className="font-bold text-lg">
            Hisweetie
          </Link>
          <div className="flex items-center gap-1">
            {posActions.length > 0 && (
              <Link
                href={posActions[0]?.href ?? "/ban-hang"}
                className="p-2 hover:bg-blue-700 rounded transition-colors"
                aria-label="Bán hàng">
                <ShoppingCart className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setShowMobileMenu(true)}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              aria-label="Mở menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MOBILE DRAWER
      ════════════════════════════════════════════════ */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeMobileMenu}
          />

          {/* Drawer — blue theme */}
          <div className="fixed top-0 left-0 h-full w-72 bg-blue-700 z-50 flex flex-col lg:hidden shadow-xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-blue-600 flex-shrink-0">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="font-bold text-lg text-white">
                Hisweetie
              </Link>
              <button
                onClick={closeMobileMenu}
                className="p-2 hover:bg-blue-600 rounded transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto py-2">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="flex items-center px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                Tổng quan
              </Link>

              {/* Hàng hóa accordion */}
              {filteredProductSubmenu.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleMobileSection("products")}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                    <span>Hàng hóa</span>
                    <ChevronDown
                      className={`w-4 h-4 text-white transition-transform duration-200 ${expandedMobileSection === "products" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expandedMobileSection === "products" && (
                    <div className="bg-blue-800/40">
                      {filteredProductSubmenu.map((section) => (
                        <div key={section.title}>
                          <p className="px-6 pt-3 pb-1 text-xs font-semibold text-blue-300 uppercase tracking-wider">
                            {section.title}
                          </p>
                          {section.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeMobileMenu}
                              className="flex items-center px-8 py-2.5 text-sm text-white hover:bg-blue-600 transition-colors">
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Đơn hàng accordion */}
              {filteredOrderSubmenu.length > 0 && (
                <div>
                  <button
                    onClick={() => toggleMobileSection("orders")}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                    <span>Đơn hàng</span>
                    <ChevronDown
                      className={`w-4 h-4 text-white transition-transform duration-200 ${expandedMobileSection === "orders" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expandedMobileSection === "orders" && (
                    <div className="bg-blue-800/40">
                      {filteredOrderSubmenu.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobileMenu}
                          className="flex items-center px-8 py-2.5 text-sm text-white hover:bg-blue-600 transition-colors">
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <PermissionGate resource="customers" action="view">
                <Link
                  href="/khach-hang"
                  onClick={closeMobileMenu}
                  className="flex items-center px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                  Khách hàng
                </Link>
              </PermissionGate>

              <PermissionGate resource="cash_flows" action="view">
                <Link
                  href="/so-quy"
                  onClick={closeMobileMenu}
                  className="flex items-center px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                  Sổ quỹ
                </Link>
              </PermissionGate>

              <Link
                href="/bao-cao/khach-hang"
                onClick={closeMobileMenu}
                className="flex items-center px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors">
                Báo cáo
              </Link>

              {/* Bán hàng shortcut */}
              {posActions.length > 0 && (
                <div className="px-4 mt-3">
                  <div className="border border-blue-500 rounded-lg overflow-hidden">
                    {posActions.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-white hover:bg-blue-600 transition-colors border-b border-blue-500 last:border-b-0">
                        <ShoppingCart className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            {/* Drawer footer — User info + Cài đặt + Logout */}
            <div className="flex-shrink-0 border-t border-blue-600">
              <div className="px-4 py-3 border-b border-blue-600">
                <BranchSelector dropUp />
              </div>

              {/* User info + buttons — giữ nguyên */}
              <div className="px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-blue-300 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href="/cai-dat"
                    onClick={closeMobileMenu}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-white border border-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
                    <Settings className="w-4 h-4" />
                    Cài đặt
                  </Link>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleLogout();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-300 border border-red-400/50 rounded-lg hover:bg-blue-600 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
