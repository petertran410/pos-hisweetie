"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import { BranchSelector } from "./BranchSelector";

export function DashboardHeader() {
  const router = useRouter();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, clearAuth } = useAuthStore();

  const handleLogout = () => {
    clearAuth();
    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  const productSubmenu = [
    {
      title: "Hàng hóa",
      items: [
        { label: "Danh sách hàng hóa", href: "/san-pham/danh-sach" },
        { label: "Thiết lập giá", href: "/san-pham/thiet-lap-gia" },
      ],
    },
    {
      title: "Kho hàng",
      items: [
        { label: "Chuyển hàng", href: "/san-pham/chuyen-hang" },
        { label: "Xuất hủy", href: "/san-pham/xuat-huy" },
      ],
    },
    {
      title: "Nhập hàng",
      items: [
        { label: "Đặt hàng nhập", href: "/san-pham/dat-hang-nhap" },
        { label: "Nhập hàng", href: "/san-pham/nhap-hang" },
        { label: "Trả hàng nhập", href: "/san-pham/tra-hang-nhap" },
      ],
    },
    {
      title: "Khác",
      items: [
        { label: "Nhà cung cấp", href: "/san-pham/nha-cung-cap" },
        { label: "Kiểm kho", href: "/san-pham/kiem-kho" },
      ],
    },
  ];

  const orderSubmenu = [
    { label: "Đặt hàng", href: "/don-hang/dat-hang" },
    { label: "Hóa đơn", href: "/don-hang/hoa-don" },
    { label: "Trả hàng", href: "/don-hang/tra-hang" },
  ];

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
              className="px-4 py-3 hover:bg-gray-300 rounded transition-colors">
              Tổng quan
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setHoveredMenu("products")}
              onMouseLeave={() => setHoveredMenu(null)}>
              <button className="px-4 py-3 hover:bg-gray-300 rounded transition-colors">
                Hàng hóa
              </button>

              {hoveredMenu === "products" && (
                <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md min-w-max z-50 border mt-1">
                  <div className="flex gap-6 p-6">
                    {productSubmenu.map((section) => (
                      <div key={section.title} className="min-w-[150px]">
                        <h3 className="font-semibold text-md px-3 mb-3 text-gray-600">
                          {section.title}
                        </h3>
                        <ul className="space-y-2">
                          {section.items.map((item) => (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="block px-3 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
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

            <div
              className="relative"
              onMouseEnter={() => setHoveredMenu("orders")}
              onMouseLeave={() => setHoveredMenu(null)}>
              <button className="px-4 py-3 hover:bg-gray-300 rounded transition-colors">
                Đơn hàng
              </button>

              {hoveredMenu === "orders" && (
                <div className="absolute top-full left-0 bg-white text-gray-800 shadow-lg rounded-md min-w-max z-50 mt-1">
                  <ul className="px-2 py-2">
                    {orderSubmenu.map((item) => (
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
              )}
            </div>

            <Link
              href="/khach-hang"
              className="px-4 py-3 hover:bg-gray-300 rounded transition-colors">
              Khách hàng
            </Link>

            <Link
              href="/so-quy"
              className="px-4 py-3 hover:bg-gray-300 rounded transition-colors">
              Sổ quỹ
            </Link>
          </nav>
        </div>

        <div className="ml-auto px-4 flex items-center gap-4">
          <Link
            href="/ban-hang"
            className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100 transition-colors font-medium">
            🛒 Bán hàng
          </Link>

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
                  <span className="text-sm font-medium">
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
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
