"use client";

import type { ReactNode } from "react";
import { Ban, FileText, ListChecks, Loader2, Paperclip } from "lucide-react";
import type {
  VehicleEntry,
  VehicleEntryKind,
} from "@/lib/api/internal-finance";
import { formatDateOnly, formatVnDateTime } from "@/lib/internal-finance/dates";
import { ENTRY_STATUS_LABELS } from "@/lib/internal-finance/vehicle-constants";
import { formatCurrency } from "@/lib/utils";
import {
  CardAction,
  FinanceMobileCard,
  FinanceMobileShell,
} from "@/components/internal-finance/mobile/FinanceMobileShell";
import { CheckBadges, STATUS_CLASS } from "./VehicleEntryTable";

const number = (value: number | string | null | undefined, digits = 0) =>
  value === null || value === undefined || value === ""
    ? null
    : Number(value).toLocaleString("vi-VN", {
        maximumFractionDigits: digits,
      });

/** Xe cộ trên điện thoại: tab Xăng dầu / Chăm sóc xe, thẻ phiếu có Sửa/Hủy. */
export function VehicleEntryMobileList({
  kind,
  tabs,
  onKindChange,
  rows,
  isLoading,
  search,
  onSearchChange,
  activeFilterCount,
  onOpenFilter,
  total,
  pageAmount,
  page,
  totalPages,
  onPageChange,
  onCreate,
  onOpenVehicles,
  highlightId,
  cancellingId,
  editBlockReason,
  cancelBlockReason,
  onOpenAttachments,
  onEdit,
  onCancel,
  notice,
}: {
  kind: VehicleEntryKind;
  tabs: Array<{ kind: VehicleEntryKind; label: string }>;
  onKindChange: (kind: VehicleEntryKind) => void;
  rows: VehicleEntry[];
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeFilterCount: number;
  onOpenFilter?: () => void;
  total: number;
  pageAmount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onCreate?: () => void;
  onOpenVehicles?: () => void;
  highlightId?: number | null;
  cancellingId: number | null;
  editBlockReason: (row: VehicleEntry) => string | null;
  cancelBlockReason: (row: VehicleEntry) => string | null;
  onOpenAttachments: (row: VehicleEntry) => void;
  onEdit: (row: VehicleEntry) => void;
  onCancel: (row: VehicleEntry) => void;
  /** Thay danh sách (ví dụ tài khoản chỉ có quyền tạo). */
  notice?: ReactNode;
}) {
  return (
    <FinanceMobileShell
      title="Xe cộ"
      search={notice ? undefined : search}
      onSearchChange={notice ? undefined : onSearchChange}
      searchPlaceholder="Tìm xe, địa điểm, mã phiếu..."
      activeFilterCount={activeFilterCount}
      onOpenFilter={notice ? undefined : onOpenFilter}
      actions={
        onOpenVehicles && (
          <button
            type="button"
            onClick={onOpenVehicles}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-gray-700">
            <ListChecks className="h-3.5 w-3.5" />
            Danh sách xe
          </button>
        )
      }
      tabs={
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.kind}
              type="button"
              onClick={() => onKindChange(tab.kind)}
              className={`rounded-lg py-2 text-sm font-medium ${
                kind === tab.kind
                  ? "bg-white text-brand shadow-sm"
                  : "text-gray-600"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      }
      summary={
        notice ? undefined : (
          <div className="flex items-center justify-between text-gray-500">
            <span>
              <strong className="text-gray-900">{total}</strong> phiếu
            </span>
            <span>
              Trang này:{" "}
              <strong className="text-red-600">
                {formatCurrency(pageAmount)}
              </strong>
            </span>
          </div>
        )
      }
      isLoading={!notice && isLoading}
      isEmpty={Boolean(notice) || rows.length === 0}
      emptyText={notice ? undefined : "Không có phiếu phù hợp"}
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onCreate={onCreate}>
      {notice ||
        rows.map((row) => {
          const cancelled = row.status === "CANCELLED";
          const editBlock = editBlockReason(row);
          const cancelBlock = cancelBlockReason(row);
          const services = row.vehicleServiceTypes?.length
            ? row.vehicleServiceTypes.join(", ")
            : row.vehicleServiceType;
          return (
            <FinanceMobileCard
              key={row.id}
              code={row.code}
              muted={cancelled}
              highlight={highlightId === row.id}
              badge={
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    STATUS_CLASS[row.status] || "bg-gray-100 text-gray-600"
                  }`}>
                  {ENTRY_STATUS_LABELS[row.status] || row.status}
                </span>
              }
              title={row.vehicle?.label || row.vehicleName || "-"}
              meta={
                <>
                  <div>{formatVnDateTime(row.occurredAt)}</div>
                  {kind === "FUEL" ? (
                    <div>
                      {[
                        number(row.vehicleOdo) &&
                          `ODO ${number(row.vehicleOdo)}`,
                        number(row.vehicleLiters, 2) &&
                          `${number(row.vehicleLiters, 2)} lít`,
                        number(row.vehicleUnitPrice) &&
                          `${number(row.vehicleUnitPrice)} đ/lít`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </div>
                  ) : (
                    <div className="truncate">
                      {[
                        services,
                        row.vehicleDueAt &&
                          `Hạn ${formatDateOnly(row.vehicleDueAt)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </div>
                  )}
                  {row.payer?.name && <div>Người chi: {row.payer.name}</div>}
                  {kind === "FUEL" && row.metrics && (
                    <div className="pt-1">
                      <CheckBadges metrics={row.metrics} />
                    </div>
                  )}
                  {cancelled && row.cancelReason && (
                    <div className="text-red-600">
                      Lý do hủy: {row.cancelReason}
                    </div>
                  )}
                </>
              }
              amount={`-${formatCurrency(row.amount)}`}
              amountTone="negative">
              {row.attachments?.length > 0 && (
                <CardAction onClick={() => onOpenAttachments(row)}>
                  <Paperclip className="h-3.5 w-3.5" />
                  {row.attachments.length}
                </CardAction>
              )}
              <CardAction
                title={editBlock || "Sửa phiếu xe"}
                disabled={Boolean(editBlock)}
                onClick={() => onEdit(row)}>
                <FileText className="h-3.5 w-3.5" />
                Sửa
              </CardAction>
              <CardAction
                tone="danger"
                title={cancelBlock || "Hủy phiếu xe"}
                disabled={Boolean(cancelBlock) || cancellingId === row.id}
                onClick={() => onCancel(row)}>
                {cancellingId === row.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                Hủy
              </CardAction>
              {(editBlock || cancelBlock) && !cancelled && (
                <p className="w-full text-[11px] text-gray-400">
                  {editBlock || cancelBlock}
                </p>
              )}
            </FinanceMobileCard>
          );
        })}
    </FinanceMobileShell>
  );
}
