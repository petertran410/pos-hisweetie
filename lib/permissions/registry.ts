export interface PermissionDef {
  resource: string;
  action: string;
}

export interface RoutePermission {
  path: string;
  permission: PermissionDef;
  label: string;
  icon?: string;
}

export interface NavSection {
  key: string;
  label: string;
  permission?: PermissionDef;
  items: NavItem[];
}

export interface NavItem {
  key: string;
  label: string;
  href: string;
  permission: PermissionDef;
}

export const ROUTE_PERMISSIONS: Record<
  string,
  PermissionDef | PermissionDef[]
> = {
  "/san-pham/danh-sach": { resource: "products", action: "view" },
  "/san-pham/thiet-lap-gia": { resource: "price_books", action: "view" },
  "/san-pham/chuyen-hang": { resource: "transfers", action: "view" },
  "/san-pham/kiem-hang-loai-b": {
    resource: "inventory_checks",
    action: "view",
  },
  "/san-pham/san-xuat": { resource: "productions", action: "view" },
  "/san-pham/xuat-huy": { resource: "destructions", action: "view" },
  "/san-pham/xuat-dung-noi-bo": { resource: "internal-use", action: "view" },
  "/san-pham/nha-cung-cap": { resource: "suppliers", action: "view" },
  "/san-pham/dat-hang-nhap": { resource: "order_suppliers", action: "view" },
  "/san-pham/dat-hang-nhap-chi-tiet": {
    resource: "order_suppliers",
    action: "view",
  },
  "/san-pham/nhap-hang": { resource: "purchase_orders", action: "view" },
  "/san-pham/ghep-xe": { resource: "vehicle_shipments", action: "view" },
  "/san-pham/tra-hang-nhap": { resource: "supplier_returns", action: "view" },
  "/don-hang/dat-hang": { resource: "orders", action: "view" },
  "/don-hang/hoa-don": { resource: "invoices", action: "view" },
  "/don-hang/hoa-don-vat": { resource: "vat_invoices", action: "view" },
  "/don-hang/tra-hang": { resource: "invoices", action: "view" },
  "/don-hang/can-tru-cong-no": { resource: "return_orders", action: "view" },
  "/don-hang/bao-don": { resource: "packing_slips", action: "view" },
  "/khach-hang/khuyen-mai": { resource: "promotions", action: "view" },
  "/khach-hang": { resource: "customers", action: "view" },
  "/so-quy": { resource: "cash_flows", action: "view" },
  "/tai-chinh/so-quy": { resource: "cash_flows", action: "view" },
  "/tai-chinh/bien-dong-so-du": { resource: "sepay", action: "view" },
  "/ban-hang": [
    { resource: "orders", action: "create" },
    { resource: "invoices", action: "create" },
  ],
  "/cai-dat/nguoi-dung": { resource: "users", action: "view" },
  "/cai-dat/vai-tro": { resource: "roles", action: "view" },
  "/cai-dat/chi-nhanh": { resource: "branches", action: "view" },
  "/cai-dat/so-quy": { resource: "bank_accounts", action: "view" },
  "/cai-dat/lich-su": { resource: "audit_logs", action: "view" },
  "/san-pham/kiem-kho": { resource: "stock_audits", action: "view" },
  "/cai-dat/in-an": { resource: "print_templates", action: "view" },
};

export const NAV_CONFIG: NavSection[] = [
  {
    key: "overview",
    label: "Tổng quan",
    items: [],
  },
  {
    key: "products",
    label: "Hàng hóa",
    items: [
      {
        key: "product-list",
        label: "Danh sách hàng hóa",
        href: "/san-pham/danh-sach",
        permission: { resource: "products", action: "view" },
      },
      {
        key: "price-setup",
        label: "Thiết lập giá",
        href: "/san-pham/thiet-lap-gia",
        permission: { resource: "price_books", action: "view" },
      },
      {
        key: "transfers",
        label: "Chuyển hàng",
        href: "/san-pham/chuyen-hang",
        permission: { resource: "transfers", action: "view" },
      },
      {
        key: "productions",
        label: "Sản xuất",
        href: "/san-pham/san-xuat",
        permission: { resource: "productions", action: "view" },
      },
      {
        key: "destructions",
        label: "Xuất hủy",
        href: "/san-pham/xuat-huy",
        permission: { resource: "destructions", action: "view" },
      },
      {
        key: "internal-use",
        label: "Xuất dùng nội bộ",
        href: "/san-pham/xuat-dung-noi-bo",
        permission: { resource: "internal-use", action: "view" },
      },
      {
        key: "suppliers",
        label: "Nhà cung cấp",
        href: "/san-pham/nha-cung-cap",
        permission: { resource: "suppliers", action: "view" },
      },
      {
        key: "order-suppliers",
        label: "Đặt hàng nhập",
        href: "/san-pham/dat-hang-nhap",
        permission: { resource: "order_suppliers", action: "view" },
      },
      {
        key: "order-suppliers-detail",
        label: "Đặt hàng nhập chi tiết",
        href: "/san-pham/dat-hang-nhap-chi-tiet",
        permission: { resource: "order_suppliers", action: "view" },
      },
      {
        key: "purchase-orders",
        label: "Nhập hàng",
        href: "/san-pham/nhap-hang",
        permission: { resource: "purchase_orders", action: "view" },
      },
      {
        key: "vehicle-shipments",
        label: "Ghép xe",
        href: "/san-pham/ghep-xe",
        permission: { resource: "vehicle_shipments", action: "view" },
      },
      {
        key: "supplier-returns",
        label: "Trả hàng nhập",
        href: "/san-pham/tra-hang-nhap",
        permission: { resource: "supplier_returns", action: "view" },
      },
    ],
  },
  {
    key: "orders",
    label: "Đơn hàng",
    items: [
      {
        key: "dat-hang",
        label: "Đặt hàng",
        href: "/don-hang/dat-hang",
        permission: { resource: "orders", action: "view" },
      },
      {
        key: "hoa-don",
        label: "Hóa đơn",
        href: "/don-hang/hoa-don",
        permission: { resource: "invoices", action: "view" },
      },
      {
        key: "hoa-don-vat",
        label: "Hóa đơn VAT",
        href: "/don-hang/hoa-don-vat",
        permission: { resource: "vat_invoices", action: "view" },
      },
      {
        key: "tra-hang",
        label: "Trả hàng",
        href: "/don-hang/tra-hang",
        permission: { resource: "invoices", action: "view" },
      },
      {
        key: "can-tru-cong-no",
        label: "Cấn trừ công nợ",
        href: "/don-hang/can-tru-cong-no",
        permission: { resource: "return_orders", action: "view" },
      },
      {
        key: "bao-don",
        label: "Báo đơn",
        href: "/don-hang/bao-don",
        permission: { resource: "packing_slips", action: "view" },
      },
    ],
  },
  {
    key: "customers",
    label: "Khách hàng",
    items: [
      {
        key: "customer-list",
        label: "Khách hàng",
        href: "/khach-hang",
        permission: { resource: "customers", action: "view" },
      },
      {
        key: "promotions",
        label: "Khuyến mãi",
        href: "/khach-hang/khuyen-mai",
        permission: { resource: "promotions", action: "view" },
      },
    ],
  },
  {
    key: "cashflows",
    label: "Tài chính",
    items: [
      {
        key: "cashflow-list",
        label: "Sổ quỹ",
        href: "/tai-chinh/so-quy",
        permission: { resource: "cash_flows", action: "view" },
      },
      {
        key: "sepay-transactions",
        label: "Biến động số dư",
        href: "/tai-chinh/bien-dong-so-du",
        permission: { resource: "sepay", action: "view" },
      },
    ],
  },
];

export const POS_ACTIONS: NavItem[] = [
  {
    key: "create-order",
    label: "Tạo đơn hàng",
    href: "/ban-hang?type=order",
    permission: { resource: "orders", action: "create" },
  },
  {
    key: "create-invoice",
    label: "Tạo hóa đơn",
    href: "/ban-hang?type=invoice",
    permission: { resource: "invoices", action: "create" },
  },
];

export function getRoutePermission(
  path: string
): PermissionDef | PermissionDef[] | null {
  if (ROUTE_PERMISSIONS[path]) return ROUTE_PERMISSIONS[path];
  const match = Object.entries(ROUTE_PERMISSIONS).find(([route]) =>
    path.startsWith(route)
  );
  return match ? match[1] : null;
}
