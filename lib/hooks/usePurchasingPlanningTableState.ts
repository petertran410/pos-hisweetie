"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PRIORITY_ORDER,
  type ConfidenceLevel,
  type PriorityLevel,
  type RecommendationFilters,
  type RecommendationItemStatus,
  type RecommendationSortBy,
  type ReliabilityLevel,
} from "@/lib/types/purchasing-planning";

/**
 * Ghi nhớ bộ lọc của bảng "Dự kiến đặt hàng" trên máy người dùng.
 *
 * Theo convention của các sidebar khác trong dự án (OrdersSidebar,
 * InvoicesSidebar): đọc bằng lazy initializer, ghi bằng useEffect.
 *
 * Nguyên tắc chống hỏng dữ liệu cũ: state đã lưu KHÔNG được tin tưởng.
 * Mọi giá trị đọc lên đều đi qua whitelist key + kiểm tra kiểu, giá trị nào
 * sai thì bỏ qua chứ không làm hỏng cả bộ lọc. Nhờ vậy khi thêm/bớt filter
 * trong code, cấu hình cũ trong localStorage vẫn an toàn.
 */
const STORAGE_KEY = "san-pham-du-kien-dat-hang-filters";

const PRIORITY_VALUES = new Set<string>(PRIORITY_ORDER);

const RELIABILITY_VALUES = new Set<string>([
  "RELIABLE",
  "CAUTION",
  "UNRELIABLE",
  "BLOCKED",
]);

const CONFIDENCE_VALUES = new Set<string>([
  "HIGH",
  "MEDIUM",
  "LOW",
  "VERY_LOW",
  "NO_DATA",
]);

const STATUS_VALUES = new Set<string>([
  "PENDING",
  "APPROVED",
  "ADJUSTED",
  "REJECTED",
  "ORDERED",
  "SUPERSEDED",
  "BLOCKED",
]);

const SORT_BY_VALUES = new Set<string>([
  "priority",
  "stockout",
  "value",
  "gap",
  "code",
  "name",
  "supplier",
  "stock",
  "available",
  "incoming",
  "forecast",
  "dos",
  "rop",
  "position",
  "soq",
  "leadtime",
]);

/** Bộ lọc mặc định khi chưa có gì được lưu */
export const DEFAULT_PP_FILTERS: RecommendationFilters = {
  needsOrderOnly: true,
  page: 1,
  limit: 50,
  sortBy: "priority",
};

// ── Các hàm ép kiểu an toàn ──

const asBool = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;

const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const asString = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

/** Mảng chuỗi, chỉ giữ phần tử nằm trong tập hợp lệ (nếu có truyền vào) */
const asStringArray = (v: unknown, allowed?: Set<string>) => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter(
    (x): x is string =>
      typeof x === "string" && (!allowed || allowed.has(x))
  );
  return out.length ? out : undefined;
};

const asNumberArray = (v: unknown) => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter(
    (x): x is number => typeof x === "number" && Number.isFinite(x)
  );
  return out.length ? out : undefined;
};

/**
 * Lọc dữ liệu thô từ localStorage thành bộ lọc dùng được.
 * Trả về object rỗng nếu dữ liệu không phải object.
 */
function sanitizeFilters(raw: unknown): Partial<RecommendationFilters> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;

  const next: Partial<RecommendationFilters> = {};

  // ── Snapshot ──
  const date = asString(r.date);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = date;

  // ── Tìm kiếm ──
  const search = asString(r.search);
  if (search) next.search = search;

  // ── Mức độ ──
  const priority = asStringArray(r.priority, PRIORITY_VALUES);
  if (priority) next.priority = priority as PriorityLevel[];

  const reliability = asStringArray(r.reliability, RELIABILITY_VALUES);
  if (reliability) next.reliability = reliability as ReliabilityLevel[];

  const confidence = asStringArray(r.confidence, CONFIDENCE_VALUES);
  if (confidence) next.confidence = confidence as ConfidenceLevel[];

  // ── Phân loại hàng hoá ──
  // Tên nhóm hàng là dữ liệu tự do nên không whitelist được; nếu nhóm đã bị
  // xoá thì API chỉ trả về 0 dòng, không gây lỗi.
  const parentNames = asStringArray(r.parentNames);
  if (parentNames) next.parentNames = parentNames;

  const middleNames = asStringArray(r.middleNames);
  if (middleNames) next.middleNames = middleNames;

  const childNames = asStringArray(r.childNames);
  if (childNames) next.childNames = childNames;

  const tradeMarkIds = asNumberArray(r.tradeMarkIds);
  if (tradeMarkIds) next.tradeMarkIds = tradeMarkIds;

  const supplierIds = asNumberArray(r.supplierIds);
  if (supplierIds) next.supplierIds = supplierIds;

  // ── Ngưỡng số ──
  const numericKeys = [
    "daysUntilStockoutFrom",
    "daysUntilStockoutTo",
    "daysOfSupplyFrom",
    "daysOfSupplyTo",
    "estimatedValueFrom",
    "estimatedValueTo",
  ] as const;

  for (const key of numericKeys) {
    const v = asNumber(r[key]);
    if (v !== undefined) next[key] = v;
  }

  // ── Cảnh báo & trạng thái ──
  const hasFlags = asBool(r.hasFlags);
  if (hasFlags) next.hasFlags = hasFlags;

  const flagCodes = asStringArray(r.flagCodes);
  if (flagCodes) next.flagCodes = flagCodes;

  const isBlocked = asBool(r.isBlocked);
  if (isBlocked) next.isBlocked = isBlocked;

  const status = asString(r.status);
  if (status && STATUS_VALUES.has(status)) {
    next.status = status as RecommendationItemStatus;
  }

  const needsOrderOnly = asBool(r.needsOrderOnly);
  if (needsOrderOnly !== undefined) next.needsOrderOnly = needsOrderOnly;

  // ── Sắp xếp & kích thước trang ──
  const sortBy = asString(r.sortBy);
  if (sortBy && SORT_BY_VALUES.has(sortBy)) {
    next.sortBy = sortBy as RecommendationSortBy;
  }

  if (r.sortDir === "asc" || r.sortDir === "desc") next.sortDir = r.sortDir;

  const limit = asNumber(r.limit);
  if (limit !== undefined && limit > 0 && limit <= 500) next.limit = limit;

  return next;
}

/** Bỏ `page` trước khi lưu — mở lại trang luôn bắt đầu từ trang 1 */
function toPersistable(
  filters: RecommendationFilters
): Omit<RecommendationFilters, "page"> {
  const rest = { ...filters };
  delete rest.page;
  return rest;
}

/**
 * State bộ lọc của trang, tự khôi phục từ localStorage khi mở lại.
 *
 * @returns `[filters, updateFilters]` — `updateFilters` nhận patch từng phần
 *          giống cách trang đang dùng.
 */
export function usePurchasingPlanningFilters() {
  const [filters, setFilters] = useState<RecommendationFilters>(() => {
    if (typeof window === "undefined") return DEFAULT_PP_FILTERS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_PP_FILTERS;
      return {
        ...DEFAULT_PP_FILTERS,
        ...sanitizeFilters(JSON.parse(saved)),
        // Dữ liệu có thể đã đổi từ lần trước, trang cũ dễ rỗng → luôn về trang 1
        page: 1,
      };
    } catch {
      // JSON hỏng hoặc localStorage bị chặn (chế độ riêng tư)
      return DEFAULT_PP_FILTERS;
    }
  });

  // Bỏ qua lần ghi đầu tiên: state khi đó vừa đọc lên, ghi lại là thừa
  const skipFirstWrite = useRef(true);

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(toPersistable(filters))
      );
    } catch {
      // localStorage đầy hoặc bị chặn — vẫn dùng được trong phiên hiện tại
    }
  }, [filters]);

  const updateFilters = useCallback(
    (next: Partial<RecommendationFilters>) => {
      setFilters((prev) => ({ ...prev, ...next }));
    },
    []
  );

  return [filters, updateFilters] as const;
}
