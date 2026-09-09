"use client";

import { createPortal } from "react-dom";
import { BarChart3, CalendarClock, Package, X } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ConfidenceLevel,
  DecisionTimeline,
  DecisionTimelineEvent,
  ReliabilityLevel,
} from "@/lib/types/purchasing-planning";
import {
  CONFIDENCE_LABEL,
  RELIABILITY_LABEL,
} from "@/lib/types/purchasing-planning";

interface Props {
  open: boolean;
  onClose: () => void;
  productName: string;
  unit: string | null;
  timeline: DecisionTimeline | null | undefined;
  availableStock: number;
  forecastDailyDemand: number;
  leadTimeDays: number;
  confidence: ConfidenceLevel;
  reliability: ReliabilityLevel;
}

const num = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("vi-VN", {
        maximumFractionDigits: digits,
      });

const dateVn = (value: string | null | undefined) => {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
};

const shortDate = (value: string) => {
  const [, month, day] = value.slice(0, 10).split("-");
  return day && month ? `${day}/${month}` : value;
};

const eventColor: Partial<Record<DecisionTimelineEvent["type"], string>> = {
  PROMOTION: "#f59e0b",
  INCOMING: "#2563eb",
  VEHICLE_SHIPMENT: "#7c3aed",
};

const anomalyColor = {
  NORMAL: "#0f766e",
  SPIKE: "#f97316",
  DROP: "#dc2626",
};

export function DecisionTimelineModal({
  open,
  onClose,
  productName,
  unit,
  timeline,
  availableStock,
  forecastDailyDemand,
  leadTimeDays,
  confidence,
  reliability,
}: Props) {
  const projection = timeline?.projection ?? [];
  const history = timeline?.history ?? [];
  const events = (timeline?.events ?? []).filter((event) => event.type !== "TREND");
  const projectionFrom = projection[0]?.date ?? "";
  const projectionTo = projection[projection.length - 1]?.date ?? "";

  const visibleBands = events.filter(
    (event) =>
      event.type === "PROMOTION" &&
      event.endDate &&
      event.endDate >= projectionFrom &&
      event.startDate <= projectionTo,
  );

  const incomingEvents = events.filter(
    (event) =>
      (event.type === "INCOMING" || event.type === "VEHICLE_SHIPMENT") &&
      projection.some((point) => point.date === event.startDate),
  );

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[calc(100vh-24px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-48px)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-teal-900">
              <BarChart3 className="h-5 w-5" />
              <h2 className="truncate text-lg font-semibold">
                Tổng quan quyết định nhập hàng
              </h2>
            </div>
            <p className="mt-1 truncate text-sm text-gray-500">
              {productName} · xem doanh số, tồn kho dự kiến và rủi ro ghép xe trong cùng một màn hình.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Đóng biểu đồ">
            <X className="h-5 w-5" />
          </button>
        </header>

        {!timeline ? (
          <div className="flex min-h-64 items-center justify-center p-8 text-sm text-gray-500">
            Snapshot cũ chưa có dữ liệu biểu đồ. Hãy chạy lại tính toán để cập nhật.
          </div>
        ) : (
          <div className="overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
              <Metric label="Tồn khả dụng" value={num(availableStock)} unit={unit} tone="blue" />
              <Metric label="Bán trung bình" value={num(forecastDailyDemand, 2)} unit={`${unit ?? "đv"}/ngày`} tone="teal" />
              <Metric label="Leadtime" value={num(leadTimeDays)} unit="ngày" tone="gray" />
              <Metric label="Hết hàng dự kiến" value={dateVn(timeline.markers.projectedStockoutDate)} tone="red" />
              <Metric label="Hạn chót đặt" value={dateVn(timeline.markers.latestOrderDate)} tone="orange" />
              <Metric label="Đặt chắc chắn" value={num(timeline.quantities.firmSuggestedQuantity)} unit={unit} tone="navy" />
              <Metric label="Nếu ghép xe về" value={num(timeline.quantities.vehicleScenarioQuantity)} unit={unit} tone="purple" />
              <Metric label="Độ tin cậy" value={`${RELIABILITY_LABEL[reliability]} · ${CONFIDENCE_LABEL[confidence]}`} tone="gray" />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <section className="rounded-xl border p-3 sm:p-4" style={{ borderColor: "var(--dt-border)" }}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">Doanh số 5 tháng gần nhất</h3>
                    <p className="text-xs text-gray-500">Cột màu cam/đỏ là tháng tăng hoặc giảm bất thường.</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-500">Quá khứ</span>
                </div>
                {history.length === 0 ? (
                  <EmptyChart text="Chưa đủ dữ liệu doanh số theo tháng." />
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={history} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(value) => num(Number(value))} />
                        <Tooltip content={<HistoryTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="quantity" name="Doanh số" radius={[5, 5, 0, 0]}>
                          {history.map((point) => (
                            <Cell key={point.month} fill={anomalyColor[point.anomaly]} />
                          ))}
                        </Bar>
                        <Line type="monotone" dataKey="baseline" name="Mức bán nền" stroke="#111827" strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <LegendDot color="#0f766e" label="Bình thường" />
                  <LegendDot color="#f97316" label="Tăng bất thường" />
                  <LegendDot color="#dc2626" label="Giảm bất thường" />
                  <span>Đường đen: mức bán nền</span>
                </div>
              </section>

              <section className="rounded-xl border p-3 sm:p-4" style={{ borderColor: "var(--dt-border)" }}>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">Tồn kho dự kiến trong 90 ngày</h3>
                    <p className="text-xs text-gray-500">Đường nhạt cho biết kịch bản nếu ghép xe về đúng hạn.</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-700">Tương lai</span>
                </div>
                {projection.length === 0 ? (
                  <EmptyChart text="Chưa có dữ liệu dự phóng tồn kho." />
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={projection} margin={{ top: 12, right: 10, bottom: 4, left: 0 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          interval={projection.length > 60 ? 13 : 6}
                          minTickGap={18}
                          height={28}
                          tick={{ fontSize: 10, fill: "#6b7280" }}
                          tickFormatter={(value) => shortDate(String(value))}
                        />
                        <YAxis yAxisId="stock" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(value) => num(Number(value))} />
                        <YAxis yAxisId="incoming" orientation="right" hide domain={[0, "auto"]} />
                        <Tooltip content={<ProjectionTooltip unit={unit} />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {visibleBands.map((event) => (
                          <ReferenceArea
                            key={`${event.type}-${event.startDate}-${event.endDate}-${event.name}`}
                            x1={event.startDate}
                            x2={event.endDate!}
                            yAxisId="stock"
                            fill={eventColor[event.type]}
                            fillOpacity={0.08}
                            ifOverflow="extendDomain"
                            label={{ value: "KM", fill: eventColor[event.type], fontSize: 10 }}
                          />
                        ))}
                        <ReferenceLine yAxisId="stock" y={0} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "Hết hàng", fill: "#dc2626", fontSize: 10, position: "insideTopLeft" }} />
                        <ReferenceLine yAxisId="stock" y={timeline.markers.reorderPoint} stroke="#f59e0b" strokeDasharray="6 4" label={{ value: "Điểm đặt", fill: "#b45309", fontSize: 10, position: "insideTopLeft" }} />
                        <ReferenceLine yAxisId="stock" x={timeline.markers.latestOrderDate ?? undefined} stroke="#ea580c" strokeDasharray="3 3" label={{ value: "Hạn đặt", fill: "#ea580c", fontSize: 10 }} />
                        <ReferenceLine yAxisId="stock" x={timeline.markers.orderArrivalDate ?? undefined} stroke="#16a34a" strokeDasharray="3 3" label={{ value: "Hàng mới về", fill: "#16a34a", fontSize: 10 }} />
                        <Bar yAxisId="incoming" dataKey="confirmedIncoming" name="Hàng về chắc chắn" fill="#60a5fa" barSize={5} radius={[2, 2, 0, 0]} />
                        <Bar yAxisId="incoming" dataKey="vehicleIncoming" name="Ghép xe" fill="#a78bfa" barSize={5} radius={[2, 2, 0, 0]} />
                        <Line yAxisId="stock" type="monotone" dataKey="stockWithFirmSupply" name="Tồn chắc chắn" stroke="#0f766e" strokeWidth={3} dot={false} />
                        <Line yAxisId="stock" type="monotone" dataKey="stockWithVehicleScenario" name="Nếu ghép xe về" stroke="#60a5fa" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                        {incomingEvents.map((event, index) => {
                          const point = projection.find((item) => item.date === event.startDate);
                          if (!point) return null;
                          return (
                            <ReferenceDot
                              key={`${event.type}-${event.startDate}-${index}`}
                              x={event.startDate}
                              y={point.stockWithFirmSupply}
                              yAxisId="stock"
                              r={5}
                              fill={eventColor[event.type]}
                              stroke="#fff"
                              strokeWidth={2}
                              ifOverflow="extendDomain"
                            />
                          );
                        })}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                  <LegendDot color="#0f766e" label="Tồn chắc chắn" />
                  <LegendDot color="#60a5fa" label="Nếu ghép xe về" dashed />
                  <LegendDot color="#7c3aed" label="Ghép xe" />
                  <LegendDot color="#f59e0b" label="Khuyến mãi" />
                </div>
              </section>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-xl border p-4" style={{ borderColor: "var(--dt-border)" }}>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                  <CalendarClock className="h-4 w-4 text-orange-600" />
                  Các mốc cần chú ý
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoRow label="Hôm nay" value={dateVn(timeline.markers.today)} />
                  <InfoRow label="Hạn chót đặt" value={dateVn(timeline.markers.latestOrderDate)} />
                  <InfoRow label="Nếu đặt hôm nay, hàng về" value={dateVn(timeline.markers.orderArrivalDate)} />
                  <InfoRow label="Hết hàng chắc chắn" value={dateVn(timeline.markers.projectedStockoutDate)} danger />
                  <InfoRow label="Hết hàng nếu ghép xe về" value={dateVn(timeline.markers.scenarioStockoutDate)} />
                  <InfoRow label="Điểm đặt hàng" value={`${num(timeline.markers.reorderPoint)} ${unit ?? ""}`} />
                </div>
              </section>
              <section className="rounded-xl border p-4" style={{ borderColor: "var(--dt-border)" }}>
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                  <Package className="h-4 w-4 text-purple-600" />
                  Sự kiện ảnh hưởng quyết định
                </h3>
                {events.length === 0 ? (
                  <p className="text-sm text-gray-500">Không có khuyến mãi hoặc lô hàng cần chú ý.</p>
                ) : (
                  <div className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
                    {events.map((event, index) => (
                      <div key={`${event.type}-${event.startDate}-${index}`} className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: eventColor[event.type] }} />
                        <span className="font-medium text-gray-700">{eventLabel(event.type)}</span>
                        <span className="text-gray-500">{event.name ?? "Không có tên"}</span>
                        <span className="ml-auto whitespace-nowrap text-gray-400">{dateVn(event.startDate)}{event.endDate ? ` → ${dateVn(event.endDate)}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(content, document.body);
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit?: string | null; tone: "blue" | "teal" | "gray" | "red" | "orange" | "navy" | "purple" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-900",
    teal: "bg-teal-50 text-teal-900",
    gray: "bg-gray-50 text-gray-800",
    red: "bg-red-50 text-red-900",
    orange: "bg-orange-50 text-orange-900",
    navy: "bg-slate-900 text-white",
    purple: "bg-purple-50 text-purple-900",
  };
  return (
    <div className={`min-h-[68px] rounded-lg px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
      {unit && <div className="truncate text-[10px] opacity-70">{unit}</div>}
    </div>
  );
}

function LegendDot({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-3 ${dashed ? "border-t-2 border-dashed" : "h-2 rounded-full"}`} style={dashed ? { borderColor: color } : { backgroundColor: color }} />
      {label}
    </span>
  );
}

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${danger ? "text-red-700" : "text-gray-800"}`}>{value}</div>
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="flex h-full items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">{text}</div>;
}

function eventLabel(type: DecisionTimelineEvent["type"]) {
  if (type === "PROMOTION") return "Khuyến mãi";
  if (type === "VEHICLE_SHIPMENT") return "Ghép xe";
  return "Hàng về";
}

type TooltipPayload<T> = { payload: T };
type ChartTooltipProps<T> = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload<T>[];
};

type HistoryPoint = DecisionTimeline["history"][number];
type ProjectionPoint = DecisionTimeline["projection"][number];

function HistoryTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps<HistoryPoint>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold">{label}</div>
      <div>Doanh số: <b>{num(point.quantity)}</b></div>
      <div>Tốc độ bán: <b>{num(point.dailyRate, 2)}/ngày</b></div>
      <div>Mức nền: <b>{num(point.baseline)}</b></div>
      <div>Trạng thái: <b>{point.anomaly === "NORMAL" ? "Bình thường" : point.anomaly === "SPIKE" ? "Tăng bất thường" : "Giảm bất thường"}</b></div>
      {point.hasPromotion && <div className="text-orange-600">Có khuyến mãi</div>}
          </div>
  );
}

function ProjectionTooltip({
  active,
  payload,
  label,
  unit,
}: ChartTooltipProps<ProjectionPoint> & { unit: string | null }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold">{dateVn(label == null ? null : String(label))}</div>
      <div>Tồn chắc chắn: <b>{num(point.stockWithFirmSupply)} {unit ?? ""}</b></div>
      <div>Nếu ghép xe về: <b>{num(point.stockWithVehicleScenario)} {unit ?? ""}</b></div>
      <div>Nhu cầu/ngày: <b>{num(point.demand, 2)} {unit ?? ""}</b></div>
      {point.confirmedIncoming > 0 && <div className="text-blue-600">Hàng về: +{num(point.confirmedIncoming)}</div>}
      {point.vehicleIncoming > 0 && <div className="text-purple-600">Ghép xe: +{num(point.vehicleIncoming)}</div>}
    </div>
  );
}
