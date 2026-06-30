"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/lib/store/auth";

const SUPER_ADMIN_ROLE = "Super Admin";

// Nhóm báo cáo cấp 1 (khớp slug route /bao-cao/<key>).
export type ReportGroupKey =
  | "ban-hang"
  | "khach-hang"
  | "hang-hoa"
  | "nha-cung-cap"
  | "tai-chinh"
  | "cuoi-ngay";

// Map (group, viewTypeValue) → key quyền backend (reports:xxx).
// Phải khớp VIEWTYPE_KEY_MAP trong reports-permission.guard.ts.
export const REPORT_VIEWTYPE_PERMISSION: Record<
  string,
  Record<string, string>
> = {
  "ban-hang": {
    PurchaseDate: "reports:sale_time",
    Profit: "reports:sale_profit",
    SoldBy: "reports:sale_soldby",
    Branch: "reports:sale_branch",
    Refund: "reports:sale_refund",
  },
  "hang-hoa": {
    ProductBySale: "reports:product_sale",
    ProductByProfit: "reports:product_profit",
    ProductByCategory: "reports:product_category",
    InOutStock: "reports:product_inoutstock",
    InOutStockDetail: "reports:product_inoutstock_detail",
    ProductByUser: "reports:product_byuser",
    ProductByCustomer: "reports:product_bycustomer",
    ProductBySupplier: "reports:product_bysupplier",
    DamageItem: "reports:product_damage",
  },
  "nha-cung-cap": {
    PurchaseBySupplier: "reports:supplier_purchase",
    PurchaseByProduct: "reports:supplier_byproduct",
    SupplierDebt: "reports:supplier_debt",
    SupplierReturn: "reports:supplier_return",
    SupplierInfo: "reports:supplier_info",
  },
  "khach-hang": {
    CustomerBySale: "reports:customer_sale",
    CustomerByProfit: "reports:customer_profit",
    CustomerDebt: "reports:customer_debt",
    CustomerByProduct: "reports:customer_product",
  },
  "cuoi-ngay": {
    Synthetic: "reports:eod_synthetic",
    Document: "reports:eod_document",
    CashFlow: "reports:eod_cashflow",
    Product: "reports:eod_product",
  },
  // Tài chính gộp 1 quyền cho cả nhóm.
  "tai-chinh": {
    _all: "reports:financial",
  },
};

// Tất cả key quyền của mỗi nhóm (để biết user có được vào nhóm không).
export const REPORT_GROUP_PERMISSIONS: Record<ReportGroupKey, string[]> =
  Object.entries(REPORT_VIEWTYPE_PERMISSION).reduce(
    (acc, [group, map]) => {
      acc[group as ReportGroupKey] = Array.from(new Set(Object.values(map)));
      return acc;
    },
    {} as Record<ReportGroupKey, string[]>,
  );

// Map nhóm cấp 1 (slug route) → key quyền xuất Excel của nhóm. Phải khớp
// seed add-report-export-permissions.ts.
export const REPORT_GROUP_EXPORT_KEY: Record<ReportGroupKey, string> = {
  "ban-hang": "reports:export_sale",
  "hang-hoa": "reports:export_product",
  "nha-cung-cap": "reports:export_supplier",
  "khach-hang": "reports:export_customer",
  "cuoi-ngay": "reports:export_eod",
  "tai-chinh": "reports:export_financial",
};

export interface ReportAccess {
  superAdmin: boolean;
  // Có quyền với 1 key cụ thể (reports:xxx).
  has: (key: string) => boolean;
  // Có ít nhất 1 quyền trong nhóm cấp 1.
  groupAllowed: (group: ReportGroupKey) => boolean;
  // Có quyền xuất Excel của nhóm cấp 1.
  canExport: (group: ReportGroupKey) => boolean;
  // Có ít nhất 1 quyền báo cáo bất kỳ (để hiện link "Báo cáo").
  anyReport: boolean;
}

export function useReportAccess(): ReportAccess {
  const { user } = useAuthStore();

  return useMemo(() => {
    const superAdmin = user?.roles?.includes(SUPER_ADMIN_ROLE) ?? false;
    const perms = new Set(user?.permissions ?? []);

    const has = (key: string) => superAdmin || perms.has(key);

    const groupAllowed = (group: ReportGroupKey) => {
      if (superAdmin) return true;
      const keys = REPORT_GROUP_PERMISSIONS[group] || [];
      return keys.some((k) => perms.has(k));
    };

    const canExport = (group: ReportGroupKey) =>
      has(REPORT_GROUP_EXPORT_KEY[group]);

    const anyReport =
      superAdmin ||
      (Object.keys(REPORT_GROUP_PERMISSIONS) as ReportGroupKey[]).some(
        (g) => groupAllowed(g),
      );

    return { superAdmin, has, groupAllowed, canExport, anyReport };
  }, [user]);
}
