/**
 * Mock data — Module Purchasing Planning
 *
 * MỤC ĐÍCH: cho phép review UX trước khi backend hoàn thành.
 * Dữ liệu lấy từ 3 ví dụ THẬT trong PRD Phụ lục B để đảm bảo con số
 * phản ánh đúng nghiệp vụ, không phải số bịa.
 *
 * ⚠️ File này sẽ bị xoá khi backend xong (đổi USE_MOCK = false).
 */
import type {
  BranchStock,
  CalculationTrace,
  ConfidenceLevel,
  DataQualityFlag,
  ForecastComparison,
  IncomingShipmentInfo,
  PriorityLevel,
  RecommendationDetail,
  RecommendationListItem,
  ReliabilityLevel,
  CreatePurchasingConfigRequest,
  PurchasingConfigPatch,
  PurchasingConfigGroup,
  PurchasingConfigListResponse,
  PurchasingConfigScope,
  ResolvedPurchasingConfigQuery,
  ResolvedPurchasingConfig,
} from "@/lib/types/purchasing-planning";
import {
  PRIORITY_RANK,
  PURCHASING_CONFIG_FIELDS,
} from "@/lib/types/purchasing-planning";

const today = new Date();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// ═══════════════════════════════════════════════════════════════════════════
// SKU 1 — BPMKM (PRD §13.3): thiếu hàng nặng, lô đang về KHÔNG kịp
// ═══════════════════════════════════════════════════════════════════════════

const bpmkmBranches: BranchStock[] = [
  { branchId: 1, branchName: "Kho Sài Gòn", branchCode: "KHO_SG", onHand: 1280 },
  { branchId: 6, branchName: "Kho Hà Nội", branchCode: "KHO_HN", onHand: 307 },
];

const bpmkmShipments: IncomingShipmentInfo[] = [
  {
    orderSupplierId: 847,
    orderCode: "PDN-2026-0847",
    supplierName: "Honghe",
    quantity: 350,
    eta: iso(33),
    etaType: "CONFIRMED",
  },
];

const bpmkmForecast: ForecastComparison = {
  used: 48.8,
  windowUsed: 90,
  ma30: 58.3,
  ma60: 52.1,
  ma90: 48.8,
  trendRatio: 1.195,
  totalDemand: 4392,
  validDays: 90,
  windowDays: 90,
  stockoutDaysExcluded: 0,
  growthFactor: 1,
  demandSource: "INVOICE_DETAIL",
};

const bpmkmFlags: DataQualityFlag[] = [
  {
    code: "TREND_SHIFT",
    severity: "MEDIUM",
    blocksRecommendation: false,
    message:
      "Xu hướng bán đang TĂNG (MA30 cao hơn MA90 gần 20%). Cân nhắc đặt thêm 15–20% so với đề xuất.",
  },
  {
    code: "SHIPMENT_LATE_ARRIVAL",
    severity: "HIGH",
    blocksRecommendation: false,
    message:
      "Sẽ đứt hàng khoảng 25 ngày ngay cả khi đặt hôm nay. Nên liên hệ NCC xem có thể giao sớm không.",
  },
];

const bpmkmTrace: CalculationTrace = {
  version: "1.0",
  computedAt: new Date().toISOString(),
  inputs: {
    config: {
      leadTimeDays: { value: 45, source: "SUPPLIER", label: "NCC Honghe" },
      safetyDays: { value: 21, source: "CATEGORY", label: "Nhập khẩu" },
      coverageDays: { value: 30, source: "GLOBAL", label: "Mặc định" },
      growthFactor: { value: 1, source: "GLOBAL", label: "Mặc định" },
      packSize: {
        value: 25,
        source: "PRODUCT",
        label: "Sản phẩm · Định lượng đóng gói",
      },
      moq: { value: 1000, source: "SUPPLIER", label: "NCC Honghe" },
    },
    inventory: {
      physical: 1587,
      reserved: 180,
      available: 1407,
      branches: bpmkmBranches,
    },
    shipments: bpmkmShipments,
    forecast: bpmkmForecast,
  },
  steps: [
    {
      step: 1,
      name: "Nhu cầu trong thời gian chờ hàng",
      formula: "Forecast/ngày × Leadtime",
      values: { forecastDailyDemand: 48.8, leadTimeDays: 45 },
      result: 2196,
    },
    {
      step: 2,
      name: "Biên an toàn",
      formula: "Forecast/ngày × Số ngày dự phòng",
      values: { forecastDailyDemand: 48.8, safetyDays: 21 },
      result: 1024.8,
    },
    {
      step: 3,
      name: "Ngưỡng đặt hàng",
      formula: "Nhu cầu chờ hàng + Biên an toàn",
      values: { leadTimeDemand: 2196, safetyBuffer: 1024.8 },
      result: 3220.8,
    },
    {
      step: 4,
      name: "Vị thế tồn kho",
      formula: "Tồn khả dụng + Hàng đang về",
      values: { available: 1407, incoming: 350 },
      result: 1757,
    },
    {
      step: 5,
      name: "Mức thiếu hụt",
      formula: "Ngưỡng đặt hàng − Vị thế tồn kho",
      values: { reorderPoint: 3220.8, inventoryPosition: 1757 },
      result: 1463.8,
      note: "Dương → cần đặt hàng",
    },
    {
      step: 6,
      name: "Lượng cần có để đủ dùng",
      formula: "Forecast/ngày × (Leadtime + Dự phòng + Chu kỳ đặt)",
      values: { forecastDailyDemand: 48.8, totalDays: 96 },
      result: 4684.8,
    },
    {
      step: 7,
      name: "Số lượng thô cần đặt",
      formula: "Lượng cần có − Tồn khả dụng − Hàng đang về",
      values: { targetStock: 4684.8, available: 1407, incoming: 350 },
      result: 2927.8,
    },
    {
      step: 8,
      name: "Làm tròn theo quy cách thùng",
      formula: "ceil(SL thô / Quy cách) × Quy cách",
      values: { raw: 2927.8, packSize: 25, packCount: 118 },
      result: 2950,
      note: "MOQ 1.000 đã thoả mãn",
    },
  ],
  result: {
    reorderPoint: 3220.8,
    inventoryPosition: 1757,
    reorderGap: 1463.8,
    suggestedQuantity: 2950,
    priority: "CRITICAL",
  },
  flags: bpmkmFlags,
};

// ═══════════════════════════════════════════════════════════════════════════
// SKU 2 — BCRTG (PRD Phụ lục B.1): biên rất mỏng, Lark bỏ sót
// ═══════════════════════════════════════════════════════════════════════════

const bcrtgBranches: BranchStock[] = [
  { branchId: 1, branchName: "Kho Sài Gòn", branchCode: "KHO_SG", onHand: 539 },
  { branchId: 6, branchName: "Kho Hà Nội", branchCode: "KHO_HN", onHand: 89 },
];

const bcrtgForecast: ForecastComparison = {
  used: 11.72,
  windowUsed: 90,
  ma30: 12.4,
  ma60: 11.9,
  ma90: 11.72,
  trendRatio: 1.058,
  totalDemand: 1055,
  validDays: 90,
  windowDays: 90,
  stockoutDaysExcluded: 0,
  growthFactor: 1,
  demandSource: "INVOICE_DETAIL",
};

const bcrtgTrace: CalculationTrace = {
  version: "1.0",
  computedAt: new Date().toISOString(),
  inputs: {
    config: {
      leadTimeDays: { value: 45, source: "SUPPLIER", label: "NCC Honghe" },
      safetyDays: { value: 21, source: "CATEGORY", label: "Nhập khẩu" },
      coverageDays: { value: 30, source: "GLOBAL", label: "Mặc định" },
      growthFactor: { value: 1, source: "GLOBAL", label: "Mặc định" },
      packSize: {
        value: 40,
        source: "PRODUCT",
        label: "Sản phẩm · Định lượng đóng gói",
      },
      moq: { value: 400, source: "SUPPLIER", label: "NCC Honghe" },
    },
    inventory: {
      physical: 628,
      reserved: 80,
      available: 548,
      branches: bcrtgBranches,
    },
    shipments: [],
    forecast: bcrtgForecast,
  },
  steps: [
    {
      step: 1,
      name: "Nhu cầu trong thời gian chờ hàng",
      formula: "Forecast/ngày × Leadtime",
      values: { forecastDailyDemand: 11.72, leadTimeDays: 45 },
      result: 527.4,
    },
    {
      step: 2,
      name: "Biên an toàn",
      formula: "Forecast/ngày × Số ngày dự phòng",
      values: { forecastDailyDemand: 11.72, safetyDays: 21 },
      result: 246.1,
    },
    {
      step: 3,
      name: "Ngưỡng đặt hàng",
      formula: "Nhu cầu chờ hàng + Biên an toàn",
      values: { leadTimeDemand: 527.4, safetyBuffer: 246.1 },
      result: 773.5,
    },
    {
      step: 4,
      name: "Vị thế tồn kho",
      formula: "Tồn khả dụng + Hàng đang về",
      values: { available: 548, incoming: 0 },
      result: 548,
    },
    {
      step: 5,
      name: "Mức thiếu hụt",
      formula: "Ngưỡng đặt hàng − Vị thế tồn kho",
      values: { reorderPoint: 773.5, inventoryPosition: 548 },
      result: 225.5,
      note: "Dương → cần đặt hàng",
    },
    {
      step: 6,
      name: "Lượng cần có để đủ dùng",
      formula: "Forecast/ngày × (Leadtime + Dự phòng + Chu kỳ đặt)",
      values: { forecastDailyDemand: 11.72, totalDays: 96 },
      result: 1125.1,
    },
    {
      step: 7,
      name: "Số lượng thô cần đặt",
      formula: "Lượng cần có − Tồn khả dụng − Hàng đang về",
      values: { targetStock: 1125.1, available: 548, incoming: 0 },
      result: 577.1,
    },
    {
      step: 8,
      name: "Làm tròn theo quy cách thùng",
      formula: "ceil(SL thô / Quy cách) × Quy cách",
      values: { raw: 577.1, packSize: 40, packCount: 15 },
      result: 600,
    },
  ],
  result: {
    reorderPoint: 773.5,
    inventoryPosition: 548,
    reorderGap: 225.5,
    suggestedQuantity: 600,
    priority: "HIGH",
  },
  flags: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// SKU 3 — SP000781 (PRD Phụ lục B.3): đang hết hàng, vòng xoáy tử thần
// ═══════════════════════════════════════════════════════════════════════════

const matchaFlags: DataQualityFlag[] = [
  {
    code: "OUT_OF_STOCK",
    severity: "CRITICAL",
    blocksRecommendation: false,
    message: "ĐANG HẾT HÀNG — đã 55/90 ngày qua không có hàng để bán.",
  },
  {
    code: "PENDING_CUSTOMER_ORDERS",
    severity: "HIGH",
    blocksRecommendation: false,
    message: "Có 2 đơn khách đang chờ (240 gói).",
    context: { orderCount: 2, quantity: 240 },
  },
  {
    code: "LOW_CONFIDENCE_FORECAST",
    severity: "MEDIUM",
    blocksRecommendation: false,
    message:
      "Nhu cầu thực tế cao hơn 2,6 lần con số trung bình thô, do đã loại trừ những ngày không có hàng để bán.",
  },
];

const matchaForecast: ForecastComparison = {
  used: 3.6,
  windowUsed: 90,
  ma30: 4.1,
  ma60: 3.8,
  ma90: 3.6,
  trendRatio: 1.139,
  totalDemand: 126,
  validDays: 35,
  windowDays: 90,
  stockoutDaysExcluded: 55,
  growthFactor: 1,
  demandSource: "HYBRID",
};

const matchaTrace: CalculationTrace = {
  version: "1.0",
  computedAt: new Date().toISOString(),
  inputs: {
    config: {
      leadTimeDays: { value: 5, source: "SUPPLIER", label: "NCC nội địa" },
      safetyDays: { value: 7, source: "CATEGORY", label: "Trong nước" },
      coverageDays: { value: 14, source: "CATEGORY", label: "Trong nước" },
      growthFactor: { value: 1, source: "GLOBAL", label: "Mặc định" },
      packSize: {
        value: 40,
        source: "PRODUCT",
        label: "Sản phẩm · Định lượng đóng gói",
      },
      moq: { value: 40, source: "GLOBAL", label: "= quy cách thùng" },
    },
    inventory: {
      physical: 0,
      reserved: 0,
      available: 0,
      branches: [
        { branchId: 1, branchName: "Kho Sài Gòn", branchCode: "KHO_SG", onHand: 0 },
        { branchId: 6, branchName: "Kho Hà Nội", branchCode: "KHO_HN", onHand: 0 },
      ],
    },
    shipments: [],
    forecast: matchaForecast,
  },
  steps: [
    {
      step: 1,
      name: "Nhu cầu trong thời gian chờ hàng",
      formula: "Forecast/ngày × Leadtime",
      values: { forecastDailyDemand: 3.6, leadTimeDays: 5 },
      result: 18,
    },
    {
      step: 2,
      name: "Biên an toàn",
      formula: "Forecast/ngày × Số ngày dự phòng",
      values: { forecastDailyDemand: 3.6, safetyDays: 7 },
      result: 25.2,
    },
    {
      step: 3,
      name: "Ngưỡng đặt hàng",
      formula: "Nhu cầu chờ hàng + Biên an toàn",
      values: { leadTimeDemand: 18, safetyBuffer: 25.2 },
      result: 43.2,
    },
    {
      step: 4,
      name: "Vị thế tồn kho",
      formula: "Tồn khả dụng + Hàng đang về",
      values: { available: 0, incoming: 0 },
      result: 0,
    },
    {
      step: 5,
      name: "Mức thiếu hụt",
      formula: "Ngưỡng đặt hàng − Vị thế tồn kho",
      values: { reorderPoint: 43.2, inventoryPosition: 0 },
      result: 43.2,
      note: "Đang hết hàng hoàn toàn",
    },
    {
      step: 6,
      name: "Lượng cần có để đủ dùng",
      formula: "Forecast/ngày × (Leadtime + Dự phòng + Chu kỳ đặt)",
      values: { forecastDailyDemand: 3.6, totalDays: 26 },
      result: 93.6,
    },
    {
      step: 7,
      name: "Số lượng thô cần đặt",
      formula: "Lượng cần có − Tồn khả dụng − Hàng đang về",
      values: { targetStock: 93.6, available: 0, incoming: 0 },
      result: 93.6,
    },
    {
      step: 8,
      name: "Làm tròn theo quy cách thùng",
      formula: "ceil(SL thô / Quy cách) × Quy cách",
      values: { raw: 93.6, packSize: 40, packCount: 3 },
      result: 120,
    },
  ],
  result: {
    reorderPoint: 43.2,
    inventoryPosition: 0,
    reorderGap: 43.2,
    suggestedQuantity: 120,
    priority: "CRITICAL",
  },
  flags: matchaFlags,
};

// ═══════════════════════════════════════════════════════════════════════════
// DANH SÁCH ĐỀ XUẤT
// ═══════════════════════════════════════════════════════════════════════════

const baseItems: RecommendationListItem[] = [
  {
    itemId: 1,
    productId: 934,
    productCode: "BPMKM",
    productName: "Bột Khoai Môn Binbaoli 1kg (25 gói/ thùng)",
    unit: "Gói",
    packSize: 25,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Bột pha chế",
    tradeMarkId: 3,
    tradeMarkName: "Binbaoli",
    supplierId: 12,
    supplierName: "Honghe",
    leadTimeDays: 45,
    leadTimeSource: "SUPPLIER",
    priority: "CRITICAL",
    priorityRank: 1,
    reliability: "CAUTION",
    physicalStock: 1587,
    reservedStock: 180,
    availableStock: 1407,
    incomingTotal: 350,
    forecastDailyDemand: 48.8,
    confidence: "HIGH",
    ma30: 54.66,
    ma60: 50.26,
    ma90: 48.8,
    trendRatio: 1.12,
    daysOfSupply: 28.8,
    daysUntilStockout: 29,
    projectedStockoutDate: iso(29),
    urgencyRatio: 0.64,
    reorderPoint: 3220.8,
    inventoryPosition: 1757,
    reorderGap: 1463.8,
    needsOrder: true,
    suggestedQuantity: 2950,
    suggestedPackCount: 118,
    estimatedUnitPrice: 30000,
    estimatedValue: 88500000,
    summaryText:
      "Hết sau 29 ngày · Lô đang về ngày thứ 33 → KHÔNG KỊP, đứt hàng ~4 ngày",
    flags: bpmkmFlags,
    status: "PENDING",
  },
  {
    itemId: 2,
    productId: 781,
    productCode: "SP000781",
    productName: "Bột Matcha nguyên chất AMO 200gr (40 gói/thùng)",
    unit: "Gói",
    packSize: 40,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Bột pha chế",
    tradeMarkId: 1,
    tradeMarkName: "Amo Pastel",
    supplierId: 5,
    supplierName: "Amo Pastel",
    leadTimeDays: 5,
    leadTimeSource: "SUPPLIER",
    priority: "CRITICAL",
    priorityRank: 1,
    reliability: "CAUTION",
    physicalStock: 0,
    reservedStock: 0,
    availableStock: 0,
    incomingTotal: 0,
    forecastDailyDemand: 3.6,
    confidence: "MEDIUM",
    ma30: 4.03,
    ma60: 3.71,
    ma90: 3.6,
    trendRatio: 1.119,
    daysOfSupply: 0,
    daysUntilStockout: 0,
    projectedStockoutDate: iso(0),
    urgencyRatio: 0,
    reorderPoint: 43.2,
    inventoryPosition: 0,
    reorderGap: 43.2,
    needsOrder: true,
    suggestedQuantity: 120,
    suggestedPackCount: 3,
    estimatedUnitPrice: 145000,
    estimatedValue: 17400000,
    summaryText: "ĐÃ HẾT HÀNG · Không có lô nào đang về · 2 đơn khách đang chờ",
    flags: matchaFlags,
    status: "PENDING",
  },
  {
    itemId: 3,
    productId: 913,
    productCode: "BCRTG",
    productName: "Bột cheese Royaltea túi giấy 500gr (40 gói/thùng)",
    unit: "Gói",
    packSize: 40,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Bột pha chế",
    tradeMarkId: 3,
    tradeMarkName: "Binbaoli",
    supplierId: 12,
    supplierName: "Honghe",
    leadTimeDays: 45,
    leadTimeSource: "SUPPLIER",
    priority: "HIGH",
    priorityRank: 2,
    reliability: "RELIABLE",
    physicalStock: 628,
    reservedStock: 80,
    availableStock: 548,
    incomingTotal: 0,
    forecastDailyDemand: 11.72,
    confidence: "HIGH",
    ma30: 13.13,
    ma60: 12.07,
    ma90: 11.72,
    trendRatio: 1.12,
    daysOfSupply: 46.8,
    daysUntilStockout: 47,
    projectedStockoutDate: iso(47),
    urgencyRatio: 1.04,
    reorderPoint: 773.5,
    inventoryPosition: 548,
    reorderGap: 225.5,
    needsOrder: true,
    suggestedQuantity: 600,
    suggestedPackCount: 15,
    estimatedUnitPrice: 82000,
    estimatedValue: 49200000,
    summaryText:
      "Hết sau 47 ngày · Đặt hôm nay hàng về đúng lúc — KHÔNG CÒN BIÊN AN TOÀN",
    flags: [],
    status: "PENDING",
  },
  {
    itemId: 4,
    productId: 640,
    productCode: "SP000640",
    productName: "Sữa dừa Amo pastel 1 lít (12 chai/thùng)",
    unit: "Chai",
    packSize: 12,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Sữa - Kem",
    tradeMarkId: 1,
    tradeMarkName: "Amo Pastel",
    supplierId: 5,
    supplierName: "Amo Pastel",
    leadTimeDays: 45,
    leadTimeSource: "SUPPLIER",
    priority: "CRITICAL",
    priorityRank: 1,
    reliability: "RELIABLE",
    physicalStock: 98,
    reservedStock: 0,
    availableStock: 98,
    incomingTotal: 6300,
    forecastDailyDemand: 4.87,
    confidence: "HIGH",
    ma30: 5.45,
    ma60: 5.02,
    ma90: 4.87,
    trendRatio: 1.119,
    daysOfSupply: 20.1,
    daysUntilStockout: 21,
    projectedStockoutDate: iso(21),
    urgencyRatio: 0.47,
    reorderPoint: 321.4,
    inventoryPosition: 6398,
    reorderGap: -6076.6,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: 0,
    estimatedUnitPrice: 55000,
    estimatedValue: 0,
    summaryText:
      "Hết sau 21 ngày · Lô 6.300 về ngày thứ 45 → ĐỨT HÀNG 24 NGÀY. Cần giục NCC giao sớm",
    flags: [
      {
        code: "SHIPMENT_LATE_ARRIVAL",
        severity: "CRITICAL",
        blocksRecommendation: false,
        message:
          "Đặt thêm cũng không kịp. Cần liên hệ NCC giục giao sớm lô đang về, hoặc tìm nguồn thay thế.",
      },
    ],
    status: "PENDING",
  },
  {
    itemId: 5,
    productId: 255,
    productCode: "LDD",
    productName: "Gấu Lermao - Mứt Lựu 1kg (12 Túi/Thùng)",
    unit: "Túi",
    packSize: 12,
    parentName: "Trong nước",
    middleName: "Việt Nam",
    childName: "Mứt - Sốt",
    tradeMarkId: 2,
    tradeMarkName: "Gấu Lermao",
    supplierId: 8,
    supplierName: "Lermao",
    leadTimeDays: 7,
    leadTimeSource: "CATEGORY",
    priority: "MEDIUM",
    priorityRank: 3,
    reliability: "RELIABLE",
    physicalStock: 4101,
    reservedStock: 320,
    availableStock: 3781,
    incomingTotal: 0,
    forecastDailyDemand: 79.4,
    confidence: "HIGH",
    ma30: 88.93,
    ma60: 81.78,
    ma90: 79.4,
    trendRatio: 1.12,
    daysOfSupply: 47.6,
    daysUntilStockout: 48,
    projectedStockoutDate: iso(48),
    urgencyRatio: 6.86,
    reorderPoint: 1111.6,
    inventoryPosition: 3781,
    reorderGap: -2669.4,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: 0,
    estimatedUnitPrice: 92000,
    estimatedValue: 0,
    summaryText: "Còn 48 ngày · Tồn kho trên ngưỡng an toàn · Chưa cần đặt",
    flags: [],
    status: "PENDING",
  },
  {
    itemId: 6,
    productId: 390,
    productCode: "SP000390",
    productName: "Trân châu đen Hoàng Kim 1kg (20 gói/thùng)",
    unit: "Gói",
    packSize: 20,
    parentName: "Trong nước",
    middleName: "Việt Nam",
    childName: "Trân châu",
    tradeMarkId: null,
    tradeMarkName: null,
    supplierId: null,
    supplierName: null,
    leadTimeDays: 30,
    leadTimeSource: "GLOBAL",
    priority: "NO_DATA",
    priorityRank: 7,
    reliability: "BLOCKED",
    physicalStock: -350,
    reservedStock: 0,
    availableStock: -350,
    incomingTotal: 0,
    forecastDailyDemand: 0,
    confidence: "NO_DATA",
    ma30: 0.0,
    ma60: 0.0,
    ma90: 0.0,
    trendRatio: null,
    daysOfSupply: null,
    daysUntilStockout: null,
    projectedStockoutDate: null,
    urgencyRatio: null,
    reorderPoint: 0,
    inventoryPosition: -350,
    reorderGap: 350,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: null,
    estimatedUnitPrice: null,
    estimatedValue: null,
    summaryText: "Dữ liệu tồn kho có vấn đề — cần kiểm kê trước khi đặt hàng",
    flags: [
      {
        code: "NEGATIVE_INVENTORY",
        severity: "CRITICAL",
        blocksRecommendation: true,
        message: "Tồn kho âm tại Kho Sài Gòn (−350). Cần kiểm kê để xác định lại.",
        context: { branchName: "Kho Sài Gòn", onHand: -350 },
      },
      {
        code: "MISSING_SUPPLIER",
        severity: "HIGH",
        blocksRecommendation: false,
        message: "Sản phẩm chưa gắn nhà cung cấp — không tạo được phiếu đặt hàng.",
      },
    ],
    status: "BLOCKED",
  },
  {
    itemId: 7,
    productId: 736,
    productCode: "SP000736",
    productName: "Siro Nhiệt Đới Binbaoli 1000ml (10 chai/thùng)",
    unit: "Chai",
    packSize: 10,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Siro",
    tradeMarkId: 3,
    tradeMarkName: "Binbaoli",
    supplierId: 12,
    supplierName: "Honghe",
    leadTimeDays: 45,
    leadTimeSource: "SUPPLIER",
    priority: "OVERSTOCK",
    priorityRank: 6,
    reliability: "RELIABLE",
    physicalStock: 14928,
    reservedStock: 200,
    availableStock: 14728,
    incomingTotal: 0,
    forecastDailyDemand: 12.03,
    confidence: "HIGH",
    ma30: 13.47,
    ma60: 12.39,
    ma90: 12.03,
    trendRatio: 1.12,
    daysOfSupply: 1224.3,
    daysUntilStockout: null,
    projectedStockoutDate: null,
    urgencyRatio: null,
    reorderPoint: 794,
    inventoryPosition: 14728,
    reorderGap: -13934,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: 0,
    estimatedUnitPrice: 68000,
    estimatedValue: 0,
    summaryText:
      "Tồn kho đủ dùng hơn 1.200 ngày — TỒN DƯ. Nên xem xét đẩy bán, kiểm tra hạn dùng",
    flags: [
      {
        code: "OVERSTOCK",
        severity: "MEDIUM",
        blocksRecommendation: false,
        message:
          "Tồn kho vượt ngưỡng 180 ngày. Vốn đọng ước tính 1,01 tỷ. Cần kiểm tra hạn sử dụng.",
      },
    ],
    status: "PENDING",
  },
  {
    itemId: 8,
    productId: 7535,
    productCode: "SP007535",
    productName: "Bột sữa Binbaoli (túi giấy) 1kg (25 túi/thùng)",
    unit: "Túi",
    packSize: 25,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Bột pha chế",
    tradeMarkId: 3,
    tradeMarkName: "Binbaoli",
    supplierId: 12,
    supplierName: "Honghe",
    leadTimeDays: 45,
    leadTimeSource: "DERIVED",
    priority: "HEALTHY",
    priorityRank: 5,
    reliability: "RELIABLE",
    physicalStock: 5000,
    reservedStock: 150,
    availableStock: 4850,
    incomingTotal: 600,
    forecastDailyDemand: 46.4,
    confidence: "HIGH",
    ma30: 51.97,
    ma60: 47.79,
    ma90: 46.4,
    trendRatio: 1.12,
    daysOfSupply: 104.5,
    daysUntilStockout: 105,
    projectedStockoutDate: iso(105),
    urgencyRatio: 2.33,
    reorderPoint: 3062.4,
    inventoryPosition: 5450,
    reorderGap: -2387.6,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: 0,
    estimatedUnitPrice: 78000,
    estimatedValue: 0,
    summaryText: "Còn 105 ngày · Tồn kho lành mạnh · Không cần hành động",
    flags: [],
    status: "PENDING",
  },
  {
    itemId: 9,
    productId: 7539,
    productCode: "SP007539",
    productName: "Sốt Boduo Dưa Lưới 1.3kg (12 hộp/thùng)",
    unit: "Hộp",
    packSize: 12,
    parentName: "Trong nước",
    middleName: "Việt Nam",
    childName: "Mứt - Sốt",
    tradeMarkId: 4,
    tradeMarkName: "Boduo",
    supplierId: 3,
    supplierName: "Boduo Việt Nam",
    leadTimeDays: 7,
    leadTimeSource: "CATEGORY",
    priority: "LOW",
    priorityRank: 4,
    reliability: "CAUTION",
    physicalStock: 240,
    reservedStock: 24,
    availableStock: 216,
    incomingTotal: 0,
    forecastDailyDemand: 15.0,
    confidence: "LOW",
    ma30: 16.8,
    ma60: 15.45,
    ma90: 15.0,
    trendRatio: 1.12,
    daysOfSupply: 14.4,
    daysUntilStockout: 15,
    projectedStockoutDate: iso(15),
    urgencyRatio: 2.14,
    reorderPoint: 210,
    inventoryPosition: 216,
    reorderGap: -6,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: 0,
    estimatedUnitPrice: 51000,
    estimatedValue: 0,
    summaryText: "Còn 15 ngày · Sát ngưỡng đặt hàng · Nên theo dõi sát",
    flags: [
      {
        code: "LOW_CONFIDENCE_FORECAST",
        severity: "MEDIUM",
        blocksRecommendation: false,
        message:
          "Chỉ có 42 ngày dữ liệu bán hàng. Dự báo mang tính tham khảo.",
      },
    ],
    status: "PENDING",
  },
  {
    itemId: 10,
    productId: 7450,
    productCode: "SP007450",
    productName: "Trà Ô Long Binbaoli (Túi Giấy) 500gr (40 gói/thùng)",
    unit: "Gói",
    packSize: 40,
    parentName: "Nhập khẩu",
    middleName: "Trung Quốc",
    childName: "Trà",
    tradeMarkId: 3,
    tradeMarkName: "Binbaoli",
    supplierId: 12,
    supplierName: "Honghe",
    leadTimeDays: 45,
    leadTimeSource: "SUPPLIER",
    priority: "HIGH",
    priorityRank: 2,
    reliability: "RELIABLE",
    physicalStock: 148,
    reservedStock: 40,
    availableStock: 108,
    incomingTotal: 1200,
    forecastDailyDemand: 2.1,
    confidence: "MEDIUM",
    ma30: 2.35,
    ma60: 2.16,
    ma90: 2.1,
    trendRatio: 1.119,
    daysOfSupply: 51.4,
    daysUntilStockout: 52,
    projectedStockoutDate: iso(52),
    urgencyRatio: 1.16,
    reorderPoint: 138.6,
    inventoryPosition: 1308,
    reorderGap: -1169.4,
    needsOrder: false,
    suggestedQuantity: 0,
    suggestedPackCount: 0,
    estimatedUnitPrice: 118000,
    estimatedValue: 0,
    summaryText:
      "Hết sau 52 ngày · Lô 1.200 đang về (ETA 20 ngày) → về kịp, an toàn",
    flags: [],
    status: "PENDING",
  },
];

// Bảng tra chi tiết (chỉ 3 SKU có trace đầy đủ, còn lại dựng từ list item)
const detailTraceMap: Record<number, CalculationTrace> = {
  1: bpmkmTrace,
  2: matchaTrace,
  3: bcrtgTrace,
};

const detailExtraMap: Record<
  number,
  {
    branches: BranchStock[];
    shipments: IncomingShipmentInfo[];
    forecast: ForecastComparison;
  }
> = {
  1: {
    branches: bpmkmBranches,
    shipments: bpmkmShipments,
    forecast: bpmkmForecast,
  },
  2: {
    branches: matchaTrace.inputs.inventory.branches,
    shipments: [],
    forecast: matchaForecast,
  },
  3: { branches: bcrtgBranches, shipments: [], forecast: bcrtgForecast },
};

// ═══════════════════════════════════════════════════════════════════════════
// SINH THÊM SKU ĐỂ ĐỦ 50 — phục vụ review bảng tổng hợp
// Dữ liệu sinh có quy luật (deterministic) để lần render nào cũng giống nhau.
// ═══════════════════════════════════════════════════════════════════════════

const SUPPLIERS: [number, string, number][] = [
  [12, "Honghe", 45],
  [5, "Amo Pastel", 45],
  [8, "Lermao", 7],
  [3, "Boduo Việt Nam", 7],
  [17, "Trà Phượng Hoàng", 30],
  [21, "Hi Sweetie OEM", 30],
];

const CATEGORIES: [string, string, string, number, string][] = [
  ["Nhập khẩu", "Trung Quốc", "Bột pha chế", 3, "Binbaoli"],
  ["Nhập khẩu", "Trung Quốc", "Trà", 3, "Binbaoli"],
  ["Nhập khẩu", "Trung Quốc", "Siro", 1, "Amo Pastel"],
  ["Nhập khẩu", "Trung Quốc", "Sữa - Kem", 1, "Amo Pastel"],
  ["Trong nước", "Việt Nam", "Mứt - Sốt", 2, "Gấu Lermao"],
  ["Trong nước", "Việt Nam", "Trân châu", 2, "Gấu Lermao"],
  ["Trong nước", "Việt Nam", "Topping", 4, "Boduo"],
  ["Sản xuất", "Việt Nam", "Trà", 5, "Trà Phượng Hoàng"],
];

const PRODUCT_NAMES = [
  "Bột sữa béo",
  "Trà Ô Long",
  "Hồng trà",
  "Siro đào",
  "Siro vải",
  "Mứt dâu",
  "Mứt xoài",
  "Trân châu trắng",
  "Trân châu đen",
  "Kem cheese",
  "Sữa đặc",
  "Bột kem béo",
  "Trà nhài",
  "Siro bạc hà",
  "Mứt việt quất",
  "Thạch dừa",
  "Bột matcha",
  "Bột socola",
  "Siro caramel",
  "Kem tươi",
];

const SIZES = ["500gr", "1kg", "1.3kg", "2.5kg", "1 lít", "3kg"];
const UNITS = ["Gói", "Chai", "Hộp", "Túi", "Can"];

/** Sinh SKU giả lập theo chỉ số, phân bố đều qua 7 mức ưu tiên */
function generateSku(idx: number): RecommendationListItem {
  const sup = SUPPLIERS[idx % SUPPLIERS.length];
  const cat = CATEGORIES[idx % CATEGORIES.length];
  const nameBase = PRODUCT_NAMES[idx % PRODUCT_NAMES.length];
  const size = SIZES[idx % SIZES.length];
  const unit = UNITS[idx % UNITS.length];
  const packSize = [10, 12, 20, 24, 25, 40][idx % 6];

  const itemId = 100 + idx;
  const code = `SP${String(7600 + idx * 3).padStart(6, "0")}`;

  // Phân bố mức ưu tiên: tạo đủ mẫu cho mọi nhóm
  const bucket = idx % 10;
  let priority: PriorityLevel;
  if (bucket <= 1) priority = "CRITICAL";
  else if (bucket <= 3) priority = "HIGH";
  else if (bucket <= 5) priority = "MEDIUM";
  else if (bucket === 6) priority = "LOW";
  else if (bucket === 7) priority = "HEALTHY";
  else if (bucket === 8) priority = "OVERSTOCK";
  else priority = "NO_DATA";

  const isNoData = priority === "NO_DATA";
  const fdd = isNoData ? 0 : Number((2 + ((idx * 7) % 60) + idx / 10).toFixed(2));
  const leadTime = sup[2];

  // Tồn kho suy ra từ mức ưu tiên để con số nhất quán với nhãn
  const dosTarget =
    priority === "CRITICAL"
      ? leadTime * 0.4
      : priority === "HIGH"
        ? leadTime * 1.15
        : priority === "MEDIUM"
          ? leadTime * 1.6
          : priority === "LOW"
            ? leadTime * 2.5
            : priority === "HEALTHY"
              ? leadTime * 4
              : priority === "OVERSTOCK"
                ? 200
                : 0;

  const available = isNoData ? 0 : Math.round(fdd * dosTarget);
  const reserved = isNoData ? 0 : Math.round(available * 0.06);
  const physical = available + reserved;
  const incoming = idx % 4 === 0 && !isNoData ? Math.round(fdd * 30) : 0;

  const safetyDays = leadTime >= 30 ? 21 : 7;
  const coverageDays = leadTime >= 30 ? 30 : 14;
  const reorderPoint = Number((fdd * (leadTime + safetyDays)).toFixed(2));
  const inventoryPosition = available + incoming;
  const reorderGap = Number((reorderPoint - inventoryPosition).toFixed(2));
  const needsOrder = reorderGap > 0;

  const daysOfSupply = fdd > 0 ? Number((available / fdd).toFixed(1)) : null;
  const daysUntilStockout = daysOfSupply === null ? null : Math.round(daysOfSupply);
  const urgencyRatio =
    daysUntilStockout === null
      ? null
      : Number((daysUntilStockout / leadTime).toFixed(2));

  let suggested = 0;
  if (needsOrder) {
    const target = fdd * (leadTime + safetyDays + coverageDays);
    const raw = target - available - incoming;
    suggested = Math.max(0, Math.ceil(raw / packSize) * packSize);
  }

  const unitPrice = 20000 + ((idx * 8123) % 130000);

  const flags: DataQualityFlag[] = [];
  if (isNoData) {
    flags.push({
      code: "MISSING_FORECAST",
      severity: "CRITICAL",
      blocksRecommendation: true,
      message:
        "Không đủ dữ liệu bán hàng để dự báo (dưới 14 ngày có giao dịch).",
    });
  }
  if (priority === "OVERSTOCK") {
    flags.push({
      code: "OVERSTOCK",
      severity: "MEDIUM",
      blocksRecommendation: false,
      message: "Tồn kho vượt ngưỡng 180 ngày. Cần kiểm tra hạn sử dụng.",
    });
  }
  if (idx % 9 === 0 && !isNoData) {
    flags.push({
      code: "MISSING_LEADTIME",
      severity: "HIGH",
      blocksRecommendation: false,
      message:
        "Chưa cấu hình thời gian giao hàng cho NCC này — đang dùng giá trị mặc định.",
    });
  }
  if (idx % 11 === 0 && !isNoData) {
    flags.push({
      code: "LOW_CONFIDENCE_FORECAST",
      severity: "MEDIUM",
      blocksRecommendation: false,
      message: "Dữ liệu bán hàng ít, dự báo mang tính tham khảo.",
    });
  }

  const confidence: ConfidenceLevel = isNoData
    ? "NO_DATA"
    : idx % 11 === 0
      ? "LOW"
      : idx % 5 === 0
        ? "MEDIUM"
        : "HIGH";

  const reliability: ReliabilityLevel = isNoData
    ? "BLOCKED"
    : flags.some((f) => f.severity === "HIGH")
      ? "UNRELIABLE"
      : flags.length > 0
        ? "CAUTION"
        : "RELIABLE";

  const ma90 = fdd;
  const ma60 = Number((fdd * (1 + ((idx % 7) - 3) / 100)).toFixed(2));
  const ma30 = Number((fdd * (1 + ((idx % 11) - 4) / 50)).toFixed(2));

  const summary = isNoData
    ? "Không đủ dữ liệu để dự báo — cần kiểm tra lịch sử bán hàng"
    : priority === "CRITICAL"
      ? `Hết sau ${daysUntilStockout} ngày · Đặt hôm nay về sau ${leadTime} ngày → KHÔNG KỊP`
      : priority === "HIGH"
        ? `Hết sau ${daysUntilStockout} ngày · Đặt ngay hôm nay mới kịp`
        : priority === "MEDIUM"
          ? `Còn ${daysUntilStockout} ngày · Đã chạm ngưỡng, đưa vào đợt đặt gần nhất`
          : priority === "OVERSTOCK"
            ? `Tồn đủ dùng ${daysOfSupply} ngày — TỒN DƯ, nên đẩy bán`
            : `Còn ${daysUntilStockout} ngày · Tồn kho trên ngưỡng an toàn`;

  return {
    itemId,
    productId: 2000 + idx,
    productCode: code,
    productName: `${nameBase} ${cat[4]} ${size} (${packSize} ${unit.toLowerCase()}/thùng)`,
    unit,
    packSize,
    parentName: cat[0],
    middleName: cat[1],
    childName: cat[2],
    tradeMarkId: cat[3],
    tradeMarkName: cat[4],
    supplierId: sup[0],
    supplierName: sup[1],
    leadTimeDays: leadTime,
    leadTimeSource: idx % 6 === 0 ? "DERIVED" : "SUPPLIER",
    priority,
    priorityRank: PRIORITY_RANK[priority],
    reliability,
    physicalStock: physical,
    reservedStock: reserved,
    availableStock: available,
    incomingTotal: incoming,
    forecastDailyDemand: fdd,
    confidence,
    ma30: isNoData ? null : ma30,
    ma60: isNoData ? null : ma60,
    ma90: isNoData ? null : ma90,
    trendRatio: isNoData || ma90 === 0 ? null : Number((ma30 / ma90).toFixed(3)),
    daysOfSupply,
    daysUntilStockout,
    projectedStockoutDate:
      daysUntilStockout === null ? null : iso(daysUntilStockout),
    urgencyRatio,
    reorderPoint,
    inventoryPosition,
    reorderGap,
    needsOrder,
    suggestedQuantity: suggested,
    suggestedPackCount: suggested > 0 ? suggested / packSize : 0,
    estimatedUnitPrice: unitPrice,
    estimatedValue: suggested > 0 ? suggested * unitPrice : 0,
    summaryText: summary,
    flags,
    status: isNoData ? "BLOCKED" : "PENDING",
  };
}

const generatedItems: RecommendationListItem[] = Array.from(
  { length: 40 },
  (_, i) => generateSku(i)
);

export const MOCK_ITEMS: RecommendationListItem[] = [
  ...baseItems,
  ...generatedItems,
];

/** Dựng chi tiết cho 1 item — SKU chưa có trace sẵn thì sinh trace tối giản */
export function buildMockDetail(itemId: number): RecommendationDetail | null {
  const item = MOCK_ITEMS.find((i) => i.itemId === itemId);
  if (!item) return null;

  const extra = detailExtraMap[itemId];
  const branches: BranchStock[] = extra?.branches ?? [
    {
      branchId: 1,
      branchName: "Kho Sài Gòn",
      branchCode: "KHO_SG",
      onHand: Math.round(item.physicalStock * 0.7),
    },
    {
      branchId: 6,
      branchName: "Kho Hà Nội",
      branchCode: "KHO_HN",
      onHand: item.physicalStock - Math.round(item.physicalStock * 0.7),
    },
  ];

  const forecast: ForecastComparison = extra?.forecast ?? {
    used: item.forecastDailyDemand,
    windowUsed: 90,
    ma30: item.forecastDailyDemand * 1.05,
    ma60: item.forecastDailyDemand * 1.02,
    ma90: item.forecastDailyDemand,
    trendRatio: 1.05,
    totalDemand: item.forecastDailyDemand * 90,
    validDays: 90,
    windowDays: 90,
    stockoutDaysExcluded: 0,
    growthFactor: 1,
    demandSource: "INVOICE_DETAIL",
  };

  const shipments: IncomingShipmentInfo[] =
    extra?.shipments ??
    (item.incomingTotal > 0
      ? [
          {
            orderSupplierId: 900 + itemId,
            orderCode: `PDN-2026-0${900 + itemId}`,
            supplierName: item.supplierName,
            quantity: item.incomingTotal,
            eta: iso(20),
            etaType: "ESTIMATED",
          },
        ]
      : []);

  const safetyDays = item.leadTimeDays >= 30 ? 21 : 7;
  const coverageDays = item.leadTimeDays >= 30 ? 30 : 14;
  const leadTimeDemand = item.forecastDailyDemand * item.leadTimeDays;
  const safetyBuffer = item.forecastDailyDemand * safetyDays;

  const trace: CalculationTrace = detailTraceMap[itemId] ?? {
    version: "1.0",
    computedAt: new Date().toISOString(),
    inputs: {
      config: {
        leadTimeDays: {
          value: item.leadTimeDays,
          source: item.leadTimeSource,
          label: item.supplierName ?? "Mặc định",
        },
        safetyDays: { value: safetyDays, source: "CATEGORY", label: "Nhóm hàng" },
        coverageDays: {
          value: coverageDays,
          source: "CATEGORY",
          label: "Nhóm hàng",
        },
        growthFactor: { value: 1, source: "GLOBAL", label: "Mặc định" },
        packSize: {
          value: item.packSize,
          source: "PRODUCT",
          label: "Sản phẩm · Định lượng đóng gói",
        },
        moq: { value: 1, source: "GLOBAL", label: "Mặc định" },
      },
      inventory: {
        physical: item.physicalStock,
        reserved: item.reservedStock,
        available: item.availableStock,
        branches,
      },
      shipments,
      forecast,
    },
    steps: [
      {
        step: 1,
        name: "Nhu cầu trong thời gian chờ hàng",
        formula: "Forecast/ngày × Leadtime",
        values: {
          forecastDailyDemand: item.forecastDailyDemand,
          leadTimeDays: item.leadTimeDays,
        },
        result: Number(leadTimeDemand.toFixed(2)),
      },
      {
        step: 2,
        name: "Biên an toàn",
        formula: "Forecast/ngày × Số ngày dự phòng",
        values: {
          forecastDailyDemand: item.forecastDailyDemand,
          safetyDays,
        },
        result: Number(safetyBuffer.toFixed(2)),
      },
      {
        step: 3,
        name: "Ngưỡng đặt hàng",
        formula: "Nhu cầu chờ hàng + Biên an toàn",
        values: {
          leadTimeDemand: Number(leadTimeDemand.toFixed(2)),
          safetyBuffer: Number(safetyBuffer.toFixed(2)),
        },
        result: item.reorderPoint,
      },
      {
        step: 4,
        name: "Vị thế tồn kho",
        formula: "Tồn khả dụng + Hàng đang về",
        values: {
          available: item.availableStock,
          incoming: item.incomingTotal,
        },
        result: item.inventoryPosition,
      },
      {
        step: 5,
        name: "Mức thiếu hụt",
        formula: "Ngưỡng đặt hàng − Vị thế tồn kho",
        values: {
          reorderPoint: item.reorderPoint,
          inventoryPosition: item.inventoryPosition,
        },
        result: item.reorderGap,
        note: item.needsOrder ? "Dương → cần đặt hàng" : "Âm → chưa cần đặt",
      },
    ],
    result: {
      reorderPoint: item.reorderPoint,
      inventoryPosition: item.inventoryPosition,
      reorderGap: item.reorderGap,
      suggestedQuantity: item.suggestedQuantity,
      priority: item.priority,
    },
    flags: item.flags,
  };

  return {
    ...item,
    safetyDays,
    coverageDays,
    leadTimeDemand: Number(leadTimeDemand.toFixed(2)),
    safetyBuffer: Number(safetyBuffer.toFixed(2)),
    soqRaw: item.suggestedQuantity > 0 ? item.suggestedQuantity * 0.98 : 0,
    moqApplied: null,
    branchBreakdown: branches,
    shipments,
    forecastComparison: forecast,
    calculationTrace: trace,
    snapshotDate: iso(0),
  };
}

/** Đếm số item theo từng mức ưu tiên */
export function buildMockCounts(): Record<PriorityLevel, number> {
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    HEALTHY: 0,
    OVERSTOCK: 0,
    NO_DATA: 0,
  } as Record<PriorityLevel, number>;
  for (const i of MOCK_ITEMS) counts[i.priority]++;
  return counts;
}

const mockEntities: Record<Exclude<PurchasingConfigScope, "GLOBAL">, Array<{
  id: number;
  code?: string;
  name: string;
}>> = {
  CATEGORY: [
    { id: 1, name: "Bột pha chế" },
    { id: 2, name: "Trà" },
  ],
  SUPPLIER: SUPPLIERS.map(([id, name]) => ({ id, name })),
  SKU: MOCK_ITEMS.slice(0, 12).map((item) => ({
    id: item.productId,
    code: item.productCode,
    name: item.productName,
  })),
};

let mockConfigs: PurchasingConfigGroup[] = [
  {
    id: "GLOBAL",
    scopeType: "GLOBAL",
    scopeId: null,
    entity: null,
    overrides: {
      coverageDays: 30,
    },
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "CATEGORY:1",
    scopeType: "CATEGORY",
    scopeId: 1,
    entity: mockEntities.CATEGORY[0],
    overrides: { coverageDays: 21 },
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "SUPPLIER:12",
    scopeType: "SUPPLIER",
    scopeId: 12,
    entity: mockEntities.SUPPLIER[0],
    overrides: { coverageDays: 45 },
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: `SKU:${mockEntities.SKU[0].id}`,
    scopeType: "SKU",
    scopeId: mockEntities.SKU[0].id,
    entity: mockEntities.SKU[0],
    overrides: { coverageDays: 60 },
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
];

export async function mockGetConfigs(): Promise<PurchasingConfigListResponse> {
  await delay(150);
  return { groups: mockConfigs };
}

export async function mockGetResolvedConfig(
  params: ResolvedPurchasingConfigQuery
): Promise<ResolvedPurchasingConfig> {
  await delay(120);
  const [scopeType, scopeId] = params.skuId !== undefined
    ? ["SKU", params.skuId] as const
    : params.supplierId !== undefined
      ? ["SUPPLIER", params.supplierId] as const
      : params.categoryId !== undefined
        ? ["CATEGORY", params.categoryId] as const
        : ["GLOBAL", undefined] as const;
  const global = mockConfigs.find((config) => config.scopeType === "GLOBAL")!;
  const current = mockConfigs.find(
    (config) =>
      config.scopeType === scopeType &&
      (scopeType === "GLOBAL" || config.scopeId === scopeId)
  );
  const entity =
    scopeType === "GLOBAL"
      ? null
      : mockEntities[scopeType].find((item) => item.id === scopeId) ??
        current?.entity ??
        null;

  const fields = {} as ResolvedPurchasingConfig["fields"];
  for (const field of PURCHASING_CONFIG_FIELDS) {
    const raw = current?.overrides[field];
    fields[field] = {
      value: raw ?? global.overrides[field] ?? 0,
      source: raw !== undefined ? scopeType : "GLOBAL",
      sourceLabel: raw !== undefined ? entity?.name ?? "Toàn hệ thống" : "Toàn hệ thống",
      inherited: raw === undefined,
    };
  }
  return {
    scopeType,
    scopeId: scopeId ?? null,
    entity,
    configId: current?.id ?? null,
    overrides: current?.overrides ?? {},
    fields,
  };
}

export async function mockCreateConfig(
  data: CreatePurchasingConfigRequest
): Promise<PurchasingConfigGroup> {
  const entity =
    data.scopeType === "GLOBAL"
      ? null
      : mockEntities[data.scopeType].find((item) => item.id === data.scopeId) ?? null;
  const overrides = Object.fromEntries(
    PURCHASING_CONFIG_FIELDS.flatMap((field) =>
      data[field] === undefined ? [] : [[field, data[field]]]
    )
  );
  const config: PurchasingConfigGroup = {
    id: data.scopeType === "GLOBAL" ? "GLOBAL" : `${data.scopeType}:${data.scopeId}`,
    scopeType: data.scopeType,
    scopeId: data.scopeId ?? null,
    entity,
    overrides,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };
  mockConfigs = [...mockConfigs, config];
  return config;
}

export async function mockUpdateConfig(
  configId: string,
  data: PurchasingConfigPatch
): Promise<PurchasingConfigGroup> {
  const current = mockConfigs.find((config) => config.id === configId);
  if (!current) throw new Error("Không tìm thấy cấu hình");
  const overrides = { ...current.overrides };
  for (const field of PURCHASING_CONFIG_FIELDS) {
    if (!(field in data)) continue;
    if (data[field] === null) delete overrides[field];
    else if (data[field] !== undefined) overrides[field] = data[field];
  }
  const updated: PurchasingConfigGroup = {
    ...current,
    overrides,
    updatedAt: new Date().toISOString(),
  };
  mockConfigs = mockConfigs.map((config) =>
    config.id === configId ? updated : config
  );
  return updated;
}

export async function mockDeleteConfig(configId: string): Promise<void> {
  mockConfigs = mockConfigs.filter((config) => config.id !== configId);
}
