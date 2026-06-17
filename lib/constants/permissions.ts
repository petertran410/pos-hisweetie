export const RESOURCE_LABELS: Record<string, string> = {
  dashboard: "Tổng quan",
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
  vat_invoices: "Hóa đơn VAT",
  customers: "Khách hàng",
  customer_groups: "Nhóm khách hàng",
  suppliers: "Nhà cung cấp",
  order_suppliers: "Đơn đặt NCC",
  purchase_orders: "Nhập hàng",
  supplier_returns: "Trả hàng nhập",
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
  return_orders: "Trả hàng",
  debt_offsets: "Cấn trừ công nợ",
  stock_audits: "Kiểm kho",
  inventory_checks: "Kiểm hàng loại B",
  settings: "Cài đặt hệ thống",
  return_orders_price: "Giá nhập lại trả hàng",
  return_orders_total_prices: "Tổng tiền hàng trả hàng",
  pos_inventory: "Tồn kho (POS)",
  pos_price: "Đơn giá (POS)",
  pos_discount: "Giảm giá (POS)",
  pos_seller: "Người bán (POS)",
  pos_payment: "Thanh toán (POS)",
  view_cost_price: "Xem giá vốn",
  view_sale_price: "Xem giá bán",
  view_publication: "Xem thông tin công bố",
  view_profit: "Xem lợi nhuận",
  view_other_staff: "Xem của NV khác",
  view_balance: "Xem số dư",
  view_debt: "Xem công nợ",
  view_price: "Xem giá nhập",
  view_factory_price: "Xem giá nhà máy",
  view_stage_factory: "Xem giai đoạn & nhà máy",
  edit_stage_factory: "Sửa giai đoạn & nhà máy",
};

export const ACTION_LABELS: Record<string, string> = {
  view: "Xem",
  create: "Tạo mới",
  update: "Chỉnh sửa",
  delete: "Xóa",
  push: "Đẩy Misa",
  import: "Nhập dữ liệu",
  export: "Xuất dữ liệu",
  approve: "Duyệt",
  cancel: "Hủy",
  confirm_export: "Xác nhận xuất kho",
  confirm_refund: "Xác nhận hoàn tiền",
  print: "In",
  sales: "Báo cáo bán hàng",
  inventory: "Báo cáo tồn kho",
  financial: "Xem báo cáo tài chính",
  customer: "Báo cáo khách hàng",
  // ── Báo cáo chi tiết (mỗi loại = 1 quyền, khớp backend reports:*) ──
  eod_synthetic: "Cuối ngày - Tổng hợp",
  eod_document: "Cuối ngày - Bán hàng",
  eod_cashflow: "Cuối ngày - Thu chi",
  eod_product: "Cuối ngày - Hàng hóa",
  sale_time: "Bán hàng - Thời gian",
  sale_profit: "Bán hàng - Lợi nhuận",
  sale_soldby: "Bán hàng - Nhân viên",
  sale_branch: "Bán hàng - Chi nhánh",
  sale_refund: "Bán hàng - Trả hàng",
  product_sale: "Hàng hóa - Bán hàng",
  product_profit: "Hàng hóa - Lợi nhuận",
  product_category: "Hàng hóa - Theo nhóm hàng",
  product_inoutstock: "Hàng hóa - Xuất nhập tồn",
  product_inoutstock_detail: "Hàng hóa - Xuất nhập tồn chi tiết",
  product_byuser: "Hàng hóa - Nhân viên theo hàng bán",
  product_bycustomer: "Hàng hóa - Khách theo hàng bán",
  product_bysupplier: "Hàng hóa - NCC theo hàng nhập",
  product_damage: "Hàng hóa - Xuất hủy",
  customer_sale: "Khách hàng - Bán hàng",
  customer_product: "Khách hàng - Hàng bán theo khách",
  customer_debt: "Khách hàng - Công nợ",
  supplier_purchase: "Nhà cung cấp - Nhập hàng",
  supplier_byproduct: "Nhà cung cấp - Hàng nhập theo NCC",
  supplier_debt: "Nhà cung cấp - Công nợ",
  supplier_return: "Nhà cung cấp - Trả hàng nhập",
  supplier_info: "Nhà cung cấp - Tổng hợp NCC",
  assign_permissions: "Phân quyền",
  view_cost_price: "Xem giá vốn",
  view_sale_price: "Xem giá bán",
  view_publication: "Xem thông tin công bố",
  view_profit: "Xem lợi nhuận",
  view_other_staff: "Xem dữ liệu NV khác",
  view_balance: "Xem số dư",
  view_debt: "Xem công nợ",
  view_price: "Xem giá nhập",
  view_factory_price: "Xem giá nhà máy",
  view_stage_factory: "Xem giai đoạn & nhà máy",
  edit_stage_factory: "Sửa giai đoạn & nhà máy",
};

export const CATEGORY_ICONS: Record<string, string> = {
  "Sản phẩm": "📦",
  Kho: "🏭",
  "Bán hàng": "🛒",
  "Khách hàng": "👥",
  "Nhà cung cấp": "🏢",
  "Giao hàng": "🚚",
  "Tài chính": "💰",
  "Báo cáo": "📊",
  "Quản trị": "⚙️",
  "Cấu hình": "🔧",
};

export function getPermissionLabel(resource: string, action: string): string {
  // Báo cáo: action đã là nhãn đầy đủ (vd "Bán hàng - Lợi nhuận") nên trả
  // thẳng, không ghép thêm "Báo cáo" để tránh lặp chữ.
  if (resource === "reports") {
    return ACTION_LABELS[action] || action;
  }
  const resourceLabel = RESOURCE_LABELS[resource] || resource;
  const actionLabel = ACTION_LABELS[action] || action;
  return `${actionLabel} ${resourceLabel}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cây phân quyền BÁO CÁO 2 cấp (tham khảo KiotViet).
// Toàn bộ quyền báo cáo có resource = "reports". Để dựng cây 2 cấp
// (category "Báo cáo" → nhóm con → từng loại), ta coi mỗi nhóm con như một
// "pseudo-resource" (groupKey) suy ra từ tiền tố action.
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportSubgroup {
  key: string; // pseudo-resource key, vd "reports_eod"
  label: string; // nhãn nhóm con hiển thị
  actions: string[]; // các action thuộc nhóm (thứ tự hiển thị lá)
}

// Thứ tự nhóm + lá khớp cây KiotViet trong ảnh.
export const REPORT_SUBGROUPS: ReportSubgroup[] = [
  {
    key: "reports_eod",
    label: "Báo cáo cuối ngày",
    actions: [
      "eod_document",
      "eod_cashflow",
      "eod_product",
      "eod_synthetic",
      "export_eod",
    ],
  },
  {
    key: "reports_sale",
    label: "Báo cáo bán hàng",
    actions: [
      "sale_time",
      "sale_profit",
      "sale_refund",
      "sale_branch",
      "sale_soldby",
      "export_sale",
    ],
  },
  {
    key: "reports_product",
    label: "Báo cáo hàng hóa",
    actions: [
      "product_sale",
      "product_profit",
      "product_category",
      "product_inoutstock",
      "product_inoutstock_detail",
      "product_byuser",
      "product_bycustomer",
      "product_bysupplier",
      "product_damage",
      "export_product",
    ],
  },
  {
    key: "reports_customer",
    label: "Báo cáo khách hàng",
    actions: [
      "customer_sale",
      "customer_product",
      "customer_debt",
      "export_customer",
    ],
  },
  {
    key: "reports_supplier",
    label: "Báo cáo nhà cung cấp",
    actions: [
      "supplier_purchase",
      "supplier_byproduct",
      "supplier_debt",
      "supplier_return",
      "supplier_info",
      "export_supplier",
    ],
  },
  {
    key: "reports_financial",
    label: "Báo cáo tài chính",
    actions: ["financial", "export_financial"],
  },
];

// action → groupKey
export const REPORT_ACTION_TO_SUBGROUP: Record<string, string> =
  REPORT_SUBGROUPS.reduce(
    (acc, g) => {
      g.actions.forEach((a) => (acc[a] = g.key));
      return acc;
    },
    {} as Record<string, string>,
  );

// groupKey → label
export const REPORT_SUBGROUP_LABELS: Record<string, string> =
  REPORT_SUBGROUPS.reduce(
    (acc, g) => {
      acc[g.key] = g.label;
      return acc;
    },
    {} as Record<string, string>,
  );

// groupKey → thứ tự (để sắp xếp)
export const REPORT_SUBGROUP_ORDER: Record<string, number> =
  REPORT_SUBGROUPS.reduce(
    (acc, g, i) => {
      acc[g.key] = i;
      return acc;
    },
    {} as Record<string, number>,
  );

// Nhãn ngắn cho LÁ trong cây (chỉ tên loại báo cáo, không lặp tên nhóm).
export const REPORT_LEAF_LABELS: Record<string, string> = {
  eod_synthetic: "Tổng hợp",
  eod_document: "Bán hàng",
  eod_cashflow: "Thu chi",
  eod_product: "Hàng hóa",
  sale_time: "Thời gian",
  sale_profit: "Lợi nhuận",
  sale_soldby: "Nhân viên",
  sale_branch: "Chi nhánh",
  sale_refund: "Trả hàng",
  product_sale: "Bán hàng",
  product_profit: "Lợi nhuận",
  product_category: "Theo nhóm hàng",
  product_inoutstock: "Xuất nhập tồn",
  product_inoutstock_detail: "Xuất nhập tồn chi tiết",
  product_byuser: "Nhân viên theo hàng bán",
  product_bycustomer: "Khách theo hàng bán",
  product_bysupplier: "Nhà cung cấp theo hàng nhập",
  product_damage: "Xuất hủy",
  customer_sale: "Bán hàng",
  customer_product: "Hàng bán theo khách",
  customer_debt: "Công nợ",
  supplier_purchase: "Nhập hàng",
  supplier_byproduct: "Hàng nhập theo NCC",
  supplier_debt: "Công nợ",
  supplier_return: "Trả hàng nhập",
  supplier_info: "Tổng hợp NCC",
  financial: "Xem báo cáo tài chính",
  // Quyền xuất Excel theo nhóm.
  export_eod: "Xuất Excel",
  export_sale: "Xuất Excel",
  export_product: "Xuất Excel",
  export_customer: "Xuất Excel",
  export_supplier: "Xuất Excel",
  export_financial: "Xuất Excel",
};

// Quyền báo cáo CŨ (thô) cần ẩn khỏi UI cây (không xóa DB).
// reports:financial KHÔNG nằm đây vì là quyền mới của nhóm Tài chính.
export const LEGACY_REPORT_ACTIONS = ["sales", "inventory", "customer"];

/**
 * Quy resource thực của 1 permission về groupKey để dựng cây.
 * - reports + action mới → groupKey nhóm con (reports_eod, reports_sale...).
 * - các resource khác → giữ nguyên resource.
 * Trả null nếu là quyền cần ẩn (legacy reports).
 */
export function getPermGroupKey(resource: string, action: string): string | null {
  if (resource !== "reports") return resource;
  if (LEGACY_REPORT_ACTIONS.includes(action)) return null;
  return REPORT_ACTION_TO_SUBGROUP[action] || "reports";
}

/** Nhãn header nhóm con. Report subgroup → tiếng Việt; khác → giữ nguyên key. */
export function getPermGroupLabel(groupKey: string): string {
  return REPORT_SUBGROUP_LABELS[groupKey] || groupKey;
}

/** Nhãn lá trong cây. Report → nhãn ngắn; khác → giữ hành vi cũ. */
export function getPermLeafLabel(resource: string, action: string): string {
  if (resource === "reports") {
    return REPORT_LEAF_LABELS[action] || ACTION_LABELS[action] || action;
  }
  return ACTION_LABELS[action] || action;
}

/**
 * Sắp xếp các entry [groupKey, perms] cho hiển thị:
 * - resource non-report (vd dashboard) lên đầu, giữ thứ tự gốc.
 * - report subgroup theo REPORT_SUBGROUP_ORDER.
 */
export function orderReportEntries(
  entries: [string, any][],
): [string, any][] {
  return [...entries].sort((a, b) => {
    const ao = REPORT_SUBGROUP_ORDER[a[0]];
    const bo = REPORT_SUBGROUP_ORDER[b[0]];
    const aIsReport = ao !== undefined;
    const bIsReport = bo !== undefined;
    if (aIsReport && bIsReport) return ao - bo;
    if (aIsReport) return 1; // report subgroup xuống sau
    if (bIsReport) return -1;
    return 0; // giữ nguyên thứ tự với non-report
  });
}
