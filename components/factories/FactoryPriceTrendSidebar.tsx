"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, RotateCcw } from "lucide-react";
import { MiniCalendar } from "@/components/shared/MiniCalendar";
import { useFactories } from "@/lib/hooks/useFactories";
import { useProducts } from "@/lib/hooks/useProducts";
import {
  PriceHistoryEventType,
  PriceHistorySeriesParams,
  PriceCurrencyMode,
} from "@/lib/api/factory-products";

export interface FactoryPriceTrendFilters extends PriceHistorySeriesParams {
  productId: number;
}

interface Props {
  filters: FactoryPriceTrendFilters;
  onChange: (filters: FactoryPriceTrendFilters) => void;
}

const datePresets = [
  ["30", "30 ngày"],
  ["90", "90 ngày"],
  ["365", "12 tháng"],
] as const;

function isoDate(date: Date, end = false) {
  const value = new Date(date);
  if (end) value.setHours(23, 59, 59, 999);
  return value.toISOString();
}

function getPresetRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: isoDate(from), to: isoDate(to, true) };
}

export function FactoryPriceTrendSidebar({ filters, onChange }: Props) {
  const [productSearch, setProductSearch] = useState("");
  const [factorySearch, setFactorySearch] = useState("");
  const [showFactories, setShowFactories] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>("90");
  const [openCalendar, setOpenCalendar] = useState<"from" | "to" | null>(null);
  const factoryPanelRef = useRef<HTMLDivElement>(null);
  const datePanelRef = useRef<HTMLDivElement>(null);
  const { data: productData, isLoading: productsLoading } = useProducts(
    { search: productSearch || undefined, page: 1, limit: 30, isActive: true },
    { silentForbidden: true }
  );
  const factoryData = useFactories({ includeInactive: false, limit: 500 });
  const factories = useMemo(() => factoryData?.data ?? [], [factoryData?.data]);
  const products = productData?.data ?? [];
  const selectedProduct = products.find((product) => product.id === filters.productId);
  const selectedFactoryIds = filters.factoryIds ?? [];
  const visibleFactories = useMemo(
    () =>
      factories.filter((factory) =>
        `${factory.code ?? ""} ${factory.name}`
          .toLowerCase()
          .includes(factorySearch.toLowerCase())
      ),
    [factories, factorySearch]
  );

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!factoryPanelRef.current?.contains(target)) {
        setShowFactories(false);
      }
      if (!datePanelRef.current?.contains(target)) {
        setOpenCalendar(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const update = (patch: Partial<FactoryPriceTrendFilters>) =>
    onChange({ ...filters, ...patch, page: 1 });

  const toggleFactory = (id: number) => {
    update({
      factoryIds: selectedFactoryIds.includes(id)
        ? selectedFactoryIds.filter((value) => value !== id)
        : [...selectedFactoryIds, id],
    });
  };

  const reset = () => {
    const range = getPresetRange(90);
    onChange({ productId: filters.productId, ...range, currencyMode: "vnd", page: 1, limit: 100 });
    setActivePreset("90");
    setOpenCalendar(null);
    setProductSearch("");
    setFactorySearch("");
  };

  return (
    <aside className="w-72 border m-4 rounded-xl custom-sidebar-scroll bg-white shadow-xl flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold text-gray-800">Biến động giá</h2>
        <button type="button" onClick={reset} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand" title="Đặt lại bộ lọc">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Sản phẩm</label>
          <input
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Tìm theo mã hoặc tên..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
          <div className="mt-2 max-h-44 overflow-y-auto border rounded-lg divide-y">
            {productsLoading ? (
              <div className="p-3 text-xs text-gray-400">Đang tìm sản phẩm...</div>
            ) : products.length === 0 ? (
              <div className="p-3 text-xs text-gray-400">Không tìm thấy sản phẩm</div>
            ) : (
              products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => update({ productId: product.id })}
                  className={`w-full text-left px-3 py-2 hover:bg-brand-soft ${product.id === filters.productId ? "bg-brand-soft text-brand-dark" : ""}`}>
                  <span className="block text-sm font-medium truncate">{product.name}</span>
                  <span className="block text-xs text-gray-500">{product.code}</span>
                </button>
              ))
            )}
          </div>
          {selectedProduct && (
            <div className="mt-2 text-xs text-brand-dark bg-brand-soft rounded-lg px-3 py-2">
              Đang xem: <strong>{selectedProduct.name}</strong>
            </div>
          )}
        </div>

        <div ref={factoryPanelRef} className="relative">
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nhà máy so sánh</label>
          <button type="button" onClick={() => setShowFactories((value) => !value)} className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm hover:border-brand">
            <span className="truncate">{selectedFactoryIds.length ? `${selectedFactoryIds.length} nhà máy đã chọn` : "Tất cả nhà máy"}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showFactories && (
            <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg p-2">
              <input value={factorySearch} onChange={(event) => setFactorySearch(event.target.value)} placeholder="Tìm nhà máy..." className="w-full border rounded px-2 py-1.5 text-xs mb-2" />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {visibleFactories.map((factory) => (
                  <label key={factory.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm cursor-pointer">
                    <input type="checkbox" checked={selectedFactoryIds.includes(factory.id)} onChange={() => toggleFactory(factory.id)} />
                    <span className="truncate">{factory.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Khoảng thời gian</label>
          <div className="grid grid-cols-3 gap-1.5">
            {datePresets.map(([days, label]) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setActivePreset(days);
                  update(getPresetRange(Number(days)));
                }}
                className={`px-2 py-1.5 rounded-lg border text-xs ${activePreset === days ? "border-brand bg-brand-soft text-brand-dark font-medium" : "border-gray-200 text-gray-600 hover:border-brand"}`}>
                {label}
              </button>
            ))}
          </div>
           <div ref={datePanelRef} className="grid grid-cols-2 gap-2 mt-2">
            {(["from", "to"] as const).map((field) => {
              const value = filters[field]?.slice(0, 10) ?? "";
              return (
                <div key={field} className="relative">
                  <label className="text-xs text-gray-500">
                    {field === "from" ? "Từ" : "Đến"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenCalendar((current) => current === field ? null : field)}
                    className="mt-1 w-full flex items-center justify-between border rounded px-2 py-1.5 text-xs text-left hover:border-brand">
                    <span>{value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "Chọn ngày"}</span>
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {openCalendar === field && (
                    <div className={`absolute z-30 top-full mt-1 w-64 ${field === "to" ? "right-0" : "left-0"}`}>
                      <MiniCalendar
                        value={value}
                        minDate={field === "to" ? filters.from?.slice(0, 10) : undefined}
                        onChange={(date) => {
                          setActivePreset(null);
                          update({
                            [field]: date
                              ? `${date}${field === "from" ? "T00:00:00.000Z" : "T23:59:59.999Z"}`
                              : undefined,
                          });
                        }}
                        onClose={() => setOpenCalendar(null)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500"><Calendar className="w-3.5 h-3.5" />Dữ liệu theo thời điểm ghi nhận</div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Đơn vị hiển thị</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(["vnd", "native"] as PriceCurrencyMode[]).map((mode) => <button key={mode} type="button" onClick={() => update({ currencyMode: mode })} className={`px-2 py-1.5 rounded-lg border text-xs ${filters.currencyMode === mode ? "border-brand bg-brand-soft text-brand-dark font-medium" : "border-gray-200 text-gray-600 hover:border-brand"}`}>{mode === "vnd" ? "VND quy đổi" : "Nguyên tệ"}</button>)}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Loại biến động</label>
          <select value={filters.eventType ?? ""} onChange={(event) => update({ eventType: (event.target.value || undefined) as PriceHistoryEventType | undefined })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả sự kiện</option>
            <option value="reference">Giá tham chiếu</option>
            <option value="purchase_order">Giá trên PĐN</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
