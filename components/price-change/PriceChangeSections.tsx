"use client";

import type { ReactNode } from "react";
import { FormSection } from "@/components/products/FormSection";
import {
  PC_STAGE_ORDER,
  fmtDate,
  fmtDateTime,
} from "@/lib/price-change/constants";
import type { PcStage, PcTicketDetail } from "@/lib/types/price-change";
import { PriceChangeItemsTable } from "./PriceChangeItemsTable";

interface Field {
  label: string;
  value: ReactNode;
  wide?: boolean;
}

function DecisionValue({ decision }: { decision: string | null }) {
  if (!decision) return <>—</>;
  return decision === "APPROVED" ? (
    <span className="text-green-700">Đã duyệt</span>
  ) : (
    <span className="text-red-700">Từ chối</span>
  );
}

/**
 * Khối thông tin của một bước (khuôn StageSection của Bảng giá SP mới):
 * nhãn "Đang xử lý" / "Chưa tới bước" / "Bỏ qua", bước chưa tới thì gập sẵn.
 */
function StageSection({
  ticket,
  stage,
  title,
  fields,
  skipped = false,
  children,
}: {
  ticket: PcTicketDetail;
  stage: PcStage;
  title: string;
  fields: Field[];
  skipped?: boolean;
  children?: ReactNode;
}) {
  const current = PC_STAGE_ORDER.indexOf(ticket.stage);
  const own = PC_STAGE_ORDER.indexOf(stage);
  const isCurrent = stage === ticket.stage;
  const notReached =
    !skipped && ticket.stage !== "DONE" && current >= 0 && own > current;

  return (
    <FormSection
      // Phiếu tới bước này → mount lại để phần tự mở (defaultOpen chỉ đọc lúc mount)
      key={notReached || skipped ? "closed" : "open"}
      title={
        <span className="flex items-center gap-2">
          {title}
          {isCurrent && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
              Đang xử lý
            </span>
          )}
          {notReached && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
              Chưa tới bước
            </span>
          )}
          {skipped && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
              Bỏ qua — chỉ đổi giá bán
            </span>
          )}
        </span>
      }
      defaultOpen={!notReached && !skipped}>
      {fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4 text-sm">
          {fields.map((f) => (
            <div
              key={f.label}
              className={f.wide ? "col-span-2 md:col-span-4" : ""}>
              <dt className="text-xs text-gray-500">{f.label}</dt>
              <dd className="font-medium text-gray-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </FormSection>
  );
}

/** Các phần thông tin theo bước (chỉ xem — nhập liệu nằm trong modal Xử lý bước). */
export function PriceChangeSections({ ticket }: { ticket: PcTicketDetail }) {
  const s = ticket.summary;
  const names = (list: { name: string }[]) =>
    list.map((x) => x.name).join(", ") || "—";
  const types = [ticket.hasCost && "Giá vốn", ticket.hasSale && "Giá bán"]
    .filter(Boolean)
    .join(" + ");

  return (
    <div className="space-y-3">
      <StageSection
        ticket={ticket}
        stage="PROPOSAL"
        title="Đề xuất"
        fields={[
          { label: "Người đề xuất", value: ticket.createdByName ?? "—" },
          { label: "Ngày đề xuất", value: fmtDate(ticket.createdAt) },
          { label: "Loại thay đổi", value: types || "—" },
          {
            label: "Số sản phẩm",
            value: `${s.productCount} SP · tăng ${s.increases} / giảm ${s.decreases}`,
          },
          {
            label: "Giá vốn tại chi nhánh",
            value: names(ticket.costBranches),
            wide: true,
          },
          { label: "Bảng giá", value: names(ticket.priceBooks), wide: true },
          { label: "Ghi chú", value: ticket.note || "—", wide: true },
        ]}
      />

      <FormSection
        title={`Chi tiết thay đổi (${s.productCount} sản phẩm)`}
        headerRight={
          <span className="text-xs text-gray-500">
            {s.costCells} ô giá vốn · {s.priceCells} ô giá bán
          </span>
        }>
        <PriceChangeItemsTable
          items={ticket.items}
          costBranches={ticket.costBranches}
          priceBooks={ticket.priceBooks}
        />
      </FormSection>

      <StageSection
        ticket={ticket}
        stage="CHIEF_ACCOUNTANT"
        title="Kế toán trưởng"
        fields={[
          {
            label: "Quyết định",
            value: <DecisionValue decision={ticket.kttDecision} />,
          },
          { label: "Người duyệt", value: ticket.kttByName ?? "—" },
          { label: "Thời gian", value: fmtDateTime(ticket.kttAt) },
          { label: "Ghi chú", value: ticket.kttNote || "—" },
        ]}
      />

      <StageSection
        ticket={ticket}
        stage="CEO"
        title="CEO"
        skipped={!ticket.hasCost}
        fields={
          ticket.hasCost
            ? [
                {
                  label: "Quyết định",
                  value: <DecisionValue decision={ticket.ceoDecision} />,
                },
                { label: "Người duyệt", value: ticket.ceoByName ?? "—" },
                { label: "Thời gian", value: fmtDateTime(ticket.ceoAt) },
                { label: "Ghi chú", value: ticket.ceoNote || "—" },
              ]
            : []
        }
      />

      <StageSection
        ticket={ticket}
        stage="DATA"
        title="Phòng Dữ Liệu"
        fields={[
          {
            label: "Áp dụng lên POS",
            value: ticket.appliedAt ? (
              <span className="text-green-700">Đã áp dụng</span>
            ) : (
              "Chưa áp dụng"
            ),
          },
          { label: "Người áp dụng", value: ticket.appliedByName ?? "—" },
          { label: "Thời gian", value: fmtDateTime(ticket.appliedAt) },
          {
            label: "Đã ghi",
            value: ticket.appliedAt
              ? `${s.costCells} ô giá vốn · ${s.priceCells} ô giá bán`
              : "—",
          },
        ]}
      />
    </div>
  );
}
