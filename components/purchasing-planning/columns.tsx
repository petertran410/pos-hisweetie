"use client";

import type { ColumnConfig } from "@/lib/hooks/useColumnVisibility";
import {
  CONFIDENCE_LABEL,
  PRIORITY_LABEL,
  RELIABILITY_LABEL,
  type RecommendationListItem,
  type RecommendationSortBy,
} from "@/lib/types/purchasing-planning";
import { CodeLink } from "@/components/shared/CodeLink";
import { PriorityBadge, ReliabilityBadge } from "./PriorityBadge";

// ═══════════════════════════════════════════════════════════════════════════
// TIỆN ÍCH ĐỊNH DẠNG
// ═══════════════════════════════════════════════════════════════════════════

export const num = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined
    ? "—"
    : Number(v).toLocaleString("vi-VN", { maximumFractionDigits: digits });

export const money = (v: number | null | undefined) => {
  if (v === null || v === undefined || v === 0) return "—";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} tr`;
  return num(v);
};

const dateVn = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";
const formatDate = (s: string) => dateVn(s);

const ORDER_URGENCY_LABEL = {
  ORDER_NOW: "Đặt ngay",
  ORDER_THIS_MONTH: "Đặt tháng này",
  ORDER_NEXT_MONTH: "Đặt tháng sau",
  ORDER_LATER: "Chưa cần đặt",
  NO_ACTION: "Chưa có nhu cầu",
} as const;

const ORDER_URGENCY_STYLE = {
  ORDER_NOW: "border-red-200 bg-red-50 text-red-700",
  ORDER_THIS_MONTH: "border-orange-200 bg-orange-50 text-orange-700",
  ORDER_NEXT_MONTH: "border-blue-200 bg-blue-50 text-blue-700",
  ORDER_LATER: "border-green-200 bg-green-50 text-green-700",
  NO_ACTION: "border-gray-200 bg-gray-50 text-gray-600",
} as const;

const DEMAND_STABILITY_LABEL = {
  STABLE: "Ổn định",
  VOLATILE: "Biến động",
  INSUFFICIENT_DATA: "Thiếu dữ liệu",
} as const;

/** Ngày cho file Excel — trả Date để Excel nhận đúng kiểu, null nếu không có */
const dateForExport = (s: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Ô số căn phải, dùng tabular-nums để các chữ số thẳng hàng */
const Num = ({
  value,
  digits = 0,
  className = "",
}: {
  value: number | null | undefined;
  digits?: number;
  className?: string;
}) => (
  <span className={`block text-right tabular-nums ${className}`}>
    {num(value, digits)}
  </span>
);

// ═══════════════════════════════════════════════════════════════════════════
// ĐỊNH NGHĨA CỘT
// ═══════════════════════════════════════════════════════════════════════════

/** Nhóm cột — dùng để gom trong dropdown chọn cột */
export const COLUMN_GROUPS: Record<string, string[]> = {
  "Định danh": ["code", "name"],
  "Phân loại": [
    "priority",
    "reliability",
    "parentName",
    "childName",
    "tradeMark",
    "supplier",
    "leadTime",
  ],
  "Tồn kho": ["physical", "reserved", "available", "incoming"],
  "Dự báo": ["forecast", "ma30", "ma60", "ma90", "trend", "confidence"],
  "Thời gian": ["dos", "daysUntilStockout", "stockoutDate", "urgency"],
  Ngưỡng: ["rop", "position", "gap"],
  "Đề xuất": ["soq", "packCount", "unitPrice", "value"],
  Khác: ["flags", "status"],
};

/** Cột nào sort được, và sort theo key nào ở API */
export const COLUMN_SORT_KEY: Record<string, RecommendationSortBy> = {
  code: "code",
  name: "name",
  priority: "priority",
  supplier: "supplier",
  leadTime: "leadtime",
  physical: "stock",
  available: "available",
  incoming: "incoming",
  forecast: "forecast",
  dos: "dos",
  daysUntilStockout: "stockout",
  rop: "rop",
  position: "position",
  gap: "gap",
  soq: "soq",
  value: "value",
};

export function buildColumns(): ColumnConfig<RecommendationListItem>[] {
  return [
    // ── Định danh (sticky) ──
    {
      key: "code",
      label: "Mã hàng",
      visible: true,
      width: "120px",
      tooltip: "Mã sản phẩm trong hệ thống.",
      render: (i) => (
        <CodeLink
          entity="product"
          code={i.productCode}
          className="font-medium whitespace-nowrap text-brand hover:underline"
        />
      ),
      exportValue: (i) => i.productCode,
    },
    {
      key: "name",
      label: "Tên hàng",
      visible: true,
      width: "280px",
      tooltip: "Tên sản phẩm trong hệ thống.",
      render: (i) => (
        <span className="block max-w-[280px] truncate" title={i.productName}>
          {i.productName}
        </span>
      ),
      exportValue: (i) => i.productName,
    },

    // ── Phân loại ──
    {
      key: "priority",
      label: "Ưu tiên",
      visible: true,
      width: "110px",
      tooltip: "Mức khẩn cấp do hệ thống xếp hạng, dựa trên nguy cơ đứt hàng.",
      render: (i) => <PriorityBadge priority={i.priority} size="sm" />,
      exportValue: (i) => PRIORITY_LABEL[i.priority] ?? i.priority,
    },
    {
      key: "reliability",
      label: "Tin cậy",
      visible: false,
      width: "110px",
      tooltip: "Mức tin cậy của đề xuất sau khi soát chất lượng dữ liệu.",
      render: (i) => <ReliabilityBadge reliability={i.reliability} />,
      exportValue: (i) => RELIABILITY_LABEL[i.reliability] ?? i.reliability,
    },
    {
      key: "parentName",
      label: "Loại hàng",
      visible: false,
      width: "120px",
      tooltip: "Nhóm hàng cấp 1 của sản phẩm.",
      render: (i) => (
        <span className="whitespace-nowrap text-gray-600">
          {i.parentName ?? "—"}
        </span>
      ),
      exportValue: (i) => i.parentName,
    },
    {
      key: "childName",
      label: "Danh mục",
      visible: false,
      width: "130px",
      tooltip: "Danh mục chi tiết của sản phẩm.",
      render: (i) => (
        <span className="whitespace-nowrap text-gray-600">
          {i.childName ?? "—"}
        </span>
      ),
      exportValue: (i) => i.childName,
    },
    {
      key: "tradeMark",
      label: "Thương hiệu",
      visible: false,
      width: "130px",
      tooltip: "Thương hiệu gắn với sản phẩm.",
      render: (i) => (
        <span className="whitespace-nowrap text-gray-600">
          {i.tradeMarkName ?? "—"}
        </span>
      ),
      exportValue: (i) => i.tradeMarkName,
    },
    {
      key: "supplier",
      label: "Nhà cung cấp",
      visible: true,
      width: "150px",
      tooltip: "Nhà cung cấp gắn với sản phẩm.",
      render: (i) => (
        <span className="block truncate whitespace-nowrap">
          {i.supplierName ?? (
            <span className="text-red-500">Chưa có NCC</span>
          )}
        </span>
      ),
      exportValue: (i) => i.supplierName ?? "Chưa có NCC",
    },
    {
      key: "leadTime",
      label: "Chờ hàng",
      visible: true,
      width: "100px",
      tooltip:
        "Khoảng thời gian từ lúc đặt nhà máy tới khi hàng về công ty: Sản xuất → Thông quan → Về công ty.",
      render: (i) =>
        i.leadTimeMinDays != null && i.leadTimeMinDays !== i.leadTimeDays ? (
          <span className="whitespace-nowrap tabular-nums">
            {i.leadTimeMinDays}–{i.leadTimeDays} ngày
          </span>
        ) : (
          <span className="whitespace-nowrap tabular-nums">
            {i.leadTimeDays} ngày
          </span>
        ),
      exportValue: (i) =>
        i.leadTimeMinDays != null && i.leadTimeMinDays !== i.leadTimeDays
          ? `${i.leadTimeMinDays}-${i.leadTimeDays}`
          : String(i.leadTimeDays),
    },
    {
      key: "orderUrgency",
      label: "Khi nào đặt",
      visible: true,
      width: "130px",
      tooltip:
        "Thời điểm cần tạo đợt đặt hàng, tính lùi từ ngày công ty cạn kho trừ đi thời gian chờ hàng.",
      render: (i) =>
        i.orderUrgency ? (
          <span
            className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${
              ORDER_URGENCY_STYLE[i.orderUrgency]
            }`}>
            {ORDER_URGENCY_LABEL[i.orderUrgency]}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
      exportValue: (i) =>
        i.orderUrgency ? ORDER_URGENCY_LABEL[i.orderUrgency] : "",
    },
    {
      key: "latestOrderDate",
      label: "Đặt trước ngày",
      visible: true,
      width: "115px",
      tooltip: "Hạn chót đặt hàng để không bị đứt hàng.",
      render: (i) => (
        <span className="whitespace-nowrap tabular-nums">
          {i.latestOrderDate ? formatDate(i.latestOrderDate) : "—"}
        </span>
      ),
      exportValue: (i) =>
        i.latestOrderDate ? formatDate(i.latestOrderDate) : "",
    },
    {
      key: "demandStability",
      label: "Ổn định bán",
      visible: false,
      width: "115px",
      tooltip:
        "Doanh số theo tháng có đều không. Càng dao động thì tồn dự phòng càng phải dày.",
      render: (i) =>
        i.demandStability ? (
          <span
            className={
              i.demandStability === "VOLATILE"
                ? "whitespace-nowrap text-amber-600"
                : "whitespace-nowrap text-gray-600"
            }>
            {DEMAND_STABILITY_LABEL[i.demandStability]}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
      exportValue: (i) =>
        i.demandStability ? DEMAND_STABILITY_LABEL[i.demandStability] : "",
    },

    // ── Tồn kho ──
    {
      key: "physical",
      label: "Tồn kho",
      visible: true,
      width: "90px",
      tooltip: "Số lượng thực tế trong kho, cộng gộp mọi chi nhánh.",
      render: (i) => (
        <Num
          value={i.physicalStock}
          className={i.physicalStock < 0 ? "text-red-600" : ""}
        />
      ),
      exportValue: (i) => i.physicalStock,
    },
    {
      key: "reserved",
      label: "Đã hứa",
      visible: false,
      width: "85px",
      tooltip: "Số lượng đã cam kết cho đơn khách nhưng chưa xuất kho.",
      render: (i) => <Num value={i.reservedStock} className="text-gray-500" />,
      exportValue: (i) => i.reservedStock,
    },
    {
      key: "available",
      label: "Khả dụng",
      visible: true,
      width: "95px",
      tooltip: "Tồn kho trừ đi lượng đã hứa cho khách.",
      render: (i) => (
        <Num
          value={i.availableStock}
          className={i.availableStock <= 0 ? "font-medium text-red-600" : ""}
        />
      ),
      exportValue: (i) => i.availableStock,
    },
    {
      key: "incoming",
      label: "Đang về",
      visible: true,
      width: "90px",
      tooltip: "Tổng lượng hàng đã đặt nhà cung cấp nhưng chưa nhập kho.",
      render: (i) => (
        <Num
          value={i.incomingTotal}
          className={i.incomingTotal > 0 ? "text-blue-600" : "text-gray-400"}
        />
      ),
      exportValue: (i) => i.incomingTotal,
    },

    // ── Dự báo ──
    {
      key: "forecast",
      label: "Bán/ngày",
      visible: true,
      width: "95px",
      tooltip: "Nhu cầu bán trung bình mỗi ngày, dùng để tính đề xuất.",
      render: (i) => <Num value={i.forecastDailyDemand} digits={1} />,
      exportValue: (i) => i.forecastDailyDemand,
    },
    {
      key: "ma30",
      label: "MA30",
      visible: false,
      width: "80px",
      tooltip: "Bình quân bán mỗi ngày trong 30 ngày gần nhất.",
      render: (i) => (
        <Num value={i.ma30} digits={1} className="text-gray-500" />
      ),
      exportValue: (i) => i.ma30,
    },
    {
      key: "ma60",
      label: "MA60",
      visible: false,
      width: "80px",
      tooltip: "Bình quân bán mỗi ngày trong 60 ngày gần nhất.",
      render: (i) => (
        <Num value={i.ma60} digits={1} className="text-gray-500" />
      ),
      exportValue: (i) => i.ma60,
    },
    {
      key: "ma90",
      label: "MA90",
      visible: false,
      width: "80px",
      tooltip: "Bình quân bán mỗi ngày trong 90 ngày gần nhất.",
      render: (i) => (
        <Num value={i.ma90} digits={1} className="text-gray-500" />
      ),
      exportValue: (i) => i.ma90,
    },
    {
      key: "trend",
      label: "Xu hướng",
      visible: false,
      width: "95px",
      tooltip: "Mức thay đổi của MA30 so với MA90; dương là đang bán tăng.",
      render: (i) => {
        if (i.trendRatio === null)
          return <span className="block text-right text-gray-400">—</span>;
        const pct = (i.trendRatio - 1) * 100;
        const up = pct > 1;
        const down = pct < -1;
        return (
          <span
            className={`block text-right tabular-nums ${
              up ? "text-orange-600" : down ? "text-blue-600" : "text-gray-500"
            }`}>
            {pct > 0 ? "+" : ""}
            {pct.toFixed(1)}%
          </span>
        );
      },
      // Xuất số phần trăm để Excel còn tính toán được, thay vì chuỗi "+12.3%"
      exportValue: (i) =>
        i.trendRatio === null
          ? null
          : Number(((i.trendRatio - 1) * 100).toFixed(1)),
    },
    {
      key: "confidence",
      label: "Tin cậy DB",
      visible: false,
      width: "100px",
      tooltip: "Độ tin cậy của con số dự báo bán mỗi ngày.",
      render: (i) => (
        <span className="whitespace-nowrap text-gray-600">
          {CONFIDENCE_LABEL[i.confidence]}
        </span>
      ),
      exportValue: (i) => CONFIDENCE_LABEL[i.confidence] ?? i.confidence,
    },

    // ── Thời gian ──
    {
      key: "dos",
      label: "Cung ứng",
      visible: false,
      width: "95px",
      tooltip: "Số ngày tồn kho khả dụng còn đủ để bán.",
      render: (i) => <Num value={i.daysOfSupply} digits={1} />,
      exportValue: (i) => i.daysOfSupply,
    },
    {
      key: "daysUntilStockout",
      label: "Còn (ngày)",
      visible: true,
      width: "100px",
      tooltip: "Số ngày còn lại trước khi dự kiến hết hàng.",
      render: (i) => {
        if (i.daysUntilStockout === null)
          return <span className="block text-right text-gray-400">—</span>;
        const urgent =
          i.urgencyRatio !== null && i.urgencyRatio < 1
            ? "font-medium text-red-600"
            : i.urgencyRatio !== null && i.urgencyRatio < 1.3
              ? "font-medium text-orange-600"
              : "";
        return <Num value={i.daysUntilStockout} className={urgent} />;
      },
      exportValue: (i) => i.daysUntilStockout,
    },
    {
      key: "stockoutDate",
      label: "Hết hàng ngày",
      visible: false,
      width: "115px",
      tooltip: "Ngày dự kiến hết hàng.",
      render: (i) => (
        <span className="block text-right whitespace-nowrap text-gray-600">
          {dateVn(i.projectedStockoutDate)}
        </span>
      ),
      exportValue: (i) => dateForExport(i.projectedStockoutDate),
    },
    {
      key: "urgency",
      label: "Tỉ lệ khẩn",
      visible: false,
      width: "95px",
      tooltip:
        "Số ngày còn hàng so với thời gian giao hàng; dưới 1 là sẽ đứt hàng.",
      render: (i) => <Num value={i.urgencyRatio} digits={2} />,
      exportValue: (i) => i.urgencyRatio,
    },

    // ── Ngưỡng ──
    {
      key: "rop",
      label: "Ngưỡng đặt",
      visible: false,
      width: "105px",
      tooltip: "Mức tồn kho tối thiểu cần có để không bị đứt hàng.",
      render: (i) => <Num value={i.reorderPoint} />,
      exportValue: (i) => i.reorderPoint,
    },
    {
      key: "position",
      label: "Vị thế",
      visible: false,
      width: "95px",
      tooltip: "Tổng lượng hàng đang nắm: khả dụng cộng hàng đang về.",
      render: (i) => <Num value={i.inventoryPosition} />,
      exportValue: (i) => i.inventoryPosition,
    },
    {
      key: "gap",
      label: "Thiếu hụt",
      visible: true,
      width: "100px",
      tooltip: "Phần còn thiếu so với ngưỡng đặt; dương nghĩa là cần đặt thêm.",
      render: (i) => (
        <Num
          value={i.reorderGap}
          className={i.reorderGap > 0 ? "font-medium text-red-600" : "text-gray-400"}
        />
      ),
      exportValue: (i) => i.reorderGap,
    },

    // ── Đề xuất ──
    {
      key: "soq",
      label: "SL đề xuất",
      visible: true,
      width: "110px",
      tooltip: "Số lượng nên đặt thêm, tính theo đơn vị cơ bản.",
      render: (i) =>
        i.suggestedQuantity > 0 ? (
          <span className="block text-right font-semibold tabular-nums">
            {num(i.suggestedQuantity)}
          </span>
        ) : (
          <span className="block text-right text-gray-400">—</span>
        ),
      exportValue: (i) => i.suggestedQuantity,
    },
    {
      key: "packCount",
      label: "Thùng",
      visible: true,
      width: "80px",
      tooltip: "Số lượng đề xuất quy đổi ra thùng.",
      render: (i) =>
        i.suggestedPackCount ? (
          <Num value={i.suggestedPackCount} digits={1} />
        ) : (
          <span className="block text-right text-gray-400">—</span>
        ),
      exportValue: (i) => i.suggestedPackCount,
    },
    {
      key: "unitPrice",
      label: "Đơn giá",
      visible: false,
      width: "100px",
      tooltip: "Giá nhập dùng để ước tính giá trị đơn hàng.",
      render: (i) => <Num value={i.estimatedUnitPrice} />,
      exportValue: (i) => i.estimatedUnitPrice,
    },
    {
      key: "value",
      label: "Giá trị",
      visible: true,
      width: "100px",
      tooltip: "Giá trị ước tính của lượng đề xuất đặt.",
      render: (i) => (
        <span className="block text-right tabular-nums">
          {money(i.estimatedValue)}
        </span>
      ),
      // Xuất số nguyên bản thay vì chuỗi rút gọn "1.2 tr" để còn cộng được
      exportValue: (i) => i.estimatedValue,
    },

    // ── Khác ──
    {
      key: "flags",
      label: "Cảnh báo",
      visible: true,
      width: "90px",
      tooltip: "Số vấn đề dữ liệu phát hiện được; rê chuột vào ô để xem chi tiết.",
      render: (i) =>
        i.flags.length > 0 ? (
          <span
            className="block text-center text-amber-600"
            title={i.flags.map((f) => f.message).join("\n")}>
            ⚠ {i.flags.length}
          </span>
        ) : (
          <span className="block text-center text-gray-300">—</span>
        ),
      exportValue: (i) => i.flags.map((f) => f.message).join("; "),
    },
    {
      key: "status",
      label: "Trạng thái",
      visible: false,
      width: "110px",
      tooltip: "Trạng thái xử lý của dòng đề xuất.",
      render: (i) => (
        <span className="whitespace-nowrap text-gray-600">{i.status}</span>
      ),
      exportValue: (i) => i.status,
    },
  ];
}

/** Các cột hiển thị dòng TỔNG ở đầu bảng */
export const TOTAL_COLUMNS = new Set([
  "physical",
  "reserved",
  "available",
  "incoming",
  "soq",
  "packCount",
  "value",
]);

/** Tính giá trị dòng tổng cho một cột */
export function computeTotal(
  key: string,
  items: RecommendationListItem[]
): React.ReactNode {
  const sum = (fn: (i: RecommendationListItem) => number) =>
    items.reduce((s, i) => s + fn(i), 0);

  switch (key) {
    case "physical":
      return <Num value={sum((i) => i.physicalStock)} />;
    case "reserved":
      return <Num value={sum((i) => i.reservedStock)} />;
    case "available":
      return <Num value={sum((i) => i.availableStock)} />;
    case "incoming":
      return <Num value={sum((i) => i.incomingTotal)} />;
    case "soq":
      return (
        <span className="block text-right font-semibold tabular-nums">
          {num(sum((i) => i.suggestedQuantity))}
        </span>
      );
    case "packCount":
      return <Num value={sum((i) => i.suggestedPackCount ?? 0)} digits={1} />;
    case "value":
      return (
        <span className="block text-right font-semibold tabular-nums">
          {money(sum((i) => i.estimatedValue ?? 0))}
        </span>
      );
    default:
      return null;
  }
}
