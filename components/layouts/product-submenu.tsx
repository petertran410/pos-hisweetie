// components/layouts/product-submenu.tsx
"use client";

import { ChevronDown, Link } from "lucide-react";
import { usePathname } from "next/navigation";

const PRODUCT_MENU = [
  { href: "/san-pham/danh-sach", label: "Danh sách hàng hóa" },
  { href: "/san-pham/thiet-lap-gia", label: "Thiết lập giá" },
  { href: "/san-pham/chuyen-hang", label: "Chuyển hàng" },
  { href: "/san-pham/kiem-kho", label: "Kiểm kho" },
  { href: "/san-pham/xuat-huy", label: "Xuất hủy" },
  { href: "/san-pham/nha-cung-cap", label: "Nhà cung cấp" },
  { href: "/san-pham/dat-hang-nhap", label: "Đặt hàng nhập" },
  { href: "/san-pham/nhap-hang", label: "Nhập hàng" },
  { href: "/san-pham/tra-hang-nhap", label: "Trả hàng nhập" },
];

export function ProductSubmenu() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2">
        Sản phẩm <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {PRODUCT_MENU.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              className={pathname === item.href ? "bg-accent" : ""}>
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
