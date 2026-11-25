"use client";

import { Fragment, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type {
  VehicleFuelSummary,
  VehicleFuelSummaryRow,
  VehicleFuelSummaryTotal,
} from "@/lib/api/vehicles";
import {
  FUEL_TYPE_LABELS,
  VEHICLE_TYPE_LABELS,
} from "@/lib/internal-finance/vehicle-constants";

const dash = <span className="text-gray-400">-</span>;

const formatNumber = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? null
    : value.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
      });

const numberCell = (value: number | null | undefined, digits = 0) =>
  formatNumber(value, digits) ?? dash;

const vnDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

type Column = {
  key: string;
  label: string;
  /** Giải thích cách tính, hiện khi rê chuột vào tiêu đề cột. */
  hint?: string;
  width: string;
  align?: "right";
  render: (row: VehicleFuelSummaryRow) => ReactNode;
  /** Ô của dòng tổng (kho / tổng cộng); không có thì để trống. */
  total?: (total: VehicleFuelSummaryTotal) => ReactNode;
};

/**
 * Báo cáo tổng hợp xăng dầu theo xe (sheet "Tổng hợp" của file "Báo cáo lái xe
 * - Xăng dầu"): cài đặt hiện tại của xe và thực tế 2 tháng gần nhất. Nhóm theo
 * kho, mỗi kho một dòng tổng.
 */
export function VehicleFuelSummaryTable({
  data,
  isLoading,
  error,
}: {
  data?: VehicleFuelSummary;
  isLoading: boolean;
  error?: unknown;
}) {
  const months = data?.months ?? 2;
  const tolerance = data?.tolerance ?? 1;

  const vehicleColumns: Column[] = [
    {
      key: "vehicleType",
      label: "Phương tiện",
      width: "100px",
      render: (row) => VEHICLE_TYPE_LABELS[row.vehicleType] || row.vehicleType,
    },
    {
      key: "vehicle",
      label: "Biển số xe",
      width: "200px",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.label}
            {!row.isActive && (
              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-normal text-gray-500">
                Ngừng dùng
              </span>
            )}
          </div>
          {row.plate && row.plate !== row.label && (
            <div className="text-xs text-gray-500">{row.plate}</div>
          )}
        </div>
      ),
    },
    {
      key: "fuelType",
      label: "Loại nhiên liệu",
      width: "110px",
      render: (row) =>
        row.fuelType ? FUEL_TYPE_LABELS[row.fuelType] || row.fuelType : dash,
    },
  ];
  const normColumns: Column[] = [
    {
      key: "norm",
      label: "Định mức (L/100km)",
      hint: `Định mức tiêu hao đang cài cho xe trong Danh sách xe, cho phép lệch ±${tolerance} L/100km.`,
      width: "130px",
      align: "right",
      render: (row) =>
        row.fuelNorm !== null ? (
          <>
            {formatNumber(row.fuelNorm, 2)}
            <span className="ml-1 text-xs text-gray-400">±{tolerance}</span>
          </>
        ) : row.isActive ? (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Chưa đặt
          </span>
        ) : (
          dash
        ),
    },
  ];
  const actualColumns: Column[] = [
    {
      key: "km",
      label: "Tổng km đã đi",
      hint: "Mỗi lần đổ tính km tới lần đổ kế tiếp. Không tính lần đổ mới nhất (chưa có lần sau), phiếu ODO sai và quãng trên 2.000 km.",
      width: "120px",
      align: "right",
      render: (row) => numberCell(row.km, 2),
      total: (total) => numberCell(total.km, 2),
    },
    {
      key: "liters",
      label: "Tổng số lít đã đổ",
      hint: "Số lít của chính các lần đổ đã tính km ở cột trước, nên L/100km = lít ÷ km × 100.",
      width: "130px",
      align: "right",
      render: (row) => numberCell(row.liters, 2),
      total: (total) => numberCell(total.liters, 2),
    },
    {
      key: "litersPer100Km",
      label: "L/100km thực tế",
      hint: `Tổng lít ÷ tổng km × 100, cùng số với cột "L/100km ${months} tháng gần nhất" trong Danh sách xe. Đỏ khi lệch quá ±${tolerance} so với định mức.`,
      width: "140px",
      align: "right",
      render: (row) =>
        row.litersPer100Km === null ? (
          dash
        ) : (
          <span
            title={`Tính từ ${row.samples} lần đổ`}
            className={
              row.consumptionCheck === "ABNORMAL"
                ? "inline-flex items-center gap-1 font-medium text-red-600"
                : ""
            }>
            {row.consumptionCheck === "ABNORMAL" && (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {formatNumber(row.litersPer100Km, 2)}
            <span className="ml-1 text-xs font-normal text-gray-400">
              ({row.samples} lần)
            </span>
          </span>
        ),
      total: (total) => numberCell(total.litersPer100Km, 2),
    },
  ];
  const groups: Array<{ label: string; columns: Column[] }> = [
    { label: "", columns: vehicleColumns },
    { label: "Cài đặt hiện tại", columns: normColumns },
    { label: `Thực tế ${months} tháng gần nhất`, columns: actualColumns },
  ];
  const columns = groups.flatMap((group) => group.columns);
  const labelSpan = vehicleColumns.length + normColumns.length;
  const dataColumns = columns.slice(labelSpan);

  const cellClass = (column: Column) =>
    `px-3 py-2.5 ${
      column.align === "right"
        ? "whitespace-nowrap text-right tabular-nums"
        : ""
    }`;
  const totalRow = (label: string, total: VehicleFuelSummaryTotal) => (
    <tr className="border-b bg-gray-50 font-semibold text-gray-900">
      <td colSpan={labelSpan} className="px-3 py-2.5">
        {label}
        <span className="ml-1.5 text-xs font-normal text-gray-500">
          ({total.vehicles} xe)
        </span>
      </td>
      {dataColumns.map((column) => (
        <td key={column.key} className={cellClass(column)}>
          {column.total ? column.total(total) : null}
        </td>
      ))}
    </tr>
  );

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-red-600">
        {error instanceof Error ? error.message : "Không tải được dữ liệu"}
      </div>
    );
  }

  const groupsData = data?.groups || [];
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm text-gray-500">
        <span>
          Kỳ khảo sát:{" "}
          <strong className="text-gray-900">
            {data ? `${vnDate(data.from)} – ${vnDate(data.to)}` : "..."}
          </strong>{" "}
          ({months} tháng gần nhất)
        </span>
        <span>
          Định mức cho phép lệch ±{tolerance} L/100km · Rê chuột vào tiêu đề cột
          để xem cách tính
        </span>
      </div>
      <div className="min-w-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr className="border-b">
              {groups.map((group, index) => (
                <th
                  key={index}
                  colSpan={group.columns.length}
                  className={`whitespace-nowrap px-3 pt-2 pb-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-700 ${
                    index > 0 ? "border-l" : ""
                  }`}>
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              {groups.flatMap((group, groupIndex) =>
                group.columns.map((column, index) => (
                  <th
                    key={column.key}
                    title={column.hint}
                    className={`px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                      column.align === "right" ? "text-right" : "text-left"
                    } ${groupIndex > 0 && index === 0 ? "border-l" : ""} ${
                      column.hint ? "cursor-help" : ""
                    }`}
                    style={{ width: column.width, minWidth: column.width }}>
                    {column.label}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  <div className="inline-flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tải...
                  </div>
                </td>
              </tr>
            ) : groupsData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-20 text-center text-gray-400">
                  Không có xe nào
                </td>
              </tr>
            ) : (
              <>
                {groupsData.map((group) => {
                  const name =
                    group.branchName || `Chi nhánh #${group.branchId}`;
                  return (
                    <Fragment key={group.branchId}>
                      <tr className="border-b bg-brand-soft">
                        <td
                          colSpan={columns.length}
                          className="px-3 py-2 font-semibold text-brand-dark">
                          {name}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr
                          key={row.vehicleId}
                          className={`border-b align-top transition-colors hover:bg-gray-50 ${
                            row.isActive ? "" : "opacity-60"
                          }`}>
                          {columns.map((column) => (
                            <td key={column.key} className={cellClass(column)}>
                              {column.render(row)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {totalRow(`Tổng ${name}`, group.total)}
                    </Fragment>
                  );
                })}
                {groupsData.length > 1 &&
                  data &&
                  totalRow("Tổng cộng", data.total)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
