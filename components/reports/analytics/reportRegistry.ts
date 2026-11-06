// Danh sách báo cáo Phân tích (thay các report Power BI) và các trang con.
// Route: /bao-cao/phan-tich/<report.slug>[/<page.slug>] — page.slug "" là trang đầu.
// File này do phần khung quản lý: thêm / đổi trang ở đây, KHÔNG sửa trong từng báo cáo.

export interface AnalyticsPageDef {
  slug: string; // "" = trang gốc của báo cáo
  label: string; // tên trang như Power BI
}

export interface AnalyticsReportDef {
  slug: string;
  label: string;
  perm: string; // quyền xem cả báo cáo
  pages: AnalyticsPageDef[];
}

export const ANALYTICS_REPORTS: AnalyticsReportDef[] = [
  {
    slug: "kinh-doanh",
    label: "Kinh Doanh",
    perm: "reports:analytics_business",
    pages: [
      { slug: "", label: "Tổng Quan" },
      { slug: "bc-dinh-ki", label: "BC Định Kì" },
      { slug: "khach-hang", label: "Khách Hàng" },
      { slug: "san-pham", label: "Sản Phẩm" },
      { slug: "doi-thu", label: "Đối Thủ" },
    ],
  },
  {
    slug: "quan-tri",
    label: "Quản Trị",
    perm: "reports:analytics_management",
    pages: [
      { slug: "", label: "Tổng Quan" },
      { slug: "loi-nhuan", label: "Lợi Nhuận" },
      { slug: "khach-hang", label: "Khách Hàng" },
      { slug: "san-pham", label: "Sản Phẩm" },
    ],
  },
  {
    slug: "khach-hang",
    label: "Khách Hàng",
    perm: "reports:analytics_customer",
    pages: [
      { slug: "", label: "Tất Cả" },
      { slug: "vip", label: "VIP" },
      { slug: "key-persale", label: "Key Persale" },
      { slug: "khach-moi", label: "New Customer" },
      { slug: "khach-quay-lai", label: "Repeat Customer" },
      { slug: "khach-roi-bo", label: "Churn Customer" },
      { slug: "demand", label: "Demand" },
      { slug: "dlcl-lermao", label: "ĐLCL Lermao" },
      { slug: "dlcl-mut-lermao", label: "ĐLCL Mứt Lermao" },
      { slug: "dlcl-boduo", label: "ĐLCL Boduo" },
      { slug: "dlcl-phuong-hoang", label: "ĐLCL Phượng Hoàng" },
      { slug: "bien-thuong-mai", label: "Biên Thương Mại" },
      { slug: "chi-tiet", label: "Chi Tiết" },
      { slug: "xuat-data", label: "Xuất Data (> 12 tháng)" },
    ],
  },
  {
    slug: "dinh-ki",
    label: "Định Kì",
    perm: "reports:analytics_periodic",
    pages: [
      { slug: "", label: "Tổng Quan" },
      { slug: "doi-thu", label: "Đối Thủ" },
      { slug: "kpi-sale", label: "KPI Sale" },
      { slug: "tuan-nay", label: "Tuần Này" },
      { slug: "tuan-truoc", label: "Tuần Trước" },
      { slug: "thang", label: "Tháng" },
      { slug: "vung", label: "Vùng" },
      { slug: "chi-tiet", label: "Chi Tiết" },
    ],
  },
  {
    slug: "hang-tuan",
    label: "Hằng Tuần",
    perm: "reports:analytics_periodic",
    pages: [{ slug: "", label: "Kết Quả Hàng Tuần" }],
  },
  {
    slug: "kpi-sale",
    label: "KPI Sale",
    perm: "reports:analytics_kpi",
    pages: [
      { slug: "", label: "Sale Income" },
      { slug: "theo-ngay", label: "Theo Ngày" },
      { slug: "logic", label: "Logic" },
      { slug: "tpkd", label: "TPKD" },
      { slug: "len-don-ho", label: "Lên Đơn Hộ" },
    ],
  },
  {
    slug: "ke-toan",
    label: "Kế Toán",
    perm: "reports:analytics_accounting",
    pages: [
      { slug: "", label: "Mapping Misa" },
      { slug: "tien-mat-kho", label: "Tiền Mặt - Kho" },
      { slug: "doi-soat", label: "Đối Soát" },
      { slug: "chuyen-hang", label: "Chuyển Hàng" },
    ],
  },
  {
    slug: "chuyen-kho",
    label: "Chuyển Kho",
    perm: "reports:analytics_purchasing",
    pages: [
      { slug: "", label: "Chuyển Kho" },
      { slug: "hang-loai-b", label: "Hàng Loại B" },
    ],
  },
  {
    slug: "thu-mua",
    label: "Thu Mua",
    perm: "reports:analytics_purchasing",
    pages: [
      { slug: "", label: "Tồn Kho" },
      { slug: "nhom-hang", label: "Nhóm Hàng" },
      { slug: "nguon-hang", label: "Nguồn Hàng" },
      { slug: "dat-theo-don", label: "Đặt Theo Đơn" },
    ],
  },
];

export const ANALYTICS_CONFIG_PERM = "reports:analytics_config";

export function reportHref(report: string, page = ""): string {
  return `/bao-cao/phan-tich/${report}${page ? `/${page}` : ""}`;
}

export function findReport(slug: string): AnalyticsReportDef | undefined {
  return ANALYTICS_REPORTS.find((r) => r.slug === slug);
}
