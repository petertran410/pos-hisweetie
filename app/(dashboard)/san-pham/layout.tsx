"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: "Danh sách hàng hóa", href: "/san-pham/danh-sach" },
    { label: "Thiết lập giá", href: "/san-pham/thiet-lap-gia" },
    { label: "Chuyển hàng", href: "/san-pham/chuyen-hang" },
    { label: "Kiểm kho", href: "/san-pham/kiem-kho" },
    { label: "Xuất hủy", href: "/san-pham/xuat-huy" },
    { label: "Nhà cung cấp", href: "/san-pham/nha-cung-cap" },
    { label: "Đặt hàng nhập", href: "/san-pham/dat-hang-nhap" },
    { label: "Nhập hàng", href: "/san-pham/nhap-hang" },
    { label: "Trả hàng nhập", href: "/san-pham/tra-hang-nhap" },
  ];

  const currentMenu = menuItems.find((item) => pathname.startsWith(item.href));

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-white">
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-4 py-3 flex items-center gap-2 hover:bg-gray-50 w-full text-left">
            <span className="font-medium">
              {currentMenu?.label || "Sản phẩm"}
            </span>
            <svg
              className={`w-4 h-4 transition-transform ${
                isMenuOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute top-full left-0 w-64 bg-white border rounded-md shadow-lg z-50">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-2 hover:bg-gray-50 ${
                    pathname.startsWith(item.href)
                      ? "bg-blue-50 text-blue-600"
                      : ""
                  }`}>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
