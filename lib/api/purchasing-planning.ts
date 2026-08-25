/**
 * API Client — Module Purchasing Planning (Dự kiến đặt hàng)
 *
 * Tuân thủ contract ở `lib/types/purchasing-planning.ts`.
 *
 * Backend thật được dùng mặc định. Đặt NEXT_PUBLIC_PP_USE_MOCK=true khi cần
 * review giao diện bằng dữ liệu mẫu mà không sửa component.
 */
import { apiClient } from "@/lib/config/api";
import type {
  RecommendationDetail,
  RecommendationFilters,
  RecommendationListResponse,
  PurchasingConfigListResponse,
  PurchasingConfigGroup,
  ResolvedPurchasingConfig,
  ResolvedPurchasingConfigQuery,
  CreatePurchasingConfigRequest,
  PurchasingConfigPatch,
  PurchasingConfigScope,
  RunPurchasingCalculationResult,
} from "@/lib/types/purchasing-planning";
import { PURCHASING_CONFIG_FIELDS } from "@/lib/types/purchasing-planning";
import {
  MOCK_ITEMS,
  buildMockCounts,
  buildMockDetail,
  mockCreateConfig,
  mockDeleteConfig,
  mockGetConfigs,
  mockGetResolvedConfig,
  mockUpdateConfig,
} from "./purchasing-planning.mock";

/**
 * Backend thật là mặc định. Chỉ bật mock khi biến môi trường bằng đúng "true".
 */
const USE_MOCK = process.env.NEXT_PUBLIC_PP_USE_MOCK === "true";

const BASE = "/purchasing-planning";

type ConfigApiRecord = Record<string, unknown>;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asScope = (value: unknown): PurchasingConfigScope | undefined =>
  value === "GLOBAL" ||
  value === "CATEGORY" ||
  value === "SUPPLIER" ||
  value === "SKU"
    ? value
    : undefined;

function normalizeOverrides(record: ConfigApiRecord) {
  const nested = (record.overrides ?? record.raw) as ConfigApiRecord | undefined;
  return Object.fromEntries(
    PURCHASING_CONFIG_FIELDS.flatMap((field) => {
      const fieldRecord = record[field] as ConfigApiRecord | undefined;
      const value = asNumber(nested?.[field] ?? fieldRecord?.raw ?? record[field]);
      return value === undefined ? [] : [[field, value]];
    })
  );
}

function normalizeGroup(record: ConfigApiRecord): PurchasingConfigGroup {
  const scopeType = asScope(record.scopeType ?? record.scope) ?? "GLOBAL";
  const entity = record.entity as PurchasingConfigGroup["entity"] | undefined;
  const scopeId = asNumber(record.scopeId ?? entity?.id) ?? null;
  return {
    id: String(record.id ?? (scopeType === "GLOBAL" ? "GLOBAL" : `${scopeType}:${scopeId}`)),
    scopeType,
    scopeId,
    entity: entity ?? null,
    overrides: normalizeOverrides(record),
    isActive: record.isActive !== false,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

function normalizeResolved(record: ConfigApiRecord): ResolvedPurchasingConfig {
  const scopeType = asScope(record.scopeType ?? record.scope) ?? "GLOBAL";
  const entity = record.entity as ResolvedPurchasingConfig["entity"] | undefined;
  const scopeId = asNumber(record.scopeId ?? entity?.id) ?? null;
  const effective = record.effective as ConfigApiRecord | undefined;
  const sources = record.source as ConfigApiRecord | undefined;
  const responseFields = record.fields as
    | Partial<Record<string, ConfigApiRecord>>
    | undefined;
  const fields: ResolvedPurchasingConfig["fields"] = {};

  for (const field of PURCHASING_CONFIG_FIELDS) {
    const supplied = responseFields?.[field];
    const fieldRecord = record[field] as ConfigApiRecord | undefined;
    const sourceRecord = (fieldRecord?.source ?? supplied?.source) as
      | ConfigApiRecord
      | undefined;
    const value = asNumber(
      supplied?.value ??
        supplied?.effective ??
        fieldRecord?.effective ??
        effective?.[field] ??
        record[`${field}Effective`]
    );
    const source = asScope(
      sourceRecord?.scopeType ??
        supplied?.source ??
        fieldRecord?.source ??
        sources?.[field] ??
        record[`${field}Source`]
    );
    if (value === undefined || source === undefined) continue;
    fields[field] = {
      value,
      source,
      sourceLabel:
        typeof sourceRecord?.label === "string"
          ? String(sourceRecord.label)
          : typeof supplied?.sourceLabel === "string"
          ? String(supplied.sourceLabel)
          : typeof record[`${field}SourceLabel`] === "string"
            ? String(record[`${field}SourceLabel`])
            : source,
      inherited:
        typeof supplied?.inherited === "boolean"
          ? supplied.inherited
          : supplied?.current !== null && supplied?.current !== undefined
            ? false
          : normalizeOverrides(record)[field] === undefined,
    };
  }

  return {
    scopeType,
    scopeId,
    entity: entity ?? null,
    configId:
      typeof record.configId === "string"
        ? record.configId
        : typeof record.groupId === "string"
          ? record.groupId
        : typeof record.id === "string"
          ? record.id
          : null,
    overrides: normalizeOverrides(record),
    fields,
  };
}

/** Giả lập độ trễ mạng để UI hiển thị đúng trạng thái loading */
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// MOCK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

async function mockGetRecommendations(
  filters: RecommendationFilters = {}
): Promise<RecommendationListResponse> {
  await delay();

  let items = [...MOCK_ITEMS];

  // ── Mức độ ──
  if (filters.priority?.length) {
    items = items.filter((i) => filters.priority!.includes(i.priority));
  }
  if (filters.reliability?.length) {
    items = items.filter((i) => filters.reliability!.includes(i.reliability));
  }
  if (filters.confidence?.length) {
    items = items.filter((i) => filters.confidence!.includes(i.confidence));
  }

  // ── Phân loại hàng hoá ──
  if (filters.parentNames?.length) {
    items = items.filter(
      (i) => i.parentName && filters.parentNames!.includes(i.parentName)
    );
  }
  if (filters.middleNames?.length) {
    items = items.filter(
      (i) => i.middleName && filters.middleNames!.includes(i.middleName)
    );
  }
  if (filters.childNames?.length) {
    items = items.filter(
      (i) => i.childName && filters.childNames!.includes(i.childName)
    );
  }
  if (filters.tradeMarkIds?.length) {
    items = items.filter(
      (i) => i.tradeMarkId !== null && filters.tradeMarkIds!.includes(i.tradeMarkId)
    );
  }

  // ── Nhà cung cấp (hỗ trợ cả field cũ lẫn mới) ──
  if (filters.supplierIds?.length) {
    items = items.filter(
      (i) => i.supplierId !== null && filters.supplierIds!.includes(i.supplierId)
    );
  } else if (filters.supplierId) {
    items = items.filter((i) => i.supplierId === filters.supplierId);
  }

  // ── Ngưỡng số ──
  if (filters.daysUntilStockoutFrom !== undefined) {
    items = items.filter(
      (i) =>
        i.daysUntilStockout !== null &&
        i.daysUntilStockout >= filters.daysUntilStockoutFrom!
    );
  }
  if (filters.daysUntilStockoutTo !== undefined) {
    items = items.filter(
      (i) =>
        i.daysUntilStockout !== null &&
        i.daysUntilStockout <= filters.daysUntilStockoutTo!
    );
  }
  if (filters.daysOfSupplyFrom !== undefined) {
    items = items.filter(
      (i) => i.daysOfSupply !== null && i.daysOfSupply >= filters.daysOfSupplyFrom!
    );
  }
  if (filters.daysOfSupplyTo !== undefined) {
    items = items.filter(
      (i) => i.daysOfSupply !== null && i.daysOfSupply <= filters.daysOfSupplyTo!
    );
  }
  if (filters.estimatedValueFrom !== undefined) {
    items = items.filter(
      (i) => (i.estimatedValue ?? 0) >= filters.estimatedValueFrom!
    );
  }
  if (filters.estimatedValueTo !== undefined) {
    items = items.filter(
      (i) => (i.estimatedValue ?? 0) <= filters.estimatedValueTo!
    );
  }

  // ── Cảnh báo & trạng thái ──
  if (filters.hasFlags) {
    items = items.filter((i) => i.flags.length > 0);
  }
  if (filters.flagCodes?.length) {
    items = items.filter((i) =>
      i.flags.some((f) => filters.flagCodes!.includes(f.code))
    );
  }
  if (filters.isBlocked) {
    items = items.filter((i) =>
      i.flags.some((f) => f.blocksRecommendation)
    );
  }
  if (filters.status) {
    items = items.filter((i) => i.status === filters.status);
  }

  // ── Chỉ hiện SKU cần đặt ──
  if (filters.needsOrderOnly) {
    items = items.filter((i) => i.needsOrder);
  }

  // ── Tìm kiếm ──
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    items = items.filter(
      (i) =>
        i.productCode.toLowerCase().includes(q) ||
        i.productName.toLowerCase().includes(q)
    );
  }

  // ── Sắp xếp ──
  const dir = filters.sortDir === "desc" ? -1 : 1;
  const sortBy = filters.sortBy ?? "priority";
  const nullLast = (v: number | null) =>
    v === null ? Number.MAX_SAFE_INTEGER : v;

  items.sort((a, b) => {
    switch (sortBy) {
      case "stockout":
        return (nullLast(a.daysUntilStockout) - nullLast(b.daysUntilStockout)) * dir;
      case "value":
        return ((a.estimatedValue ?? 0) - (b.estimatedValue ?? 0)) * dir;
      case "gap":
        return (a.reorderGap - b.reorderGap) * dir;
      case "code":
        return a.productCode.localeCompare(b.productCode) * dir;
      case "name":
        return a.productName.localeCompare(b.productName) * dir;
      case "supplier":
        return (a.supplierName ?? "").localeCompare(b.supplierName ?? "") * dir;
      case "stock":
        return (a.physicalStock - b.physicalStock) * dir;
      case "available":
        return (a.availableStock - b.availableStock) * dir;
      case "incoming":
        return (a.incomingTotal - b.incomingTotal) * dir;
      case "forecast":
        return (a.forecastDailyDemand - b.forecastDailyDemand) * dir;
      case "dos":
        return (nullLast(a.daysOfSupply) - nullLast(b.daysOfSupply)) * dir;
      case "rop":
        return (a.reorderPoint - b.reorderPoint) * dir;
      case "position":
        return (a.inventoryPosition - b.inventoryPosition) * dir;
      case "soq":
        return (a.suggestedQuantity - b.suggestedQuantity) * dir;
      case "leadtime":
        return (a.leadTimeDays - b.leadTimeDays) * dir;
      case "priority":
      default: {
        if (a.priorityRank !== b.priorityRank) {
          return (a.priorityRank - b.priorityRank) * dir;
        }
        return nullLast(a.daysUntilStockout) - nullLast(b.daysUntilStockout);
      }
    }
  });

  const total = items.length;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 50;
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  const today = new Date().toISOString().slice(0, 10);

  // Đếm theo mức ưu tiên trên TẬP ĐÃ LỌC (trừ chính filter priority)
  // để người dùng thấy được phân bố trong phạm vi đang xem.
  return {
    items: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    meta: {
      snapshotDate: today,
      isStale: false,
      lastRunAt: new Date().toISOString(),
      counts: buildMockCounts(),
      totalEstimatedValue: items.reduce(
        (s, i) => s + (i.estimatedValue ?? 0),
        0
      ),
    },
  };
}

async function mockGetDetail(itemId: number): Promise<RecommendationDetail> {
  await delay(250);
  const detail = buildMockDetail(itemId);
  if (!detail) {
    const err = new Error("Không tìm thấy đề xuất") as Error & {
      status?: number;
    };
    err.status = 404;
    throw err;
  }
  return detail;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export const purchasingPlanningApi = {
  /** Trạng thái nguồn dữ liệu — hiển thị banner cảnh báo khi đang dùng mock */
  isMock: USE_MOCK,

  /**
   * GET /purchasing-planning/recommendations
   * Danh sách đề xuất đặt hàng, đã xếp theo mức ưu tiên.
   */
  getRecommendations: async (
    filters: RecommendationFilters = {}
  ): Promise<RecommendationListResponse> => {
    if (USE_MOCK) return mockGetRecommendations(filters);

    return apiClient.get<RecommendationListResponse>(
      `${BASE}/recommendations`,
      filters as Record<string, unknown>
    );
  },

  /** Chạy lại engine với tồn kho, đơn nhập và lịch sử bán hàng hiện tại. */
  runCalculation: async (): Promise<RunPurchasingCalculationResult> => {
    if (USE_MOCK) {
      throw new Error("Không thể chạy tính toán khi đang dùng dữ liệu mẫu");
    }
    return apiClient.post<RunPurchasingCalculationResult>(
      `${BASE}/calculations/run`,
      { runType: "MANUAL" }
    );
  },

  /**
   * GET /purchasing-planning/recommendations/:itemId
   * Chi tiết 1 SKU kèm toàn bộ quá trình tính (explainability).
   */
  getRecommendationDetail: async (
    itemId: number
  ): Promise<RecommendationDetail> => {
    if (USE_MOCK) return mockGetDetail(itemId);

    return apiClient.get<RecommendationDetail>(
      `${BASE}/recommendations/${itemId}`
    );
  },

  /** GET /purchasing-planning/configs */
  getConfigs: async (): Promise<PurchasingConfigListResponse> => {
    const response = USE_MOCK
      ? await mockGetConfigs()
      : await apiClient.get<{ groups: ConfigApiRecord[] }>(`${BASE}/configs`);
    return { groups: response.groups.map((group) => normalizeGroup(group as ConfigApiRecord)) };
  },

  /** GET /purchasing-planning/configs/resolved?skuId=123 */
  getResolvedConfig: async (
    params: ResolvedPurchasingConfigQuery
  ): Promise<ResolvedPurchasingConfig> => {
    const response = USE_MOCK
      ? await mockGetResolvedConfig(params)
      : await apiClient.get<ConfigApiRecord>(`${BASE}/configs/resolved`, params);
    return normalizeResolved(response as unknown as ConfigApiRecord);
  },

  /** POST tạo một group override, PATCH cập nhật batch 5 field. */
  saveConfig: async (
    configId: string | null,
    data: CreatePurchasingConfigRequest | PurchasingConfigPatch
  ): Promise<PurchasingConfigGroup> => {
    if (USE_MOCK) {
      return configId
        ? mockUpdateConfig(configId, data as PurchasingConfigPatch)
        : mockCreateConfig(data as CreatePurchasingConfigRequest);
    }
    return configId
      ? apiClient.patch(`${BASE}/configs/${configId}`, data)
      : apiClient.post(`${BASE}/configs`, data);
  },

  deleteConfig: async (configId: string): Promise<void> => {
    if (USE_MOCK) return mockDeleteConfig(configId);
    return apiClient.delete(`${BASE}/configs/${configId}`);
  },
};
