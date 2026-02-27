"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import { BranchSelector } from "./BranchSelector";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermission } from "@/lib/hooks/usePermissions";
import { usePermissionContext } from "@/lib/contexts/PermissionContext";

export function DashboardHeader() {
  const router = useRouter();
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, clearAuth } = useAuthStore();

  const canViewProducts = usePermission("products", "view");
  const canViewOrders = usePermission("orders", "view");
  const canViewCustomers = usePermission("customers", "view");
  const canViewCashflows = usePermission("cashflows", "view");

  const { isLoading } = usePermissionContext();

  if (isLoading) {
    return (
      <header className="bg-gray-200 h-14">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-8">
            <div className="font-bold text-lg">Hisweetie</div>
            <div className="flex gap-2">
              <div className="w-20 h-8 bg-gray-300 animate-pulse rounded"></div>
              <div className="w-20 h-8 bg-gray-300 animate-pulse rounded"></div>
              <div className="w-20 h-8 bg-gray-300 animate-pulse rounded"></div>
            </div>
          </div>
          <div className="w-32 h-8 bg-gray-300 animate-pulse rounded"></div>
        </div>
      </header>
    );
  }

  const handleLogout = () => {
    clearAuth();
    toast.success("Đã đăng xuất");
    router.push("/login");
  };

  const productSubmenu = [
    {
      title: "Hàng hóa",
      items: [
        {
          label: "Danh sách hàng hóa",
          href: "/san-pham/danh-sach",
          permission: "products.view",
        },
        {
          label: "Thiết lập giá",
          href: "/san-pham/thiet-lap-gia",
          permission: "price_books.view",
        },
      ],
    },
    {
      title: "Kho hàng",
      items: [
        {
          label: "Chuyển hàng",
          href: "/san-pham/chuyen-hang",
          permission: "inventory.view",
        },
        {
          label: "Sản xuất",
          href: "/san-pham/san-xuat",
          permission: "inventory.adjust",
        },
        {
          label: "Xuất hủy",
          href: "/san-pham/xuat-huy",
          permission: "inventory.adjust",
        },
      ],
    },
    {
      title: "Nhập hàng",
      items: [
        {
          label: "Nhà cung cấp",
          href: "/san-pham/nha-cung-cap",
          permission: "suppliers.view",
        },
        {
          label: "Đặt hàng nhập",
          href: "/san-pham/dat-hang-nhap",
          permission: "suppliers.view",
        },
        {
          label: "Nhập hàng",
          href: "/san-pham/nhap-hang",
          permission: "suppliers.view",
        },
      ],
    },
  ];

  const orderSubmenu = [
    {
      label: "Đặt hàng",
      href: "/don-hang/dat-hang",
      permission: "orders.view",
    },
    {
      label: "Hóa đơn",
      href: "/don-hang/hoa-don",
      permission: "invoices.view",
    },
    {
      label: "Trả hàng",
      href: "/don-hang/tra-hang",
      permission: "orders.view",
    },
    { label: "Báo đơn", href: "/don-hang/bao-don", permission: "orders.view" },
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
              className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
              Tổng quan
            </Link>

            {canViewProducts && (
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
                      {productSubmenu.map((section) => (
                        <div key={section.title} className="min-w-[150px]">
                          <h3 className="font-semibold text-md px-3 mb-3 text-gray-600">
                            {section.title}
                          </h3>
                          <ul className="space-y-2">
                            {section.items.map((item) => (
                              <PermissionGate
                                key={item.href}
                                resource={item.permission.split(".")[0]}
                                action={item.permission.split(".")[1]}>
                                <li>
                                  <Link
                                    href={item.href}
                                    className="block px-3 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
                                    {item.label}
                                  </Link>
                                </li>
                              </PermissionGate>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canViewOrders && (
              <div
                className="relative"
                onMouseEnter={() => setHoveredMenu("orders")}
                onMouseLeave={() => setHoveredMenu(null)}>
                <button className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
                  Đơn hàng
                </button>

                {hoveredMenu === "orders" && (
                  <div className="absolute top-full left-0 bg-white text-gray-800 shadow-2xl rounded-md min-w-max z-50 border">
                    <ul className="px-2 py-2">
                      {orderSubmenu.map((item) => (
                        <PermissionGate
                          key={item.href}
                          resource={item.permission.split(".")[0]}
                          action={item.permission.split(".")[1]}>
                          <li>
                            <Link
                              href={item.href}
                              className="block px-4 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
                              {item.label}
                            </Link>
                          </li>
                        </PermissionGate>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {canViewCustomers && (
              <Link
                href="/khach-hang"
                className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
                Khách hàng
              </Link>
            )}

            {canViewCashflows && (
              <Link
                href="/so-quy"
                className="px-4 py-4 hover:bg-gray-300 rounded transition-colors">
                Sổ quỹ
              </Link>
            )}
          </nav>
        </div>

        <div className="ml-auto px-4 flex items-center gap-4">
          <PermissionGate resource="orders" action="create">
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
                    <li>
                      <Link
                        href="/ban-hang?type=order"
                        className="block px-4 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
                        Tạo đơn hàng
                      </Link>
                    </li>
                    <PermissionGate resource="invoices" action="create">
                      <li>
                        <Link
                          href="/ban-hang?type=invoice"
                          className="block px-4 py-2 hover:bg-gray-100 rounded-md text-md transition-colors">
                          Tạo hóa đơn
                        </Link>
                      </li>
                    </PermissionGate>
                  </ul>
                </div>
              )}
            </div>
          </PermissionGate>

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
                  <PermissionGate resource="users" action="create">
                    <Link
                      href="/cai-dat"
                      className="px-4 py-2 text-sm hover:bg-gray-100">
                      Cài Đặt
                    </Link>
                  </PermissionGate>
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
