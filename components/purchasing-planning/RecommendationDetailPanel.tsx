"use client";

import Link from "next/link";
import { AlertTriangle, Package, Settings2, TrendingDown, TrendingUp, X } from "lucide-react";
import { PriorityBadge, ReliabilityBadge, SeverityBadge } from "./PriorityBadge";
import { useRecommendationDetail } from "@/lib/hooks/usePurchasingPlanning";
import {
  CONFIDENCE_LABEL,
  CONFIG_SOURCE_LABEL,
  DEMAND_SOURCE_LABEL,
  ETA_TYPE_LABEL,
  FLAG_CODE_LABEL,
  type CalculationStep,
} from "@/lib/types/purchasing-planning";

interface Props {
  itemId: number | null;
  onClose: () => void;
  canConfig?: boolean;
  onAdjustConfig?: (sku: { id: number; code: string; name: string }) => void;
}

const num = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined
    ? "—"
    : Number(v).toLocaleString("vi-VN", { maximumFractionDigits: digits });

const money = (v: number | null | undefined) =>
  v === null || v === undefined || v === 0
    ? "—"
    : Number(v).toLocaleString("vi-VN") + " đ";

const dateVn = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "—";

export function RecommendationDetailPanel({ itemId, onClose, canConfig, onAdjustConfig }: Props) {
  const { data, isLoading, isError } = useRecommendationDetail(itemId);

  if (itemId === null) return null;

  return (
    <aside
      className="flex w-[520px] shrink-0 flex-col overflow-hidden border-l bg-white"
      style={{ borderColor: "var(--dt-border)" }}>
      {/* ── Header ── */}
      <div
        className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            {data && <PriorityBadge priority={data.priority} size="sm" />}
            <span className="font-semibold">{data?.productCode ?? "..."}</span>
          </div>
          <p className="truncate text-sm text-gray-600">{data?.productName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Nội dung ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <AlertTriangle className="h-7 w-7 text-red-400" />
            <p className="text-sm text-red-600">Không tải được chi tiết</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--dt-border)" }}>
            {/* ① KẾT LUẬN */}
            <Section title="① Kết luận">
              <p
                className={`text-sm leading-relaxed ${
                  data.priority === "CRITICAL"
                    ? "font-medium text-red-700"
                    : "text-gray-700"
                }`}>
                {data.summaryText}
              </p>

              {data.suggestedQuantity > 0 && (
                <div className="mt-3 rounded border border-gray-900 bg-gray-900 px-3 py-2 text-white">
                  <div className="text-[11px] opacity-70">Đề xuất đặt</div>
                  <div className="text-lg font-semibold">
                    {num(data.suggestedQuantity)} {data.unit ?? ""}
                    {data.suggestedPackCount ? (
                      <span className="ml-1 text-sm font-normal opacity-80">
                        ({num(data.suggestedPackCount)} thùng ×{" "}
                        {num(data.packSize)})
                      </span>
                    ) : null}
                  </div>
                  {data.estimatedValue ? (
                    <div className="mt-0.5 text-xs opacity-80">
                      Giá trị ước tính: {money(data.estimatedValue)}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ReliabilityBadge reliability={data.reliability} />
                <span className="text-[11px] text-gray-500">
                  Độ tin cậy dự báo: {CONFIDENCE_LABEL[data.confidence]}
                </span>
              </div>
            </Section>

            {/* ② DỮ LIỆU ĐẦU VÀO */}
            <Section title="② Dữ liệu đầu vào">
              <Table
                rows={[
                  ["Tồn kho vật lý", num(data.physicalStock), ""],
                  ...data.branchBreakdown.map(
                    (b) =>
                      [
                        `   ├ ${b.branchName}`,
                        num(b.onHand),
                        "",
                      ] as [string, string, string]
                  ),
                  [
                    "Hàng đã hứa cho khách",
                    `−${num(data.reservedStock)}`,
                    "đơn chưa giao",
                  ],
                  ["= Tồn kho khả dụng", num(data.availableStock), ""],
                ]}
                highlightLast
              />

              {data.shipments.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Package className="h-3.5 w-3.5" />
                    Hàng đang về ({num(data.incomingTotal)})
                  </div>
                  <div className="space-y-1.5">
                    {data.shipments.map((s) => (
                      <div
                        key={s.orderSupplierId}
                        className="flex items-center justify-between rounded border px-2 py-1.5 text-xs"
                        style={{ borderColor: "var(--dt-border)" }}>
                        <div>
                          <div className="font-medium">{s.orderCode}</div>
                          <div className="text-gray-500">{s.supplierName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{num(s.quantity)}</div>
                          <div className="text-gray-500">
                            {dateVn(s.eta)} · {ETA_TYPE_LABEL[s.etaType]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ③ DỰ BÁO */}
            <Section title="③ Dự báo nhu cầu">
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-xl font-semibold">
                  {num(data.forecastComparison.used, 2)}
                </span>
                <span className="text-sm text-gray-500">
                  {data.unit ?? "đv"}/ngày
                </span>
                <span className="ml-auto text-[11px] text-gray-400">
                  dùng để tính đề xuất
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <MaRow
                  label="MA30"
                  value={data.forecastComparison.ma30}
                  base={data.forecastComparison.used}
                />
                <MaRow
                  label="MA60"
                  value={data.forecastComparison.ma60}
                  base={data.forecastComparison.used}
                />
                <MaRow
                  label="MA90"
                  value={data.forecastComparison.ma90}
                  base={data.forecastComparison.used}
                />
              </div>

              <div className="mt-3 space-y-0.5 text-[11px] text-gray-500">
                <div>
                  Tổng nhu cầu trong cửa sổ:{" "}
                  <span className="font-medium text-gray-700">
                    {num(data.forecastComparison.totalDemand)}
                  </span>
                </div>
                <div>
                  Số ngày có hàng (mẫu số):{" "}
                  <span className="font-medium text-gray-700">
                    {data.forecastComparison.validDays}
                  </span>
                  /{data.forecastComparison.windowDays}
                </div>
                {data.forecastComparison.stockoutDaysExcluded > 0 && (
                  <div className="text-amber-600">
                    Đã loại {data.forecastComparison.stockoutDaysExcluded} ngày
                    hết hàng khỏi mẫu số
                  </div>
                )}
                <div>
                  Nguồn dữ liệu:{" "}
                  <span className="font-medium text-gray-700">
                    {DEMAND_SOURCE_LABEL[data.forecastComparison.demandSource]}
                  </span>
                </div>
                {data.forecastComparison.growthFactor !== 1 && (
                  <div className="text-orange-600">
                    ⚠️ Đã nhân hệ số điều chỉnh{" "}
                    {data.forecastComparison.growthFactor}
                  </div>
                )}
              </div>
            </Section>

            {/* ④ CẤU HÌNH */}
            <Section title="④ Tham số áp dụng">
              <Table
                rows={Object.entries(data.calculationTrace.inputs.config)
                  .filter(([key]) => key !== "packSize")
                  .map(
                  ([key, cfg]) =>
                    [
                      CONFIG_LABEL[key] ?? key,
                      num(cfg.value, 2),
                      `${CONFIG_SOURCE_LABEL[cfg.source]}${
                        cfg.label ? ` · ${cfg.label}` : ""
                      }`,
                    ] as [string, string, string]
                  )}
              />
              <div className="mt-2 flex items-center justify-between gap-3 rounded border border-cyan-100 bg-cyan-50 px-2.5 py-2 text-xs">
                <div>
                  <div className="font-medium text-gray-700">Quy cách thùng</div>
                  <div className="text-gray-500">Sản phẩm · Định lượng đóng gói</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{num(data.packSize)}</div>
                  <Link
                    href={`/san-pham/danh-sach?Code=${encodeURIComponent(data.productCode)}`}
                    className="text-brand hover:underline">
                    Chỉnh tại sản phẩm
                  </Link>
                </div>
              </div>
              {canConfig && onAdjustConfig && (
                <button
                  type="button"
                  onClick={() =>
                    onAdjustConfig({
                      id: data.productId,
                      code: data.productCode,
                      name: data.productName,
                    })
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft">
                  <Settings2 className="h-4 w-4" />
                  Điều chỉnh cấu hình
                </button>
              )}
            </Section>

            {/* ⑤ QUÁ TRÌNH TÍNH */}
            <Section title="⑤ Quá trình tính">
              <div className="space-y-2">
                {data.calculationTrace.steps.map((s) => (
                  <StepRow key={s.step} step={s} />
                ))}
              </div>
            </Section>

            {/* ⑥ CẢNH BÁO */}
            {data.flags.length > 0 && (
              <Section title="⑥ Cảnh báo">
                <div className="space-y-2">
                  {data.flags.map((f, i) => (
                    <div
                      key={`${f.code}-${i}`}
                      className="rounded border border-amber-200 bg-amber-50 px-2.5 py-2">
                      <div className="mb-1 flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        <span className="font-mono text-[10px] text-gray-500">
                          {FLAG_CODE_LABEL[f.code] ?? f.code}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-gray-700">
                        {f.message}
                      </p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THÀNH PHẦN PHỤ
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG_LABEL: Record<string, string> = {
  leadTimeDays: "Thời gian giao hàng (ngày)",
  safetyDays: "Số ngày dự phòng",
  coverageDays: "Chu kỳ đặt hàng (ngày)",
  growthFactor: "Hệ số điều chỉnh",
  packSize: "Quy cách thùng",
  moq: "Đặt tối thiểu (MOQ)",
};

const CALCULATION_STEP_LABEL: Record<string, string> = {
  TARGET_STOCK: "Tồn kho mục tiêu",
  SOQ_RAW: "Số lượng đặt hàng thô",
  ROUND_TO_PURCHASE_MULTIPLE: "Làm tròn theo bội số đặt hàng",
  MOQ_POLICY: "Áp dụng chính sách MOQ",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Table({
  rows,
  highlightLast,
}: {
  rows: [string, string, string][];
  highlightLast?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded border" style={{ borderColor: "var(--dt-border)" }}>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([label, value, note], i) => {
            const isLast = i === rows.length - 1;
            return (
              <tr
                key={`${label}-${i}`}
                className={`border-b last:border-b-0 ${
                  highlightLast && isLast ? "bg-gray-50 font-medium" : ""
                }`}
                style={{ borderColor: "var(--dt-border)" }}>
                <td className="px-2 py-1.5 text-gray-600">{label}</td>
                <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                  {value}
                </td>
                <td className="px-2 py-1.5 text-[11px] text-gray-400">
                  {note}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MaRow({
  label,
  value,
  base,
}: {
  label: string;
  value: number | null;
  base: number;
}) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between text-gray-400">
        <span>{label}</span>
        <span>chưa đủ dữ liệu</span>
      </div>
    );
  }
  const diff = base > 0 ? ((value - base) / base) * 100 : 0;
  const up = diff > 1;
  const down = diff < -1;
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="font-medium tabular-nums">
          {value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
        </span>
        {(up || down) && (
          <span
            className={`flex items-center gap-0.5 text-[11px] ${
              up ? "text-orange-600" : "text-blue-600"
            }`}>
            {up ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}%
          </span>
        )}
      </span>
    </div>
  );
}

function StepRow({ step }: { step: CalculationStep }) {
  return (
    <div
      className="rounded border px-2.5 py-2"
      style={{ borderColor: "var(--dt-border)" }}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-xs font-medium">
          {step.step}. {CALCULATION_STEP_LABEL[step.name] ?? step.name}
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
          {step.result.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="font-mono text-[11px] text-gray-500">{step.formula}</div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-gray-400">
        {Object.entries(step.values).map(([k, v]) => (
          <span key={k}>
            {k} ={" "}
            {Number(v).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
          </span>
        ))}
      </div>
      {step.note && (
        <div className="mt-1 text-[11px] text-gray-600 italic">{step.note}</div>
      )}
    </div>
  );
}
