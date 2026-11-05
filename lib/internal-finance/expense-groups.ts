import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import { displayDescription } from "@/lib/internal-finance/display";

export type ExpenseGroupKey = "DELIVERY" | "VEHICLE" | "OTHER";

export interface ExpenseSection<T> {
  key: string;
  label: string;
  count: number;
  total: number;
  entries: T[];
}

export interface ExpenseGroup<T> {
  key: ExpenseGroupKey;
  label: string;
  count: number;
  total: number;
  sections: ExpenseSection<T>[];
}

type GroupableEntry = Pick<
  InternalFinanceEntry,
  "amount" | "category" | "subCategory" | "expenseItem" | "vehicleId"
>;

const GROUP_LABELS: Record<ExpenseGroupKey, string> = {
  DELIVERY: "Báo đơn giao hàng",
  VEHICLE: "Xe cộ",
  OTHER: "Chi phí khác",
};

// Khoản mục trên Lark (cột "Khoản mục") của các phiếu chi tay.
const DELIVERY_ITEM = "Cước gửi hàng cho khách: cước chành xe, ship nội thành";
const FUEL_ITEM = "Xăng xe: oto, xe tại kho";
const VEHICLE_CARE_ITEM = "Sửa chữa, bảo dưỡng; oto xe máy";
const ROAD_FEE_ITEM = "Cước đường bộ, vé gửi xe:";

const DELIVERY_FEE_LABELS: Record<string, string> = {
  FEE_GUI_BEN: "Phí gửi bến",
  FEE_GRAB: "Phí Grab",
  SHIPPING_OUT: "Cước gửi hàng",
  SHIPPING_IN: "Cước nhận hàng",
};

// Thứ tự cố định của các loại trong nhóm; loại lạ xếp sau theo tổng tiền.
const SECTION_ORDER = [
  "Phí gửi bến",
  "Phí Grab",
  "Cước gửi hàng",
  "Cước nhận hàng",
  "Cước gửi hàng (phiếu tay)",
  "Xăng dầu",
  "Sửa chữa, bảo dưỡng",
  "Cước đường bộ, vé gửi xe",
];

/**
 * Nhóm và loại của một phiếu chi kho. Ưu tiên loại khoản (category) của phiếu;
 * phiếu chi tay (OTHER_EXPENSE) xếp theo Khoản mục đã chọn.
 */
export function expenseGroupOf(entry: GroupableEntry): {
  group: ExpenseGroupKey;
  section: string;
} {
  const item = entry.expenseItem?.trim() || "";
  if (entry.category === "DELIVERY_FEE") {
    return {
      group: "DELIVERY",
      section: DELIVERY_FEE_LABELS[entry.subCategory || ""] || "Cước gửi hàng",
    };
  }
  if (entry.category === "FUEL" || item === FUEL_ITEM) {
    return { group: "VEHICLE", section: "Xăng dầu" };
  }
  if (entry.category === "VEHICLE_CARE" || item === VEHICLE_CARE_ITEM) {
    return { group: "VEHICLE", section: "Sửa chữa, bảo dưỡng" };
  }
  if (item === ROAD_FEE_ITEM) {
    return { group: "VEHICLE", section: "Cước đường bộ, vé gửi xe" };
  }
  if (entry.vehicleId) {
    return { group: "VEHICLE", section: "Chi phí xe khác" };
  }
  if (item === DELIVERY_ITEM) {
    return { group: "DELIVERY", section: "Cước gửi hàng (phiếu tay)" };
  }
  return { group: "OTHER", section: item.replace(/:$/, "") || "Khác" };
}

const sectionRank = (label: string) => {
  const index = SECTION_ORDER.indexOf(label);
  return index < 0 ? SECTION_ORDER.length : index;
};

/** Gom phiếu chi của batch tuần theo nhóm → loại, kèm số phiếu và tổng tiền. */
export function groupExpenseEntries<T extends GroupableEntry>(
  entries: T[],
): ExpenseGroup<T>[] {
  const groups = new Map<ExpenseGroupKey, Map<string, ExpenseSection<T>>>();
  for (const entry of entries) {
    const { group, section } = expenseGroupOf(entry);
    const sections = groups.get(group) || new Map();
    groups.set(group, sections);
    const current: ExpenseSection<T> = sections.get(section) || {
      key: section,
      label: section,
      count: 0,
      total: 0,
      entries: [],
    };
    current.count += 1;
    current.total += Number(entry.amount) || 0;
    current.entries.push(entry);
    sections.set(section, current);
  }
  return (["DELIVERY", "VEHICLE", "OTHER"] as const)
    .filter((key) => groups.has(key))
    .map((key) => {
      const sections = [...groups.get(key)!.values()].sort(
        (a, b) =>
          sectionRank(a.label) - sectionRank(b.label) || b.total - a.total,
      );
      return {
        key,
        label: GROUP_LABELS[key],
        count: sections.reduce((sum, section) => sum + section.count, 0),
        total: sections.reduce((sum, section) => sum + section.total, 0),
        sections,
      };
    });
}

/**
 * Nội dung phiếu trong một loại: bỏ tiền tố trùng tên loại
 * ("Phí gửi bến - Ms Ánh…" → "Ms Ánh…") vì tiêu đề loại đã nói rồi.
 */
export function entryTitleInSection(
  description: string | null | undefined,
  sectionLabel: string,
) {
  const text = displayDescription(description).trim();
  if (!text) return "Khoản chi nội bộ";
  const prefix = `${sectionLabel} - `.toLowerCase();
  const rest = text.toLowerCase().startsWith(prefix)
    ? text.slice(prefix.length).trim()
    : "";
  return rest || text;
}
