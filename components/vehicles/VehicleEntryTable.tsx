"use client";

import { Ban, FileText, Loader2, Paperclip } from "lucide-react";
import type {
  FuelMetrics,
  VehicleEntry,
  VehicleEntryKind,
} from "@/lib/api/internal-finance";
import { formatDateOnly, formatVnDateTime } from "@/lib/internal-finance/dates";
import { ENTRY_STATUS_LABELS } from "@/lib/internal-finance/vehicle-constants";
import { formatCurrency } from "@/lib/utils";

type Column = {
  key: string;
  label: string;
  width: string;
  align?: "right";
  render: (row: VehicleEntry) => React.ReactNode;
};

const dash = <span className="text-gray-400">-</span>;

const numberCell = (value: number | string | null | undefined, digits = 0) => {
  if (value === null || value === undefined || value === "") return dash;
  const number = Number(value);
  if (!Number.isFinite(number)) return dash;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const CHECK_CLASS: Record<string, string> = {
  NORMAL: "bg-green-100 text-green-700",
  ABNORMAL: "bg-red-100 text-red-700",
};

function CheckBadges({ metrics }: { metrics?: FuelMetrics | null }) {
  if (!metrics || (!metrics.consumptionCheck && !metrics.costCheck)) {
    return <span className="text-xs text-gray-400">Chờ lần đổ sau</span>;
  }
  const badges: Array<[string, string | null, string]> = [
    [
      "Định mức",
      metrics.consumptionCheck,
      metrics.normMin !== null && metrics.normMax !== null
        ? `Ngưỡng l/100km: ${metrics.normMin.toFixed(2)} – ${metrics.normMax.toFixed(2)}`
        : "",
    ],
    ["đ/km", metrics.costCheck, "So với ngưỡng đ/km đặt trên xe"],
  ];
  return (
    <div className="flex flex-col items-start gap-1">
      {badges.map(([label, check, title]) =>
        check ? (
          <span
            key={label}
            title={title}
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${CHECK_CLASS[check]}`}>
            {label}: {check === "NORMAL" ? "Bình thường" : "Bất thường"}
          </span>
        ) : null,
      )}
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  POSTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  IN_WEEKLY_APPROVAL: "bg-amber-100 text-amber-700",
  READY_FOR_WEEKLY_APPROVAL: "bg-blue-100 text-blue-700",
};

export function VehicleEntryTable({
  kind,
  rows,
  isLoading,
  canEdit,
  cancellingId,
  onOpenAttachments,
  onEdit,
  onCancel,
}: {
  kind: VehicleEntryKind;
  rows: VehicleEntry[];
  isLoading: boolean;
  canEdit: (row: VehicleEntry) => boolean;
  cancellingId: number | null;
  onOpenAttachments: (row: VehicleEntry) => void;
  onEdit: (row: VehicleEntry) => void;
  onCancel: (row: VehicleEntry) => void;
}) {
  const vehicleName = (row: VehicleEntry) =>
    row.vehicle?.label || row.vehicleName || "-";
  const shared = {
    time: {
      key: "time",
      label: "Thời gian",
      width: "140px",
      render: (row: VehicleEntry) => (
        <div>
          <div className="whitespace-nowrap text-gray-900">
            {formatVnDateTime(row.occurredAt)}
          </div>
          <div className="font-mono text-[11px] text-gray-400">{row.code}</div>
        </div>
      ),
    },
    vehicle: {
      key: "vehicle",
      label: "Xe",
      width: "170px",
      render: (row: VehicleEntry) => (
        <div>
          <div className="font-medium text-gray-900">{vehicleName(row)}</div>
          <div className="text-xs text-gray-500">{row.branch?.name}</div>
        </div>
      ),
    },
    driver: {
      key: "driver",
      label: "Lái xe",
      width: "150px",
      render: (row: VehicleEntry) => row.creator?.name || dash,
    },
    payer: {
      key: "payer",
      label: "Người chi",
      width: "150px",
      render: (row: VehicleEntry) => row.payer?.name || dash,
    },
    odo: {
      key: "odo",
      label: "ODO",
      width: "90px",
      align: "right" as const,
      render: (row: VehicleEntry) => numberCell(row.vehicleOdo),
    },
    files: {
      key: "files",
      label: "Ảnh",
      width: "70px",
      render: (row: VehicleEntry) =>
        row.attachments?.length ? (
          <button
            type="button"
            title={`Xem ${row.attachments.length} ảnh`}
            onClick={() => onOpenAttachments(row)}
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs text-brand hover:border-brand hover:bg-brand-soft">
            <Paperclip className="h-3.5 w-3.5" />
            {row.attachments.length}
          </button>
        ) : (
          dash
        ),
    },
    status: {
      key: "status",
      label: "Trạng thái",
      width: "140px",
      render: (row: VehicleEntry) => (
        <div>
          <span
            className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
              STATUS_CLASS[row.status] || "bg-gray-100 text-gray-600"
            }`}>
            {ENTRY_STATUS_LABELS[row.status] || row.status}
          </span>
          {row.weeklyBatch?.code && (
            <div
              className="mt-0.5 max-w-[130px] truncate font-mono text-[11px] text-gray-400"
              title={row.weeklyBatch.code}>
              {row.weeklyBatch.code}
            </div>
          )}
        </div>
      ),
    },
    note: {
      key: "note",
      label: "Ghi chú",
      width: "200px",
      render: (row: VehicleEntry) =>
        row.note ? (
          <div className="max-w-[220px] break-words text-gray-700">
            {row.note}
          </div>
        ) : (
          dash
        ),
    },
  } satisfies Record<string, Column>;

  const columns: Column[] =
    kind === "FUEL"
      ? [
          shared.time,
          shared.vehicle,
          shared.driver,
          {
            key: "location",
            label: "Địa điểm",
            width: "180px",
            render: (row) =>
              row.vehicleLocation ? (
                <div
                  className="max-w-[200px] truncate text-gray-700"
                  title={row.vehicleLocation}>
                  {row.vehicleLocation}
                </div>
              ) : (
                dash
              ),
          },
          {
            key: "unitPrice",
            label: "Đơn giá",
            width: "90px",
            align: "right",
            render: (row) => numberCell(row.vehicleUnitPrice),
          },
          {
            key: "liters",
            label: "Số lít",
            width: "80px",
            align: "right",
            render: (row) => numberCell(row.vehicleLiters, 2),
          },
          {
            key: "amount",
            label: "Số tiền",
            width: "110px",
            align: "right",
            render: (row) => (
              <span className="font-semibold text-red-600">
                {formatCurrency(row.amount)}
              </span>
            ),
          },
          shared.odo,
          {
            key: "prevOdo",
            label: "ODO kỳ trước",
            width: "110px",
            align: "right",
            render: (row) => numberCell(row.metrics?.prevOdo),
          },
          {
            key: "nextOdo",
            label: "ODO kỳ sau",
            width: "100px",
            align: "right",
            render: (row) => numberCell(row.metrics?.nextOdo),
          },
          {
            key: "km",
            label: "Km trong kỳ",
            width: "100px",
            align: "right",
            render: (row) => numberCell(row.metrics?.kmInPeriod),
          },
          {
            key: "costPerKm",
            label: "đ/km",
            width: "80px",
            align: "right",
            render: (row) => numberCell(row.metrics?.costPerKm),
          },
          {
            key: "norm",
            label: "l/100km",
            width: "80px",
            align: "right",
            render: (row) => numberCell(row.metrics?.litersPer100Km, 2),
          },
          {
            key: "check",
            label: "Kiểm tra",
            width: "170px",
            render: (row) => <CheckBadges metrics={row.metrics} />,
          },
          shared.payer,
          shared.note,
          shared.files,
          shared.status,
        ]
      : [
          shared.time,
          shared.vehicle,
          {
            key: "services",
            label: "Loại dịch vụ",
            width: "200px",
            render: (row) => {
              const services = row.vehicleServiceTypes?.length
                ? row.vehicleServiceTypes
                : (row.vehicleServiceType || "")
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);
              return services.length ? (
                <div className="flex flex-wrap gap-1">
                  {services.map((service) => (
                    <span
                      key={service}
                      className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
                      {service}
                    </span>
                  ))}
                </div>
              ) : (
                dash
              );
            },
          },
          {
            key: "dueAt",
            label: "Hạn ĐK / BH",
            width: "110px",
            render: (row) =>
              row.vehicleDueAt ? formatDateOnly(row.vehicleDueAt) : dash,
          },
          shared.odo,
          {
            key: "amount",
            label: "Chi phí",
            width: "110px",
            align: "right",
            render: (row) => (
              <span className="font-semibold text-red-600">
                {formatCurrency(row.amount)}
              </span>
            ),
          },
          shared.driver,
          shared.payer,
          shared.note,
          shared.files,
          shared.status,
        ];

  return (
    <div className="min-w-0 flex-1 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                  column.align === "right" ? "text-right" : "text-left"
                }`}
                style={{ width: column.width, minWidth: column.width }}>
                {column.label}
              </th>
            ))}
            <th style={{ width: "150px", minWidth: "150px" }} />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length + 1} className="py-20 text-center">
                <div className="inline-flex items-center gap-2 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tải...
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="py-20 text-center text-gray-400">
                Không có phiếu phù hợp
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b align-top transition-colors hover:bg-gray-50 ${
                  row.status === "CANCELLED" ? "opacity-60" : ""
                }`}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-2.5 ${
                      column.align === "right"
                        ? "whitespace-nowrap text-right tabular-nums"
                        : ""
                    }`}>
                    {column.render(row)}
                  </td>
                ))}
                <td className="px-3 py-2.5">
                  {canEdit(row) && (
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(row)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <FileText className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={cancellingId === row.id}
                        onClick={() => onCancel(row)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                        {cancellingId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        Hủy
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
