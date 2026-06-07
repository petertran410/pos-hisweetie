"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";

interface AuditLogsTableProps {
  logs: any[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const categoryNames: Record<string, string> = {
  order: "Đơn hàng",
  invoice: "Hóa đơn",
  return_order: "Phiếu trả hàng",
  payment: "Thanh toán",
  product: "Sản phẩm",
  customer: "Khách hàng",
  supplier: "Nhà cung cấp",
  inventory: "Tồn kho",
  transfer: "Chuyển kho",
  purchase_order: "Nhập hàng",
  order_supplier: "Đặt hàng NCC",
  production: "Sản xuất",
  destruction: "Xuất hủy",
  packing: "Đóng hàng",
  user: "Người dùng",
  branch: "Chi nhánh",
  setting: "Cài đặt",
  auth: "Đăng nhập",
  other: "Khác",
};

const severityConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  info: {
    label: "Thông tin",
    color: "bg-blue-100 text-blue-700",
    icon: Info,
  },
  warning: {
    label: "Cảnh báo",
    color: "bg-yellow-100 text-yellow-700",
    icon: AlertTriangle,
  },
  critical: {
    label: "Quan trọng",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
};

const fmt = (val: any): string => {
  if (val === null || val === undefined) return "(trống)";
  if (typeof val === "boolean") return val ? "Có" : "Không";
  if (typeof val === "number") {
    return new Intl.NumberFormat("en-US").format(val);
  }
  return String(val);
};

const fmtCurrency = (val: any): string => {
  if (val === null || val === undefined || val === 0) return "0đ";
  return new Intl.NumberFormat("en-US").format(Number(val)) + "đ";
};

function renderSnapshot(entityType: string, snapshot: any): string {
  if (!snapshot) return "";
  const lines: string[] = [];

  if (entityType === "orders" || entityType === "invoices") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    if (snapshot.order?.code) lines.push(`Đơn hàng: ${snapshot.order.code}`);
    lines.push(`Trạng thái: ${snapshot.statusValue || "N/A"}`);
    lines.push(`Khách hàng: ${snapshot.customer?.name || "N/A"}`);
    lines.push(`Bảng giá: ${snapshot.priceBookName || "Bảng giá chung"}`);
    lines.push(
      `Tổng tiền hàng (Chưa trừ giảm giá): ${fmtCurrency(snapshot.totalAmount)}`
    );
    lines.push(`Giảm giá trên đơn hàng: ${fmtCurrency(snapshot.discount)}`);
    lines.push(
      `Tổng tiền hàng (Sau giảm giá): ${fmtCurrency(snapshot.grandTotal)}`
    );
    lines.push(`Đã thanh toán: ${fmtCurrency(snapshot.paidAmount)}`);
    lines.push(`Công nợ: ${fmtCurrency(snapshot.debtAmount)}`);
    lines.push(`Chi nhánh: ${snapshot.branch?.name || "N/A"}`);
    if (entityType === "orders")
      lines.push(`Người bán: ${snapshot.soldBy?.name || "N/A"}`);

    lines.push(`Ghi chú: ${snapshot.description || "(trống)"}`);

    if (snapshot.items?.length > 0) {
      lines.push("");
      lines.push("Sản phẩm:");
      snapshot.items.forEach((item: any) => {
        const priceAfterDiscount = item.price - item.discount;
        const discount = item.discount
          ? ` (Giảm Giá Trên Đơn Giá: ${fmtCurrency(item.discount)})`
          : "";
        lines.push(
          `  - ${item.productCode || item.productName}: ${fmt(item.quantity)} × ${fmtCurrency(priceAfterDiscount)}${discount}`
        );
      });
    }

    if (snapshot.delivery) {
      lines.push("");
      lines.push("Giao hàng:");
      lines.push(`  - Người nhận: ${snapshot.delivery.receiver || "N/A"}`);
      lines.push(`  - SĐT: ${snapshot.delivery.contactNumber || "N/A"}`);
      lines.push(`  - Địa chỉ: ${snapshot.delivery.address || "N/A"}`);
      if (snapshot.delivery.wardName)
        lines.push(`  - Phường/Xã: ${snapshot.delivery.wardName}`);
      if (snapshot.delivery.weight)
        lines.push(`  - Trọng lượng: ${fmt(snapshot.delivery.weight)}`);
      if (snapshot.delivery.price)
        lines.push(
          `  - Phí giao hàng: ${fmtCurrency(snapshot.delivery.price)}`
        );
      if (snapshot.delivery.statusValue)
        lines.push(`  - Trạng thái giao: ${snapshot.delivery.statusValue}`);
      if (snapshot.delivery.noteForDriver)
        lines.push(
          `  - Ghi chú cho giao hàng: ${snapshot.delivery.noteForDriver}`
        );
    }

    return lines.join("\n");
  }

  if (entityType === "products") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Tên: ${snapshot.name || "N/A"}`);
    if (snapshot.fullName) lines.push(`Tên đầy đủ: ${snapshot.fullName}`);
    lines.push(`Giá bán: ${fmtCurrency(snapshot.basePrice)}`);
    if (snapshot.weight)
      lines.push(
        `Trọng lượng: ${fmt(snapshot.weight)} ${snapshot.weightUnit || ""}`
      );
    if (snapshot.unit) lines.push(`Đơn vị: ${snapshot.unit}`);
    lines.push(`Hoạt động: ${snapshot.isActive ? "Có" : "Không"}`);
    lines.push(`Cho phép bán: ${snapshot.allowsSale ? "Có" : "Không"}`);
    if (snapshot.variant) lines.push(`Loại: ${snapshot.variant.name}`);
    if (snapshot.tradeMark)
      lines.push(`Thương hiệu: ${snapshot.tradeMark.name}`);
    if (snapshot.description) lines.push(`Mô tả: ${snapshot.description}`);
    return lines.join("\n");
  }

  if (entityType === "customers") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Tên: ${snapshot.name || "N/A"}`);
    lines.push(`SĐT: ${snapshot.contactNumber || "N/A"}`);
    if (snapshot.email) lines.push(`Email: ${snapshot.email}`);
    if (snapshot.address) lines.push(`Địa chỉ: ${snapshot.address}`);
    if (snapshot.wardName) lines.push(`Phường/Xã: ${snapshot.wardName}`);
    if (snapshot.taxCode) lines.push(`MST: ${snapshot.taxCode}`);
    if (snapshot.groups) lines.push(`Nhóm: ${snapshot.groups}`);
    lines.push(`Tổng mua: ${fmtCurrency(snapshot.totalPurchased)}`);
    lines.push(`Công nợ: ${fmtCurrency(snapshot.totalDebt)}`);
    if (snapshot.customerType)
      lines.push(`Loại KH: ${snapshot.customerType.name}`);
    return lines.join("\n");
  }

  if (entityType === "suppliers") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Tên: ${snapshot.name || "N/A"}`);
    lines.push(`SĐT: ${snapshot.contactNumber || "N/A"}`);
    if (snapshot.email) lines.push(`Email: ${snapshot.email}`);
    if (snapshot.address) lines.push(`Địa chỉ: ${snapshot.address}`);
    if (snapshot.taxCode) lines.push(`MST: ${snapshot.taxCode}`);
    if (snapshot.groups) lines.push(`Nhóm: ${snapshot.groups}`);
    lines.push(`Công nợ: ${fmtCurrency(snapshot.debt)}`);
    return lines.join("\n");
  }

  if (entityType === "transfers") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Kho nguồn: ${snapshot.fromBranchName || "N/A"}`);
    lines.push(`Kho đích: ${snapshot.toBranchName || "N/A"}`);
    lines.push(`Tổng chuyển: ${fmtCurrency(snapshot.totalTransfer)}`);
    lines.push(`Tổng nhận: ${fmtCurrency(snapshot.totalReceive)}`);
    if (snapshot.noteBySource)
      lines.push(`Ghi chú nguồn: ${snapshot.noteBySource}`);
    if (snapshot.noteByDestination)
      lines.push(`Ghi chú đích: ${snapshot.noteByDestination}`);
    lines.push(`Người tạo: ${snapshot.createdByName || "N/A"}`);

    if (snapshot.details?.length > 0) {
      lines.push("");
      lines.push("Sản phẩm:");
      snapshot.details.forEach((d: any) => {
        lines.push(
          `  - ${d.productCode || d.productName}: gửi ${fmt(d.sendQuantity)}, nhận ${fmt(d.receivedQuantity)}`
        );
      });
    }
    return lines.join("\n");
  }

  if (entityType === "invoice_payment" || entityType === "order_payment") {
    lines.push(`Mã phiếu: ${snapshot.code || "N/A"}`);
    lines.push(`Số tiền: ${fmtCurrency(snapshot.amount)}`);
    lines.push(`Phương thức: ${snapshot.paymentMethod || "N/A"}`);
    if (snapshot.invoice?.code) lines.push(`Hóa đơn: ${snapshot.invoice.code}`);
    if (snapshot.order?.code) lines.push(`Đơn hàng: ${snapshot.order.code}`);
    const customerName =
      snapshot.invoice?.customer?.name || snapshot.order?.customer?.name;
    if (customerName) lines.push(`Khách hàng: ${customerName}`);
    return lines.join("\n");
  }

  if (entityType === "cashflows") {
    const type = snapshot.isReceipt ? "Thu" : "Chi";
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Loại: ${type}`);
    lines.push(`Số tiền: ${fmtCurrency(snapshot.amount)}`);
    if (snapshot.description) lines.push(`Mô tả: ${snapshot.description}`);
    if (snapshot.partnerName) lines.push(`Đối tác: ${snapshot.partnerName}`);
    if (snapshot.branchName) lines.push(`Chi nhánh: ${snapshot.branchName}`);
    if (snapshot.cashFlowGroupName)
      lines.push(`Nhóm: ${snapshot.cashFlowGroupName}`);
    lines.push(`Người tạo: ${snapshot.creatorName || "N/A"}`);
    return lines.join("\n");
  }

  if (entityType === "productions") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(
      `Sản phẩm: ${snapshot.productName || "N/A"} (${snapshot.productCode || ""})`
    );
    lines.push(`Số lượng: ${fmt(snapshot.quantity)}`);
    lines.push(`Giá vốn: ${fmtCurrency(snapshot.totalCost)}`);
    lines.push(`Kho nguồn: ${snapshot.sourceBranchName || "N/A"}`);
    lines.push(`Kho đích: ${snapshot.destinationBranchName || "N/A"}`);
    if (snapshot.note) lines.push(`Ghi chú: ${snapshot.note}`);
    lines.push(`Người tạo: ${snapshot.createdByName || "N/A"}`);
    return lines.join("\n");
  }

  if (entityType === "destructions") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Chi nhánh: ${snapshot.branchName || "N/A"}`);
    lines.push(`Tổng giá trị: ${fmtCurrency(snapshot.totalValue)}`);
    if (snapshot.note) lines.push(`Ghi chú: ${snapshot.note}`);
    lines.push(`Người tạo: ${snapshot.createdByName || "N/A"}`);

    if (snapshot.details?.length > 0) {
      lines.push("");
      lines.push("Sản phẩm:");
      snapshot.details.forEach((d: any) => {
        lines.push(
          `  - ${d.productCode || d.productName}: ${fmt(d.quantity)} × ${fmtCurrency(d.price)}`
        );
      });
    }
    return lines.join("\n");
  }

  if (entityType === "order_suppliers" || entityType === "purchase_orders") {
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`NCC: ${snapshot.supplierName || "N/A"}`);
    if (snapshot.branchName) lines.push(`Chi nhánh: ${snapshot.branchName}`);
    lines.push(
      `Tổng tiền: ${fmtCurrency(snapshot.total || snapshot.grandTotal)}`
    );
    lines.push(`Đã thanh toán: ${fmtCurrency(snapshot.paidAmount)}`);
    lines.push(`Công nợ NCC: ${fmtCurrency(snapshot.supplierDebt)}`);
    if (snapshot.status === 0) {
      lines.push(`Trạng thái: Phiếu Tạm`);
    } else if (snapshot.status === 1) {
      lines.push(`Trạng thái: Đã Xác Nhận NCC`);
    } else if (snapshot.status === 2) {
      lines.push(`Trạng thái: Đã Nhập 1 Phần`);
    } else if (snapshot.status === 3) {
      lines.push(`Trạng thái: Hoàn Thành`);
    } else if (snapshot.status === 4) {
      lines.push(`Trạng thái: Đã Hủy`);
    }
    lines.push(`Ghi chú: ${snapshot.description || ""}`);

    if (snapshot.items?.length > 0) {
      lines.push("");
      lines.push("Sản phẩm:");
      snapshot.items.forEach((i: any) => {
        lines.push(
          `  - ${i.productCode || i.productName}: ${fmt(i.quantity)} × ${fmtCurrency(i.price)}`
        );
      });
    }
    return lines.join("\n");
  }

  if (
    entityType === "packing_slips" ||
    entityType === "packing_hangs" ||
    entityType === "packing_loadings"
  ) {
    const typeLabel =
      entityType === "packing_slips"
        ? "Phiếu giao hàng"
        : entityType === "packing_hangs"
          ? "Phiếu treo hàng"
          : "Phiếu xếp hàng lên xe";
    lines.push(`Loại: ${typeLabel}`);
    lines.push(`Mã: ${snapshot.code || "N/A"}`);
    lines.push(`Chi nhánh: ${snapshot.branchName || "N/A"}`);
    lines.push(`Số kiện: ${fmt(snapshot.numberOfPackages)}`);
    if (snapshot.paymentMethod)
      lines.push(`Phương thức TT: ${snapshot.paymentMethod}`);
    if (snapshot.cashAmount)
      lines.push(`Tiền mặt: ${fmtCurrency(snapshot.cashAmount)}`);
    if (snapshot.feeGuiBen)
      lines.push(`Phí gửi bên: ${fmtCurrency(snapshot.feeGuiBen)}`);
    if (snapshot.feeGrab)
      lines.push(`Phí Grab: ${fmtCurrency(snapshot.feeGrab)}`);
    if (snapshot.cuocGuiHang)
      lines.push(`Cước gửi hàng: ${fmtCurrency(snapshot.cuocGuiHang)}`);
    if (snapshot.loadingByName)
      lines.push(`Người xếp hàng: ${snapshot.loadingByName}`);
    if (snapshot.note) lines.push(`Ghi chú: ${snapshot.note}`);

    if (snapshot.invoices?.length > 0) {
      lines.push("");
      lines.push("Hóa đơn:");
      snapshot.invoices.forEach((inv: any) => {
        lines.push(`  - ${inv.invoiceCode || inv.invoiceId}`);
      });
    }
    return lines.join("\n");
  }

  if (
    entityType === "purchase_order_payment" ||
    entityType === "order_supplier_payment"
  ) {
    const parentLabel =
      entityType === "purchase_order_payment"
        ? "Phiếu nhập hàng"
        : "Đặt hàng nhập";
    lines.push(`Mã phiếu: ${snapshot.code || "N/A"}`);
    lines.push(`Số tiền: ${fmtCurrency(snapshot.amount)}`);
    lines.push(`Phương thức: ${snapshot.paymentMethod || "N/A"}`);
    if (snapshot.purchaseOrder?.code)
      lines.push(`${parentLabel}: ${snapshot.purchaseOrder.code}`);
    if (snapshot.orderSupplier?.code)
      lines.push(`${parentLabel}: ${snapshot.orderSupplier.code}`);
    const supplierName =
      snapshot.purchaseOrder?.supplier || snapshot.orderSupplier?.supplier;
    if (supplierName)
      lines.push(
        `NCC: ${typeof supplierName === "object" ? supplierName.name : supplierName}`
      );
    return lines.join("\n");
  }

  if (entityType === "price_books") {
    if (snapshot.priceBookName) {
      lines.push(`Bảng giá: ${snapshot.priceBookName}`);
    } else if (snapshot.name) {
      lines.push(`Tên bảng giá: ${snapshot.name}`);
    }
    if (snapshot.isActive !== undefined)
      lines.push(`Trạng thái: ${snapshot.isActive ? "Đang hoạt động" : "Tắt"}`);
    if (snapshot.addedCount !== undefined)
      lines.push(`Số sản phẩm thêm: ${snapshot.addedCount}`);
    if (snapshot.removedCount !== undefined)
      lines.push(`Số sản phẩm xóa: ${snapshot.removedCount}`);
    if (snapshot.productName) lines.push(`Sản phẩm: ${snapshot.productName}`);
    if (snapshot.oldPrice !== undefined)
      lines.push(`Giá cũ: ${fmtCurrency(snapshot.oldPrice)}`);
    if (snapshot.newPrice !== undefined)
      lines.push(`Giá mới: ${fmtCurrency(snapshot.newPrice)}`);
    return lines.join("\n");
  }

  if (entityType === "return_orders") {
    lines.push(`Mã phiếu: ${snapshot.code || "N/A"}`);
    if (snapshot.invoiceCodes) lines.push(`Hóa đơn: ${snapshot.invoiceCodes}`);
    if (snapshot.customerName)
      lines.push(`Khách hàng: ${snapshot.customerName}`);
    if (snapshot.branchName) lines.push(`Chi nhánh: ${snapshot.branchName}`);
    if (snapshot.totalReturnAmount !== undefined)
      lines.push(`Tổng trả hàng: ${fmtCurrency(snapshot.totalReturnAmount)}`);
    if (snapshot.refundAmount !== undefined)
      lines.push(`Số tiền hoàn: ${fmtCurrency(snapshot.refundAmount)}`);
    if (snapshot.actualCashRefund !== undefined)
      lines.push(
        `Tiền mặt thực hoàn: ${fmtCurrency(snapshot.actualCashRefund)}`
      );
    if (snapshot.refundType)
      lines.push(
        `Hình thức hoàn: ${
          snapshot.refundType === "cash"
            ? "Tiền mặt"
            : snapshot.refundType === "debt_offset"
              ? "Cấn trừ công nợ"
              : snapshot.refundType === "manual_offset"
                ? "Bù trừ thủ công"
                : snapshot.refundType
        }`
      );
    if (snapshot.status) lines.push(`Trạng thái: ${snapshot.status}`);
    return lines.join("\n");
  }

  if (entityType === "settings") {
    const before = snapshot.before || {};
    const after = snapshot.after || {};

    const settingLabels: Record<string, string> = {
      managerCustomerByBranch: "Quản lý KH theo chi nhánh",
      allowOrderWhenOutStock: "Cho phép đặt hàng khi hết kho",
      allowSellWhenOrderOutStock: "Cho phép bán khi đơn hàng hết kho",
      allowSellWhenOutStock: "Cho phép bán khi hết kho",
    };

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changed: string[] = [];
    const unchanged: string[] = [];

    allKeys.forEach((key) => {
      const label = settingLabels[key] || key;
      const oldVal =
        before[key] !== undefined ? (before[key] ? "Bật" : "Tắt") : "N/A";
      const newVal =
        after[key] !== undefined ? (after[key] ? "Bật" : "Tắt") : "N/A";
      if (before[key] !== after[key]) {
        changed.push(`  ~ ${label}: ${oldVal} → ${newVal}`);
      } else {
        unchanged.push(`  ${label}: ${newVal}`);
      }
    });

    if (changed.length > 0) {
      lines.push("Thay đổi:");
      changed.forEach((l) => lines.push(l));
    }
    if (unchanged.length > 0) {
      lines.push("Không thay đổi:");
      unchanged.forEach((l) => lines.push(l));
    }
    return lines.join("\n");
  }

  if (entityType === "bank_accounts") {
    lines.push(`Ngân hàng: ${snapshot.bankName || "N/A"}`);
    lines.push(`Số TK: ${snapshot.accountNumber || "N/A"}`);
    lines.push(`Chủ TK: ${snapshot.accountHolder || "N/A"}`);
    if (snapshot.scope) lines.push(`Phạm vi: ${snapshot.scope}`);
    return lines.join("\n");
  }

  if (entityType === "roles") {
    lines.push(`Vai trò: ${snapshot.name || "N/A"}`);
    if (snapshot.description) lines.push(`Mô tả: ${snapshot.description}`);
    if (snapshot.branchName) lines.push(`Chi nhánh: ${snapshot.branchName}`);
    if (snapshot.permissionCount !== undefined)
      lines.push(`Số quyền: ${fmt(snapshot.permissionCount)}`);
    return lines.join("\n");
  }

  if (entityType === "inventory_checks") {
    lines.push(`Mã phiếu: ${snapshot.code || "N/A"}`);
    lines.push(`Chi nhánh: ${snapshot.branchName || "N/A"}`);
    if (snapshot.status) lines.push(`Trạng thái: ${snapshot.status}`);
    if (snapshot.createdByName)
      lines.push(`Người tạo: ${snapshot.createdByName}`);
    if (snapshot.note) lines.push(`Ghi chú: ${snapshot.note}`);

    if (snapshot.details?.length > 0) {
      lines.push("");
      lines.push("Sản phẩm:");
      snapshot.details.forEach((d: any) => {
        lines.push(
          `  - ${d.productCode || d.productName}: tồn ${fmt(d.currentOnHand)}, loại B ${fmt(d.damagedQuantity)}, cận date ${fmt(d.nearExpiryQuantity)}`
        );
      });
    }
    return lines.join("\n");
  }

  if (entityType === "stock_audits") {
    lines.push(`Mã phiếu: ${snapshot.code || "N/A"}`);
    lines.push(`Chi nhánh: ${snapshot.branchName || "N/A"}`);
    if (snapshot.status) lines.push(`Trạng thái: ${snapshot.status}`);
    if (snapshot.createdByName)
      lines.push(`Người tạo: ${snapshot.createdByName}`);
    if (snapshot.totalDiff !== undefined)
      lines.push(`Lệch tổng: ${fmt(snapshot.totalDiff)}`);
    if (snapshot.note) lines.push(`Ghi chú: ${snapshot.note}`);

    if (snapshot.details?.length > 0) {
      lines.push("");
      lines.push("Sản phẩm:");
      snapshot.details.forEach((d: any) => {
        lines.push(
          `  - ${d.productCode || d.productName}: hệ thống ${fmt(d.systemQuantity)} → thực tế ${fmt(d.actualQuantity)} (lệch ${fmt(d.difference)})`
        );
      });
    }
    return lines.join("\n");
  }

  if (entityType === "inventory_condition") {
    lines.push(
      `Sản phẩm: ${snapshot.productName || "N/A"} (${snapshot.productCode || ""})`
    );
    lines.push(`Chi nhánh: ${snapshot.branchName || "N/A"}`);
    lines.push(`Tồn kho: ${fmt(snapshot.onHand)}`);
    lines.push(`Hàng loại B: ${fmt(snapshot.damagedQuantity)}`);
    lines.push(`Hàng cận date: ${fmt(snapshot.nearExpiryQuantity)}`);
    return lines.join("\n");
  }

  const entries = Object.entries(snapshot).filter(
    ([key]) =>
      !["id", "createdAt", "updatedAt", "createdBy"].includes(key) &&
      typeof snapshot[key] !== "object"
  );
  entries.forEach(([key, val]) => {
    lines.push(`${key}: ${fmt(val)}`);
  });
  return lines.join("\n");
}

function renderChanges(changes: any[]): string {
  if (!changes || changes.length === 0) return "";
  const lines: string[] = ["", "Các thay đổi:"];

  changes.forEach((c: any) => {
    if (c.type === "item_added") {
      lines.push(
        `  + Thêm SP: ${c.detail?.productName} - SL: ${fmt(c.detail?.quantity)}, Giá: ${fmtCurrency(c.detail?.price)}`
      );
    } else if (c.type === "item_removed") {
      lines.push(
        `  - Xóa SP: ${c.detail?.productName} - SL: ${fmt(c.detail?.quantity)}`
      );
    } else if (c.type === "item_changed") {
      lines.push(
        `  ~ SP ${c.detail?.productName}: ${(c.detail?.changes || []).join(", ")}`
      );
    } else {
      lines.push(`  ~ ${c.label || c.field}: ${fmt(c.from)} → ${fmt(c.to)}`);
    }
  });

  return lines.join("\n");
}

export function AuditLogsTable({
  logs,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: AuditLogsTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatDetail = (log: any) => {
    if (log.message) return log.message;
    return log.actionCode || "N/A";
  };

  const formatExpandedDetail = (log: any) => {
    const snapshotText = renderSnapshot(log.entityType, log.snapshot);
    const changesText = renderChanges(log.changes);
    return snapshotText + changesText || log.message || "Không có chi tiết";
  };

  return (
    <div className="bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="w-8"></th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Nhân viên
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Phân loại
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Mức độ
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Thời gian
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Chi tiết
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const severity =
              severityConfig[log.severity] || severityConfig.info;
            const SeverityIcon = severity.icon;

            return (
              <Fragment key={log.id}>
                <tr
                  onClick={() =>
                    setExpandedId(expandedId === log.id ? null : log.id)
                  }
                  className="hover:bg-gray-50 cursor-pointer border-b">
                  <td className="px-4 py-4">
                    {expandedId === log.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{log.userName}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-block px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                      {categoryNames[log.category] || log.entityType || "Khác"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${severity.color}`}>
                      <SeverityIcon className="w-3 h-3" />
                      {severity.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                      locale: vi,
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm max-w-md truncate">
                    {formatDetail(log)}
                  </td>
                </tr>
                {expandedId === log.id && (
                  <tr className="bg-blue-50">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="border-l-4 border-blue-500 pl-4">
                        <div className="mb-2">
                          <span className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">
                            Chi tiết
                          </span>
                          {log.changes && log.changes.length > 0 && (
                            <span className="ml-3 text-xs text-orange-600 font-medium">
                              ({log.changes.length} thay đổi)
                            </span>
                          )}
                        </div>
                        <div className="text-sm whitespace-pre-line font-mono">
                          {formatExpandedDetail(log)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Không có bản ghi nào
        </div>
      )}

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-3 py-1 border rounded">
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">trên tổng số {total}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Trước
          </button>
          <span className="text-sm">
            Trang {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
