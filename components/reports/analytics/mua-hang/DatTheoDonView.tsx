"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { MuaHangDemandFilters } from "@/lib/api/analytics-mua-hang";
import {
  useDatTheoDon,
  useMuaHangFilterOptions,
} from "@/lib/hooks/useAnalyticsMuaHang";
import { Panel } from "../shared/AnalyticsCharts";
import { MuaHangPivot, type PivotMeasure } from "./MuaHangPivot";
import { MuaHangSlicers, type SlicerSet } from "./MuaHangSlicers";
import { fmtQty } from "./muaHangFormat";
import { ErrorBox, LoadingBlock, NoteBox, UpdatedAt } from "./MuaHangCommon";

// Thu Mua › Đặt Theo Đơn: Demand (đặt theo đơn khách) theo hàng × tháng.
const SLICERS: SlicerSet = {
  period: true,
  customers: true,
  productTypes: true,
  brands: true,
  visualGroups: true,
  groups2026: true,
  categories: true,
  products: true,
};

const MEASURES: PivotMeasure<number | null>[] = [
  { key: "demand", label: "Demand", get: (c) => c, format: fmtQty },
];

export function DatTheoDonView() {
  const [filters, setFilters] = useState<MuaHangDemandFilters>(() => ({
    year: new Date().getFullYear(),
  }));
  const { data: options } = useMuaHangFilterOptions();
  const { data, isLoading, isFetching, error } = useDatTheoDon(filters);

  return (
    <>
      <MuaHangSlicers
        show={SLICERS}
        filters={filters}
        onChange={setFilters}
        options={options}
        defaultFilters={{ year: new Date().getFullYear() }}
        right={
          isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : undefined
        }
      />
      <NoteBox>
        Nguồn: Demand của POS (đồng bộ từ LarkBase, cùng nguồn với bảng “Demand”
        Power BI đọc từ DB đồng bộ KiotViet). Chỉ tính tháng Demand đã xác nhận;
        số lượng là số quy đổi về đơn vị cơ bản (ĐVT). Chỉ hàng đang kinh doanh.
      </NoteBox>
      {error ? (
        <ErrorBox error={error} />
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <Panel title="Tổng Hợp Theo Hàng Hóa">
          <MuaHangPivot
            rowHeaders={["Mã Hàng", "Tên Hàng", "ĐVT"]}
            wideLabel={1}
            colGroups={data.periods.map((p) => ({
              key: p.key,
              label: `Tháng ${p.month}/${p.year}`,
            }))}
            measures={MEASURES}
            rows={data.rows.map((r) => ({
              key: `${r.code}-${r.unit ?? ""}`,
              labels: [r.code, r.name, r.unit ?? ""],
              cells: r.cells,
              total: r.total,
            }))}
            total={data.total}
          />
          <UpdatedAt at={data.updatedAt} count={data.rows.length} />
        </Panel>
      )}
    </>
  );
}
