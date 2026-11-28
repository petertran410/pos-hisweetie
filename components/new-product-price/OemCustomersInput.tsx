"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { newProductPriceApi } from "@/lib/api/new-product-price";
import type { NppOemCustomer } from "@/lib/types/new-product-price";

/** Chọn khách OEM: ô tìm (gọi API) + danh sách chọn nhiều dùng chung FilterMultiSelect. */
export function OemCustomersInput({
  value,
  onChange,
}: {
  value: NppOemCustomer[];
  onChange: (list: NppOemCustomer[]) => void;
}) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const { data: found } = useQuery({
    queryKey: ["new-product-price-customers", q],
    queryFn: () => newProductPriceApi.customers(q),
    staleTime: 60_000,
  });

  const pool = new Map<number, NppOemCustomer>();
  value.forEach((c) => pool.set(c.customerId, c));
  (found ?? []).forEach((c) =>
    pool.set(c.id, { customerId: c.id, code: c.code, name: c.name }),
  );
  const opts = [...pool.values()].map((c) => ({
    value: String(c.customerId),
    label: c.code ? `${c.code} · ${c.name}` : c.name,
  }));

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tìm khách theo tên, mã"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <FilterMultiSelect
        options={opts}
        values={value.map((c) => String(c.customerId))}
        onChange={(ids) =>
          onChange(ids.map((id) => pool.get(Number(id))!).filter(Boolean))
        }
        placeholder="Chưa chọn khách"
        searchPlaceholder="Lọc trong danh sách..."
        multiLabel={(n) => `${n} khách`}
        panelWidth={320}
      />
    </div>
  );
}
