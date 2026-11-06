"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { Panel } from "@/components/reports/analytics/shared/AnalyticsCharts";
import { BLANK_LABEL } from "@/components/reports/analytics/analyticsFormat";
import {
  KE_TOAN_BLANK,
  type MisaFilters,
  type MisaRow,
} from "@/lib/api/analytics-ke-toan";
import { useMappingMisa } from "@/lib/hooks/useAnalyticsKeToan";
import {
  ExportButton,
  exportSheets,
  fmtInt,
  LoadState,
  PagedTable,
  UpdatedAt,
  type KeToanColumn,
} from "./KeToanShared";

const COLUMNS: KeToanColumn<MisaRow>[] = [
  { key: "code", label: "Mã hàng", sortable: true },
  { key: "name", label: "Tên hàng", sortable: true },
  { key: "productType", label: "Loại hàng", sortable: true },
  { key: "category", label: "Nhóm hàng", sortable: true },
  { key: "origin", label: "Nguồn gốc", sortable: true },
  { key: "misaCode", label: "Mã Misa", sortable: true },
  { key: "misaName", label: "Tên Misa", sortable: true, width: 320 },
  { key: "misaUnit", label: "ĐVT Misa", sortable: true },
  {
    key: "onhandHn",
    label: "Tồn HN",
    align: "right",
    sortable: true,
    format: fmtInt,
  },
  {
    key: "onhandSg",
    label: "Tồn SG",
    align: "right",
    sortable: true,
    format: fmtInt,
  },
];

/** Phân tích › Kế Toán › Mapping Misa — tableEx "Mapping Mã Misa" + slicer Loại Hàng, Tên Hàng. */
export function MappingMisaView() {
  const [filters, setFilters] = useState<MisaFilters>({});
  const { data, isLoading, isFetching, error } = useMappingMisa(filters);

  const typeOptions = (data?.options.productTypes ?? []).map((t) => ({
    value: t,
    label: t === KE_TOAN_BLANK ? BLANK_LABEL : t,
  }));
  const nameOptions = (data?.options.productNames ?? []).map((n) => ({
    value: n,
    label: n,
  }));
  const dirty = !!(
    filters.productTypes?.length || filters.productNames?.length
  );
  const totals = data
    ? ({
        ...data.totals,
        code: "",
        name: "",
        productType: null,
        category: null,
        origin: null,
        misaCode: "",
        misaName: "",
        misaUnit: "",
      } as MisaRow)
    : null;

  return (
    <>
      <div className="dt-panel p-4 flex flex-wrap items-center gap-3">
        <div className="w-56">
          <FilterMultiSelect
            options={typeOptions}
            values={filters.productTypes ?? []}
            onChange={(vals) =>
              setFilters((f) => ({
                ...f,
                productTypes: vals.length ? vals : undefined,
              }))
            }
            placeholder="Loại Hàng: Tất cả"
            searchable={false}
            multiLabel={(n) => `Loại Hàng: ${n} loại`}
          />
        </div>
        <div className="w-80">
          <FilterMultiSelect
            options={nameOptions}
            values={filters.productNames ?? []}
            onChange={(vals) =>
              setFilters((f) => ({
                ...f,
                productNames: vals.length ? vals : undefined,
              }))
            }
            placeholder="Tên Hàng: Tất cả"
            searchPlaceholder="Tìm tên hàng..."
            multiLabel={(n) => `Tên Hàng: ${n} mặt hàng`}
            panelWidth={420}
          />
        </div>
        {dirty && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
            style={{ color: "var(--dt-text-secondary)" }}>
            <RotateCcw className="w-3.5 h-3.5" />
            Xoá lọc
          </button>
        )}
        <div className="flex-1" />
        {isFetching && (
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "var(--dt-text-muted)" }}
          />
        )}
      </div>

      <LoadState error={error} loading={isLoading || !data}>
        {data && (
          <Panel
            title="Mapping Mã Misa"
            subtitle={`${data.rows.length.toLocaleString("vi-VN")} mặt hàng có tồn ở Kho Hà Nội / Kho Sài Gòn`}
            right={
              <ExportButton
                disabled={!data.rows.length}
                onExport={() =>
                  exportSheets("Mapping-Misa", [
                    {
                      name: "Mapping Mã Misa",
                      columns: COLUMNS,
                      rows: data.rows,
                      totals,
                    },
                  ])
                }
              />
            }>
            <PagedTable
              columns={COLUMNS}
              rows={data.rows}
              totals={totals}
              rowKey={(r) => r.code}
            />
          </Panel>
        )}
      </LoadState>
      <UpdatedAt at={data?.updatedAt} />
    </>
  );
}
