"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

/**
 * Các loại đối tượng có mã (code) và trang danh sách tương ứng.
 * Mọi trang đích đều đọc query param `Code` (viết hoa) để lọc theo mã.
 */
export type CodeEntity =
  | "invoice"
  | "order"
  | "return-order"
  | "customer"
  | "product"
  | "purchase-order"
  | "order-supplier"
  | "supplier"
  | "cashflow"
  | "supplier-return"
  | "transfer"
  | "stock-audit"
  | "inventory-check"
  | "destruction"
  | "production"
  | "packing-slip"
  | "debt-offset";

const ROUTES: Record<CodeEntity, string> = {
  invoice: "/don-hang/hoa-don",
  order: "/don-hang/dat-hang",
  "return-order": "/don-hang/tra-hang",
  customer: "/khach-hang",
  product: "/san-pham/danh-sach",
  "purchase-order": "/san-pham/nhap-hang",
  "order-supplier": "/san-pham/dat-hang-nhap",
  supplier: "/san-pham/nha-cung-cap",
  cashflow: "/tai-chinh/so-quy",
  "supplier-return": "/san-pham/tra-hang-nhap",
  transfer: "/san-pham/chuyen-hang",
  "stock-audit": "/san-pham/kiem-kho",
  "inventory-check": "/san-pham/kiem-hang-loai-b",
  destruction: "/san-pham/xuat-huy",
  production: "/san-pham/san-xuat",
  "packing-slip": "/don-hang/bao-don",
  "debt-offset": "/don-hang/can-tru-cong-no",
};

/**
 * Tạo href tới trang danh sách của đối tượng, đã lọc sẵn theo mã.
 * Dùng được ở những nơi không tiện render <CodeLink> trực tiếp.
 */
export function buildCodeHref(entity: CodeEntity, code: string): string {
  return `${ROUTES[entity]}?Code=${encodeURIComponent(code)}`;
}

interface CodeLinkProps {
  /** Loại đối tượng quyết định trang đích. */
  entity: CodeEntity;
  /** Mã hiển thị và dùng để lọc. */
  code?: string | null;
  /** Nội dung hiển thị thay cho mã (mặc định = code). */
  label?: React.ReactNode;
  /** className tuỳ biến, ghi đè class link mặc định. */
  className?: string;
  /** Hiện icon mở tab ngoài bên cạnh mã. */
  withIcon?: boolean;
  /** Hiển thị khi không có mã (mặc định "-"). */
  fallback?: React.ReactNode;
  /** Mở cùng tab thay vì tab mới. */
  sameTab?: boolean;
}

/**
 * Link điều hướng cho một mã đối tượng (mã hoá đơn, mã đơn hàng, mã KH...).
 * Mặc định mở tab mới và chặn nổi bọt click (tránh trigger expand/select row).
 */
export function CodeLink({
  entity,
  code,
  label,
  className,
  withIcon = false,
  fallback = "-",
  sameTab = false,
}: CodeLinkProps) {
  const value = code?.toString().trim();
  if (!value) return <>{fallback}</>;

  const targetProps = sameTab
    ? {}
    : { target: "_blank" as const, rel: "noopener noreferrer" };

  return (
    <Link
      href={buildCodeHref(entity, value)}
      {...targetProps}
      onClick={(e) => e.stopPropagation()}
      className={
        className ??
        "text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
      }>
      {label ?? value}
      {withIcon && <ExternalLink className="w-3.5 h-3.5" />}
    </Link>
  );
}

export default CodeLink;
