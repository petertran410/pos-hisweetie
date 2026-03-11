"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AuditLogsTableProps {
  logs: any[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const resourceNames: Record<string, string> = {
  products: "Sản phẩm",
  orders: "Đơn đặt hàng",
  invoices: "Hóa đơn",
  customers: "Khách hàng",
  suppliers: "Nhà cung cấp",
  inventories: "Tồn kho",
  users: "Người dùng",
  branches: "Chi nhánh",
  transfers: "Chuyển kho",
  purchase_orders: "Đơn mua hàng",
  order_suppliers: "Đặt hàng NCC",
  invoice_payment: "Phiếu thu",
  packing_slips: "Thu khác",
  packing_hangs: "Hóa đơn",
  packing_loadings: "Đặt hàng",
  cashflows: "Thu chi",
  productions: "Sản xuất",
  destructions: "Hủy hàng",
  navigation: "Điều hướng",
};

const actionNames: Record<string, string> = {
  create: "Tạo",
  update: "Cập nhật",
  delete: "Xóa",
  view: "Xem",
  list: "Danh sách",
  page_view: "Xem trang",
};

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
    // Sử dụng message đã render sẵn từ backend
    if (log.message) {
      return log.message;
    }

    // Fallback nếu không có message
    return `${actionNames[log.actionType] || log.actionType} ${resourceNames[log.entityType] || log.entityType}`;
  };

  const formatExpandedDetail = (log: any) => {
    const lines: string[] = [];

    // ORDER_CREATE
    if (log.actionCode === "ORDER_CREATE" && log.newValues?.order) {
      const order = log.newValues.order;

      lines.push(
        `Tạo đơn đặt hàng: ${order.code} (${order.statusValue || "Phiếu tạm"}), khách hàng: ${order.customer?.name || "N/A"}, Thuế: ${"Tắt thuế"}, thời gian ${format(new Date(order.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}, bảng giá: ${order.priceBook?.name || "Mặc định"}, Người tạo: ${log.userName}, Người nhận đặt: ${order.soldBy?.name || log.userName}, bao gồm:`
      );

      if (order.items?.length > 0) {
        order.items.forEach((item: any) => {
          lines.push(
            `- ${item.productCode} : ${item.quantity}×${new Intl.NumberFormat("vi-VN").format(item.price)}`
          );
        });
      }

      lines.push(`- Ghi chú: ${order.description || ""}`);

      lines.push(`\nThông tin giao hàng:`);
      if (order.delivery) {
        lines.push(`- Người nhận: ${order.delivery.receiver || "N/A"}`);
        lines.push(`- Số điện thoại: ${order.delivery.contactNumber || "N/A"}`);
        lines.push(`- Địa chỉ: ${order.delivery.address || "N/A"}`);
        if (order.delivery.wardName) {
          lines.push(`- Phường Xã: ${order.delivery.wardName}`);
        }
        lines.push(`- Trọng lượng: ${order.delivery.weight || 0}`);
        lines.push(
          `- Kích thước: ${order.delivery.length || 0} - ${order.delivery.width || 0} - ${order.delivery.height || 0}`
        );
        if (order.delivery.noteForDriver) {
          lines.push(`- Thu hộ tiền hàng: ${order.delivery.noteForDriver}`);
        }
        lines.push(
          `- Trạng thái giao: ${order.delivery.statusValue || "Chờ xử lý"}`
        );
      }

      return lines.join("\n");
    }

    // ORDER_UPDATE
    if (log.actionCode === "ORDER_UPDATE") {
      const old = log.oldValues || {};
      const newVal = log.newValues?.order || log.newValues || {};

      lines.push(
        `Cập nhật thông tin đơn đặt hàng: ${newVal.code || log.entityCode} (${newVal.statusValue || "Phiếu tạm"}), khách hàng: ${newVal.customer?.name || "N/A"}, Thuế: ${"Tắt thuế"}, bảng giá: ${newVal.priceBook?.name || "Mặc định"}, Người tạo: ${log.userName}, Người nhận đặt: ${newVal.soldBy?.name || log.userName}, bao gồm:`
      );

      if (newVal.items?.length > 0) {
        newVal.items.forEach((item: any) => {
          lines.push(
            `- ${item.productCode || item.productName} : ${item.quantity}×${new Intl.NumberFormat("vi-VN").format(item.price)}`
          );
        });
      }

      lines.push(`- Ghi chú: ${newVal.description || ""}`);

      lines.push(`\nThông tin giao hàng:`);
      const delivery = newVal.delivery;
      if (delivery) {
        lines.push(`- Người nhận: ${delivery.receiver || "N/A"}`);
        lines.push(`- Số điện thoại: ${delivery.contactNumber || "N/A"}`);
        lines.push(`- Địa chỉ: ${delivery.address || "N/A"}`);
        if (delivery.wardName) {
          lines.push(`- Phường Xã: ${delivery.wardName}`);
        }
        lines.push(`- Trọng lượng: ${delivery.weight || 0}`);
        lines.push(
          `- Kích thước: ${delivery.length || 0} - ${delivery.width || 0} - ${delivery.height || 0}`
        );
        if (delivery.noteForDriver) {
          lines.push(`- Thu hộ tiền hàng: ${delivery.noteForDriver}`);
        }
        lines.push(`- Trạng thái giao: ${delivery.statusValue || "Chờ xử lý"}`);
      }

      return lines.join("\n");
    }

    // ORDER_DELETE
    if (log.actionCode === "ORDER_DELETE" && log.oldValues) {
      const order = log.oldValues;

      lines.push(`Hủy đơn đặt hàng: ${order.code}`);
      lines.push(`- Khách hàng: ${order.customerName || "N/A"}`);
      lines.push(
        `- Tổng tiền: ${new Intl.NumberFormat("vi-VN").format(order.grandTotal || 0)}đ`
      );
      lines.push(`- Trạng thái trước khi hủy: ${order.statusValue || "N/A"}`);

      return lines.join("\n");
    }

    // INVOICE_CREATE
    if (log.actionCode === "INVOICE_CREATE" && log.newValues) {
      const invoice = log.newValues;

      lines.push(
        `Tạo hóa đơn: ${invoice.code} ( cho đơn đặt hàng: ${invoice.order?.code || "N/A"} ), khách hàng ${invoice.customer?.code || "N/A"}, bảng giá: ${invoice.priceBook?.name || "Mặc định"}, Thuê: ${invoice.taxEnabled ? "Bật thuế" : "Tắt thuế"}, giá trị: ${new Intl.NumberFormat("vi-VN").format(invoice.grandTotal || 0)}, thời gian: ${format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}, trạng thái: ${invoice.statusValue || "N/A"}, Người tạo: ${log.userName}, Người bán: ${invoice.soldBy?.name || log.userName}, tại kho: ${invoice.branch?.name || "N/A"}, bao gồm:`
      );

      if (invoice.details?.length > 0) {
        invoice.details.forEach((item: any) => {
          lines.push(
            `- ${item.productCode} : ${item.quantity}×${new Intl.NumberFormat("vi-VN").format(item.price)}, Tích điểm: ${item.isRewardPoint ? "Có" : "Không"}`
          );
        });
      }

      lines.push(`- Ghi chú: ${invoice.description || ""}`);

      lines.push(`\nThông tin giao hàng:`);
      if (invoice.delivery) {
        lines.push(`- Người nhận: ${invoice.delivery.receiver || "N/A"}`);
        lines.push(
          `- Số điện thoại: ${invoice.delivery.contactNumber || "N/A"}`
        );
        lines.push(`- Địa chỉ: ${invoice.delivery.address || "N/A"}`);
        lines.push(`- Trọng lượng: ${invoice.delivery.weight || 0}`);
        lines.push(
          `- Kích thước: ${invoice.delivery.length || 0} - ${invoice.delivery.width || 0} - ${invoice.delivery.height || 0}`
        );
        if (invoice.delivery.price) {
          lines.push(
            `- Phí giao hàng: ${new Intl.NumberFormat("vi-VN").format(invoice.delivery.price)}`
          );
        }
        if (invoice.delivery.noteForDriver) {
          lines.push(`- Thu hộ tiền hàng: ${invoice.delivery.noteForDriver}`);
        }
        lines.push(
          `- Trạng thái giao: ${invoice.delivery.statusValue || "Chờ xử lý"}`
        );
      }

      return lines.join("\n");
    }

    // INVOICE_UPDATE
    if (log.actionCode === "INVOICE_UPDATE" && log.newValues) {
      const invoice = log.newValues;

      lines.push(
        `Cập nhật hóa đơn: ${invoice.code} ( cho đơn đặt hàng: ${invoice.order?.code || "N/A"} ), khách hàng ${invoice.customer?.code || "N/A"}, bảng giá: ${invoice.priceBook?.name || "Mặc định"}, Thuê: ${invoice.taxEnabled ? "Bật thuế" : "Tắt thuế"}, giá trị: ${new Intl.NumberFormat("vi-VN").format(invoice.grandTotal || 0)}, thời gian: ${format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}, trạng thái: ${invoice.statusValue || "N/A"}, Người tạo: ${log.userName}, Người bán: ${invoice.soldBy?.name || log.userName}, tại kho: ${invoice.branch?.name || "N/A"}, bao gồm:`
      );

      if (invoice.details?.length > 0) {
        invoice.details.forEach((item: any) => {
          lines.push(
            `- ${item.productCode} : ${item.quantity}×${new Intl.NumberFormat("vi-VN").format(item.price)}, Tích điểm: ${item.isRewardPoint ? "Có" : "Không"}`
          );
        });
      }

      lines.push(`- Ghi chú: ${invoice.description || ""}`);

      lines.push(`\nThông tin giao hàng:`);
      if (invoice.delivery) {
        lines.push(`- Người nhận: ${invoice.delivery.receiver || "N/A"}`);
        lines.push(
          `- Số điện thoại: ${invoice.delivery.contactNumber || "N/A"}`
        );
        lines.push(`- Địa chỉ: ${invoice.delivery.address || "N/A"}`);
        lines.push(`- Trọng lượng: ${invoice.delivery.weight || 0}`);
        lines.push(
          `- Kích thước: ${invoice.delivery.length || 0} - ${invoice.delivery.width || 0} - ${invoice.delivery.height || 0}`
        );
        if (invoice.delivery.price) {
          lines.push(
            `- Phí giao hàng: ${new Intl.NumberFormat("vi-VN").format(invoice.delivery.price)}`
          );
        }
        if (invoice.delivery.noteForDriver) {
          lines.push(`- Thu hộ tiền hàng: ${invoice.delivery.noteForDriver}`);
        }
        lines.push(
          `- Trạng thái giao: ${invoice.delivery.statusValue || "Chờ xử lý"}`
        );
      }

      if (log.oldValues && log.oldValues.paidAmount !== invoice.paidAmount) {
        lines.push(`\nThông tin thanh toán:`);
        lines.push(
          `- Đã thanh toán: ${new Intl.NumberFormat("vi-VN").format(log.oldValues.paidAmount || 0)}đ → ${new Intl.NumberFormat("vi-VN").format(invoice.paidAmount || 0)}đ`
        );
      }

      return lines.join("\n");
    }

    // INVOICE_DELETE
    if (log.actionCode === "INVOICE_DELETE" && log.oldValues) {
      const invoice = log.oldValues;

      lines.push(`Xóa hóa đơn: ${invoice.code}`);
      lines.push(
        `- Tổng tiền: ${new Intl.NumberFormat("vi-VN").format(invoice.totalAmount || 0)}đ`
      );

      return lines.join("\n");
    }

    // INVOICE_PAYMENT_CREATE - Thêm block mới sau CASHFLOW_CREATE
    if (log.actionCode === "INVOICE_PAYMENT_CREATE" && log.newValues) {
      const payment = log.newValues;
      const methodMap: Record<string, string> = {
        cash: "Tiền mặt",
        transfer: "Chuyển khoản",
        card: "Thẻ",
        ewallet: "Ví điện tử",
      };

      lines.push(
        `Tạo phiếu thu: ${payment.code}, cho hóa đơn: ${payment.invoice?.code || "N/A"}, khách hàng ${payment.invoice?.customer?.code || "N/A"}, với giá trị: ${new Intl.NumberFormat("vi-VN").format(payment.amount || 0)}, phương thức thanh toán: ${methodMap[payment.paymentMethod] || payment.paymentMethod}, thời gian: ${format(new Date(payment.paymentDate || log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}`
      );

      return lines.join("\n");
    }

    // PRODUCT_CREATE
    if (log.actionCode === "PRODUCT_CREATE" && log.newValues) {
      const product = log.newValues;

      lines.push(`Thêm sản phẩm: ${product.name} (${product.code})`);
      lines.push(
        `- Giá bán: ${new Intl.NumberFormat("vi-VN").format(product.basePrice || 0)}đ`
      );
      if (product.unit) lines.push(`- Đơn vị: ${product.unit}`);
      if (product.weight)
        lines.push(
          `- Trọng lượng: ${product.weight}${product.weightUnit || "g"}`
        );
      if (product.description) lines.push(`- Mô tả: ${product.description}`);

      return lines.join("\n");
    }

    // PRODUCT_UPDATE
    if (log.actionCode === "PRODUCT_UPDATE" && log.oldValues && log.newValues) {
      const old = log.oldValues;
      const newVal = log.newValues;

      lines.push(
        `Cập nhật sản phẩm: ${newVal.name || old.name} (${newVal.code || old.code})`
      );
      lines.push(`Các thay đổi:`);

      if (old.basePrice !== newVal.basePrice) {
        lines.push(
          `- Giá: ${new Intl.NumberFormat("vi-VN").format(old.basePrice)}đ → ${new Intl.NumberFormat("vi-VN").format(newVal.basePrice)}đ`
        );
      }
      if (old.name !== newVal.name) {
        lines.push(`- Tên: ${old.name} → ${newVal.name}`);
      }
      if (old.weight !== newVal.weight) {
        lines.push(
          `- Trọng lượng: ${old.weight}${old.weightUnit} → ${newVal.weight}${newVal.weightUnit}`
        );
      }

      return lines.join("\n");
    }

    // PRODUCT_DELETE
    if (log.actionCode === "PRODUCT_DELETE" && log.oldValues) {
      const product = log.oldValues;

      lines.push(`Xóa sản phẩm: ${product.name} (${product.code})`);
      lines.push(
        `- Giá bán: ${new Intl.NumberFormat("vi-VN").format(product.basePrice || 0)}đ`
      );

      return lines.join("\n");
    }

    // CUSTOMER_CREATE
    if (log.actionCode === "CUSTOMER_CREATE" && log.newValues) {
      const customer = log.newValues;

      lines.push(`Thêm khách hàng: ${customer.name} (${customer.code})`);
      lines.push(`- SĐT: ${customer.contactNumber || "N/A"}`);
      if (customer.email) lines.push(`- Email: ${customer.email}`);
      if (customer.address) lines.push(`- Địa chỉ: ${customer.address}`);
      if (customer.groups) lines.push(`- Nhóm: ${customer.groups}`);

      return lines.join("\n");
    }

    // CUSTOMER_UPDATE
    if (
      log.actionCode === "CUSTOMER_UPDATE" &&
      log.oldValues &&
      log.newValues
    ) {
      const old = log.oldValues;
      const newVal = log.newValues;

      lines.push(
        `Cập nhật khách hàng: ${newVal.name || old.name} (${newVal.code || old.code})`
      );
      lines.push(`Các thay đổi:`);

      if (old.name !== newVal.name) {
        lines.push(`- Tên: ${old.name} → ${newVal.name}`);
      }
      if (old.contactNumber !== newVal.contactNumber) {
        lines.push(`- SĐT: ${old.contactNumber} → ${newVal.contactNumber}`);
      }
      if (old.address !== newVal.address) {
        lines.push(
          `- Địa chỉ: ${old.address || "(trống)"} → ${newVal.address || "(trống)"}`
        );
      }

      return lines.join("\n");
    }

    // CUSTOMER_DELETE
    if (log.actionCode === "CUSTOMER_DELETE" && log.oldValues) {
      const customer = log.oldValues;

      lines.push(`Xóa khách hàng: ${customer.name} (${customer.code})`);
      lines.push(`- SĐT: ${customer.contactNumber || "N/A"}`);

      return lines.join("\n");
    }

    // SUPPLIER_CREATE, UPDATE, DELETE tương tự CUSTOMER
    if (log.actionCode === "SUPPLIER_CREATE" && log.newValues) {
      const supplier = log.newValues;

      lines.push(`Thêm nhà cung cấp: ${supplier.name} (${supplier.code})`);
      lines.push(`- SĐT: ${supplier.contactNumber || "N/A"}`);
      if (supplier.email) lines.push(`- Email: ${supplier.email}`);
      if (supplier.address) lines.push(`- Địa chỉ: ${supplier.address}`);

      return lines.join("\n");
    }

    if (
      log.actionCode === "SUPPLIER_UPDATE" &&
      log.oldValues &&
      log.newValues
    ) {
      const old = log.oldValues;
      const newVal = log.newValues;

      lines.push(
        `Cập nhật nhà cung cấp: ${newVal.name || old.name} (${newVal.code || old.code})`
      );
      lines.push(`Các thay đổi:`);

      if (old.name !== newVal.name) {
        lines.push(`- Tên: ${old.name} → ${newVal.name}`);
      }
      if (old.contactNumber !== newVal.contactNumber) {
        lines.push(`- SĐT: ${old.contactNumber} → ${newVal.contactNumber}`);
      }

      return lines.join("\n");
    }

    if (log.actionCode === "SUPPLIER_DELETE" && log.oldValues) {
      const supplier = log.oldValues;

      lines.push(`Xóa nhà cung cấp: ${supplier.name} (${supplier.code})`);

      return lines.join("\n");
    }

    // CASHFLOW
    if (log.actionCode === "CASHFLOW_CREATE" && log.newValues) {
      const cf = log.newValues;
      const type = cf.isReceipt ? "Thu" : "Chi";

      lines.push(
        `${type} tiền: ${new Intl.NumberFormat("vi-VN").format(cf.amount || 0)}đ`
      );
      lines.push(`- Mô tả: ${cf.description || "N/A"}`);
      if (cf.accountName) lines.push(`- Tài khoản: ${cf.accountName}`);

      return lines.join("\n");
    }

    // Fallback
    lines.push(`Người dùng: ${log.userName}`);
    lines.push(`Hành động: ${log.actionCode}`);
    lines.push(`Mã: ${log.entityCode || "N/A"}`);

    return lines.join("\n");
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
              Tính năng
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
          {logs.map((log) => (
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
                  {resourceNames[log.entityType] || log.entityType}
                </td>
                <td className="px-6 py-4 text-sm">
                  {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                    locale: vi,
                  })}
                </td>
                <td className="px-6 py-4 text-sm">{formatDetail(log)}</td>
              </tr>
              {expandedId === log.id && (
                <tr className="bg-blue-50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="mb-2">
                        <span className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">
                          Chi tiết
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-line">
                        {formatExpandedDetail(log)}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
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
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
