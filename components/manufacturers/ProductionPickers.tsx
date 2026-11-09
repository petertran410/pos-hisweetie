"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsApi, type Product } from "@/lib/api/products";
import { manufacturersApi } from "@/lib/api/manufacturers";
import { apiClient } from "@/lib/config/api";

const fieldClass = "w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-2 text-sm disabled:bg-gray-100";

export function ProductPicker({ value, label, onChange, disabled, branchId }: {
  value?: number | null; label?: string; onChange: (product: Product) => void; disabled?: boolean; branchId?: number;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const selected = useQuery({ queryKey: ["products", value], queryFn: () => productsApi.getProduct(value!), enabled: !!value });
  const results = useQuery({
    queryKey: ["external-product-picker", query, branchId],
    queryFn: () => productsApi.getAll({ search: query, types: [2, 4], limit: 30, branchId, isActive: true }),
    enabled: open,
  });
  return <div className="relative min-w-0">
    <input aria-label={label || "Sản phẩm"} className={fieldClass} disabled={disabled}
      value={open ? search : selected.data ? `${selected.data.code} - ${selected.data.name}` : ""}
      placeholder="Tìm mã hoặc tên sản phẩm" onFocus={() => { setOpen(true); setSearch(""); }}
      onChange={(event) => setSearch(event.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
    {open && <div className="absolute inset-x-0 top-full z-50 max-h-64 overflow-auto rounded border bg-white shadow-lg">
      {results.isLoading ? <div className="p-3 text-sm">Đang tải...</div> : results.isError ? <div className="p-3 text-sm text-red-600">Không tải được sản phẩm</div> :
        results.data?.data.filter((product) => [2, 4].includes(product.type)).map((product) =>
          <button type="button" key={product.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(product); setOpen(false); }}>
            {product.code} - {product.name}
          </button>)}
      {results.data?.data.length === 0 && <div className="p-3 text-sm text-gray-500">Không có sản phẩm</div>}
    </div>}
  </div>;
}

export function PartnerPicker({ value, label, onChange, manufacturer = false, disabled }: {
  value?: number | null; label: string; onChange: (id: number | null) => void; manufacturer?: boolean; disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setQuery(search), 250); return () => clearTimeout(timer); }, [search]);
  const selected = useQuery({
    queryKey: [manufacturer ? "manufacturer" : "supplier-picker", value],
    queryFn: () => apiClient.get<{ id: number; code?: string; name: string }>(`/${manufacturer ? "manufacturers" : "suppliers"}/${value}`),
    enabled: !!value,
  });
  const results = useQuery({
    queryKey: ["partner-picker", manufacturer, query],
    queryFn: () => manufacturer ? manufacturersApi.list({ search: query, pageSize: 30 }) : apiClient.get<{ data: Array<{ id: number; code?: string; name: string }> }>("/suppliers", { search: query, pageSize: 30 }),
    enabled: open,
  });
  return <div className="relative min-w-0">
    <input aria-label={label} className={fieldClass} disabled={disabled} placeholder={label}
      value={open ? search : selected.data ? `${selected.data.code || ""} - ${selected.data.name}` : ""}
      onFocus={() => { setOpen(true); setSearch(""); }} onChange={(event) => setSearch(event.target.value)}
      onBlur={() => setTimeout(() => setOpen(false), 150)} />
    {open && <div className="absolute inset-x-0 top-full z-50 max-h-64 overflow-auto rounded border bg-white shadow-lg">
      <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-500" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(null); setOpen(false); }}>Bỏ chọn</button>
      {results.data?.data.map((partner) => <button type="button" key={partner.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
        onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(partner.id); setOpen(false); }}>{partner.code} - {partner.name}</button>)}
      {results.isError && <div className="p-3 text-sm text-red-600">Không tải được đối tác</div>}
    </div>}
  </div>;
}
