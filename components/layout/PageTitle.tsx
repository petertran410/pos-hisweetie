"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SUFFIX = "Hisweetie";

/**
 * Bản đồ tiền tố route -> tiêu đề tab.
 * Sắp xếp từ cụ thể (dài) đến tổng quát (ngắn) để khớp prefix chính xác.
 */
const TITLE_MAP: Array<{ prefix: string; title: string }> = [
  // Bán hàng
  { prefix: "/ban-hang", title: "Bán hàng" },

  // Đơn hàng
  { prefix: "/don-hang/dat-hang", title: "Đặt hàng" },
  { prefix: "/don-hang/hoa-don-vat", title: "Hóa đơn VAT" },
  { prefix: "/don-hang/hoa-don", title: "Hóa đơn" },
  { prefix: "/don-hang/tra-hang", title: "Trả hàng" },
  { prefix: "/don-hang/can-tru-cong-no", title: "Cấn trừ công nợ" },
  { prefix: "/don-hang/bao-don", title: "Báo đơn" },

  // Sản phẩm
  { prefix: "/san-pham/danh-sach", title: "Danh sách hàng hóa" },
  { prefix: "/san-pham/thiet-lap-gia", title: "Thiết lập giá" },
  { prefix: "/san-pham/kiem-kho", title: "Kiểm kho" },
  { prefix: "/san-pham/kiem-hang-loai-b", title: "Kiểm hàng loại B" },
  { prefix: "/san-pham/chuyen-hang", title: "Chuyển hàng" },
  { prefix: "/san-pham/san-xuat", title: "Sản xuất" },
  { prefix: "/san-pham/xuat-huy", title: "Xuất hủy" },
  { prefix: "/san-pham/nha-cung-cap", title: "Nhà cung cấp" },
  { prefix: "/san-pham/dat-hang-nhap", title: "Đặt hàng nhập" },
  { prefix: "/san-pham/nhap-hang", title: "Nhập hàng" },
  { prefix: "/san-pham/tra-hang-nhap", title: "Trả hàng nhập" },

  // Khách hàng
  { prefix: "/khach-hang/khuyen-mai", title: "Khuyến mãi" },
  { prefix: "/khach-hang", title: "Khách hàng" },

  // Tài chính
  { prefix: "/tai-chinh/so-quy", title: "Sổ quỹ" },
  { prefix: "/tai-chinh/bien-dong-so-du", title: "Biến động số dư" },
  // Sổ quỹ (route cũ — redirect sang /tai-chinh/so-quy)
  { prefix: "/so-quy", title: "Sổ quỹ" },

  // Báo cáo
  { prefix: "/bao-cao", title: "Báo cáo" },

  // Cài đặt
  { prefix: "/cai-dat/chi-nhanh", title: "Chi nhánh" },
  { prefix: "/cai-dat/dong-bo", title: "Đồng bộ" },
  { prefix: "/cai-dat/in-an", title: "In ấn" },
  { prefix: "/cai-dat/lich-su", title: "Lịch sử" },
  { prefix: "/cai-dat/nguoi-dung", title: "Người dùng" },
  { prefix: "/cai-dat/so-quy", title: "Sổ quỹ" },
  { prefix: "/cai-dat/tk-ngan-hang-sale", title: "TK ngân hàng sale" },
  { prefix: "/cai-dat/vai-tro", title: "Vai trò" },
  { prefix: "/cai-dat", title: "Cài đặt" },

  // Báo đơn (ngoài dashboard)
  { prefix: "/bao-don/dong-hang", title: "Đóng hàng" },
  { prefix: "/bao-don/giao-hang", title: "Giao hàng" },
  { prefix: "/bao-don/loading", title: "Loading" },
  { prefix: "/bao-don", title: "Báo đơn" },

  // Đăng nhập
  { prefix: "/login", title: "Đăng nhập" },
];

function resolveTitle(pathname: string): string {
  const match = TITLE_MAP.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)
  );
  if (match) return `${match.title} | ${SUFFIX}`;
  if (pathname === "/") return `Tổng quan | ${SUFFIX}`;
  return SUFFIX;
}

/**
 * Cập nhật document.title theo route hiện tại.
 * Vì các page là client component nên không export được `metadata`.
 */
export function PageTitle() {
  const pathname = usePathname();
  // Giữ tiêu đề mong muốn trong ref để observer (gắn 1 lần) luôn đọc
  // được giá trị mới nhất khi route đổi.
  const desiredRef = useRef("");

  // Cập nhật tiêu đề mong muốn + set ngay khi đổi route.
  useEffect(() => {
    desiredRef.current = resolveTitle(pathname);
    if (document.title !== desiredRef.current) {
      document.title = desiredRef.current;
    }
  }, [pathname]);

  // Theo dõi toàn bộ <head>: Next.js metadata có thể đổi text HOẶC thay
  // nguyên thẻ <title> khi soft-navigate (kể cả click lại link cùng route),
  // làm reset về `default`. Observe subtree của <head> để bắt mọi trường hợp
  // rồi khôi phục lại tiêu đề đúng. Observer chỉ gắn 1 lần.
  useEffect(() => {
    const head = document.head;
    if (!head) return;

    const restore = () => {
      if (desiredRef.current && document.title !== desiredRef.current) {
        document.title = desiredRef.current;
      }
    };

    const observer = new MutationObserver(restore);
    observer.observe(head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
