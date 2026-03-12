export const RESOURCE_LABELS: Record<string, string> = {
  products: "Sản phẩm",
  categories: "Danh mục",
  trademarks: "Thương hiệu",
  price_books: "Bảng giá",
  inventory: "Tồn kho",
  transfers: "Chuyển kho",
  productions: "Sản xuất",
  destructions: "Hủy hàng",
  orders: "Đơn hàng",
  invoices: "Hóa đơn",
  customers: "Khách hàng",
  customer_groups: "Nhóm khách hàng",
  suppliers: "Nhà cung cấp",
  order_suppliers: "Đơn đặt NCC",
  purchase_orders: "Nhập hàng",
  packing_slips: "Giao hàng",
  packing_hangs: "Đóng hàng",
  packing_loadings: "Loading",
  cash_flows: "Sổ quỹ",
  reports: "Báo cáo",
  users: "Người dùng",
  roles: "Vai trò",
  branches: "Chi nhánh",
  audit_logs: "Lịch sử",
  print_templates: "Mẫu in",
  bank_accounts: "Tài khoản ngân hàng",
};

export const ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  create: "Tạo mới",
  update: "Chỉnh sửa",
  delete: "Xóa",
  import: "Nhập dữ liệu",
  export: "Xuất dữ liệu",
  approve: "Duyệt",
  cancel: "Hủy",
  print: "In",
  sales: "Báo cáo bán hàng",
  inventory: "Báo cáo tồn kho",
  financial: "Báo cáo tài chính",
  customer: "Báo cáo khách hàng",
  assign_permissions: "Phân quyền",
};

export const CATEGORY_ICONS: Record<string, string> = {
  "Sản phẩm": "📦",
  Kho: "🏭",
  "Bán hàng": "🛒",
  "Khách hàng": "👥",
  "Nhà cung cấp": "🏢",
  "Báo đơn": "🚚",
  "Tài chính": "💰",
  "Báo cáo": "📊",
  "Quản trị": "⚙️",
  "Cấu hình": "🔧",
};

export function getPermissionLabel(resource: string, action: string): string {
  const resourceLabel = RESOURCE_LABELS[resource] || resource;
  const actionLabel = ACTION_LABELS[action] || action;
  return `${actionLabel} ${resourceLabel}`;
}
