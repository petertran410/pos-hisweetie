"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { useSandboxSync } from "@/lib/hooks/useSandboxSync";
import { useSandboxStore } from "@/lib/store/sandbox";
import { FlaskConical } from "lucide-react";

export function DashboardHeader() {
  const router = useRouter();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, clearAuth } = useAuthStore();

  const posActions = useFilteredPosActions();
  const { isSandbox, toggleSandbox } = useSandboxStore();
  useSandboxSync();

  const handleLogout = () => {
    clearAuth();
    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  const productSubmenu = useMemo(
    () => [
      {
        title: "Hàng hóa",
        items: [
          {
            label: "Danh sách hàng hóa",
            href: "/san-pham/danh-sach",
          },
          {
            label: "Thiết lập giá",
            href: "/san-pham/thiet-lap-gia",
          },
        ],
      },
      {
        title: "Kiểm kho",
        items: [
          {
            label: "Kiểm kho",
            href: "/san-pham/kiem-kho",
          },
          {
            label: "Kiểm hàng loại B",
            href: "/san-pham/kiem-hang-loai-b",
          },
        ],
      },
      {
        title: "Kho hàng",
        items: [
          {
            label: "Chuyển hàng",
            href: "/san-pham/chuyen-hang",
          },
          {
            label: "Sản xuất",
            href: "/san-pham/san-xuat",
          },
          {
            label: "Xuất hủy",
            href: "/san-pham/xuat-huy",
          },
        ],
      },
      {
        title: "Nhập hàng",
        items: [
          {
            label: "Nhà cung cấp",
            href: "/san-pham/nha-cung-cap",
          },
          {
            label: "Đặt hàng nhập",
            href: "/san-pham/dat-hang-nhap",
          },
          {
            label: "Nhập hàng",
            href: "/san-pham/nhap-hang",
          },
        ],
      },
    ],
    []
  );

  const orderSubmenu = useMemo(
    () => [
      {
        label: "Đặt hàng",
        href: "/don-hang/dat-hang",
      },
      {
        label: "Hóa đơn",
        href: "/don-hang/hoa-don",
      },
      {
        label: "Trả hàng",
        href: "/don-hang/tra-hang",
      },
      {
        label: "Cấn trừ công nợ",
        href: "/don-hang/can-tru-cong-no",
      },
      {
        label: "Báo đơn",
        href: "/don-hang/bao-don",
      },
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

  return (
    <header className="text-black">
      <div className="flex items-center h-14">
        <div className="px-4 flex items-center gap-8">
          <Link href="/" className="font-bold text-lg">
            Hisweetie
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
              Tổng quan
            </Link>
            {filteredProductSubmenu.length > 0 && (
              <div
                className="relative"
                onMouseEnter={() => setHoveredMenu("products")}
                onMouseLeave={() => setHoveredMenu(null)}>
                <button className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
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
                                  className="block px-4 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
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
                <button className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
                  Đơn hàng
                </button>

                {hoveredMenu === "orders" && (
                  <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md z-50 border">
                    <ul>
                      {filteredOrderSubmenu.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block px-5 py-2 min-w-max hover:bg-gray-100 rounded-md text-md transition-colors">
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
                className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
                Khách hàng
              </Link>
            </PermissionGate>

            <PermissionGate resource="cash_flows" action="view">
              <Link
                href="/so-quy"
                className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
                Sổ quỹ
              </Link>
            </PermissionGate>
          </nav>
        </div>

        <div className="ml-auto px-4 flex items-center gap-4">
          {posActions.length > 0 && (
            <div
              className="relative"
              onMouseEnter={() => setHoveredMenu("pos")}
              onMouseLeave={() => setHoveredMenu(null)}>
              <button className="px-4 py-4 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors font-medium">
                🛒 Bán hàng
              </button>
              {hoveredMenu === "pos" && (
                <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md min-w-max z-50 border">
                  <ul className="px-2 py-2">
                    {posActions.map((item) => (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className="block px-4 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            onClick={toggleSandbox}
            title={
              isSandbox ? "Đang ở chế độ Sandbox" : "Chuyển sang chế độ Sandbox"
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isSandbox
                ? "bg-amber-400 text-amber-900 hover:bg-amber-500"
                : "bg-white/10 text-gray-600 hover:bg-gray-200"
            }`}>
            <FlaskConical className="w-4 h-4" />
            {isSandbox ? "Sandbox" : "Live"}
          </button>

          <BranchSelector />

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-300 rounded transition-colors">
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
    </header>
  );
}
