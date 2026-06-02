import type { CartItem } from "@/app/(dashboard)/ban-hang/page";

export interface OverstockItem {
  productId: number;
  productName: string;
  productCode?: string;
  quantity: number;
  onHand: number;
  /** "negative" = tồn kho âm, "exceed" = số lượng vượt tồn */
  type: "negative" | "exceed";
}

/**
 * Lấy số tồn kho `onHand` của một cart item theo chi nhánh đang chọn.
 * Trả về null nếu không có dữ liệu inventory cho chi nhánh đó (không thể đánh giá).
 */
export function getItemOnHand(
  item: CartItem,
  selectedBranchId: number | null | undefined
): number | null {
  if (!selectedBranchId) return null;
  const inventories = item.product?.inventories;
  if (!inventories || !Array.isArray(inventories)) return null;
  const inv = inventories.find((i: any) => i.branchId === selectedBranchId);
  return inv ? Number(inv.onHand) : null;
}

/**
 * Trả về thông báo cảnh báo tồn kho cho một cart item.
 * - Tồn âm: "Tồn kho âm (X)"
 * - Số lượng vượt tồn: "Vượt tồn kho (tồn: X)"
 * - Không có cảnh báo: null
 */
export function getStockWarning(
  item: CartItem,
  selectedBranchId: number | null | undefined
): string | null {
  const onHand = getItemOnHand(item, selectedBranchId);
  if (onHand === null) return null;
  if (onHand < 0) return `Tồn kho âm (${onHand})`;
  if (item.quantity > onHand) return `Vượt tồn kho (tồn: ${onHand})`;
  return null;
}

/**
 * Quét toàn bộ giỏ hàng và trả về danh sách item đang vượt tồn / tồn âm.
 * Phục vụ hiển thị dialog tổng khi mở edit đơn hàng/hóa đơn,
 * hoặc khi chuyển đơn hàng sang hóa đơn.
 */
export function getOverstockItems(
  cartItems: CartItem[],
  selectedBranchId: number | null | undefined
): OverstockItem[] {
  if (!cartItems || cartItems.length === 0) return [];
  const result: OverstockItem[] = [];
  for (const item of cartItems) {
    const onHand = getItemOnHand(item, selectedBranchId);
    if (onHand === null) continue;
    if (onHand < 0) {
      result.push({
        productId: Number(item.product?.id) || 0,
        productName: String(item.product?.name || ""),
        productCode: item.product?.code,
        quantity: Number(item.quantity) || 0,
        onHand,
        type: "negative",
      });
    } else if (Number(item.quantity) > onHand) {
      result.push({
        productId: Number(item.product?.id) || 0,
        productName: String(item.product?.name || ""),
        productCode: item.product?.code,
        quantity: Number(item.quantity) || 0,
        onHand,
        type: "exceed",
      });
    }
  }
  return result;
}

/**
 * Build HTML rows hiển thị trong SweetAlert2 cho danh sách overstock.
 * Lưu ý: Swal v11 cho phép dùng html nhưng phải tự escape các nội dung do user nhập.
 */
export function buildOverstockHtml(items: OverstockItem[]): string {
  const escape = (raw: string) =>
    String(raw)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const rows = items
    .map((it) => {
      const label =
        it.type === "negative"
          ? `<span style="color:#dc2626;font-weight:600">Tồn âm</span>`
          : `<span style="color:#dc2626;font-weight:600">Vượt tồn</span>`;
      const codeLine = it.productCode
        ? `<div style="font-size:11px;color:#6b7280">${escape(it.productCode)}</div>`
        : "";
      return `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left">
            <div style="font-weight:500">${escape(it.productName)}</div>
            ${codeLine}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">
            ${Number(it.quantity).toLocaleString("vi-VN")}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">
            ${Number(it.onHand).toLocaleString("vi-VN")}
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap">
            ${label}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <div style="max-height:320px;overflow:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left">Sản phẩm</th>
            <th style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">SL</th>
            <th style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">Tồn</th>
            <th style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">Trạng thái</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
