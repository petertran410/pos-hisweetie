"use client";

export interface HBarItem {
  id: number | string;
  label: string;
  value: number;
  /** Tooltip khi rê chuột; mặc định = label + giá trị. */
  title?: string;
}

interface Props {
  items: HBarItem[];
  formatValue: (v: number) => string;
  formatAxis: (v: number) => string;
  /** Trục chỉ có vạch số nguyên (vd số lượng). */
  integer?: boolean;
  barColor?: string;
  loading?: boolean;
  emptyText?: string;
}

/** Trục "đẹp": ~4–6 vạch, chừa khoảng trống bên phải cho nhãn giá trị. */
function niceAxis(max: number, integer: boolean) {
  if (max <= 0) return { axisMax: 1, ticks: [0, 1] };
  const target = max * 1.2;
  const raw = target / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step =
    (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) *
    mag;
  if (integer) step = Math.max(1, Math.ceil(step));
  const axisMax = Math.ceil(target / step) * step;
  const ticks: number[] = [];
  for (let i = 0; i * step <= axisMax + step / 2; i++) ticks.push(i * step);
  return { axisMax, ticks };
}

/**
 * Biểu đồ thanh ngang: nhãn nằm trên mỗi thanh, giá trị ở cuối thanh,
 * lưới dọc + trục số phía dưới. Dùng cho Top hàng bán chạy / Top khách.
 */
export function HBarChart({
  items,
  formatValue,
  formatAxis,
  integer = false,
  barColor = "var(--dt-primary)",
  loading,
  emptyText = "Chưa có dữ liệu trong kỳ đã chọn.",
}: Props) {
  if (loading && !items.length) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className="dt-sk h-[12px] w-1/3 mb-2" />
            <div
              className="dt-sk h-[22px]"
              style={{ width: `${80 - i * 10}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div
        className="text-center py-7 text-[13.5px]"
        style={{ color: "var(--dt-text-muted)" }}>
        {emptyText}
      </div>
    );
  }

  const { axisMax, ticks } = niceAxis(
    Math.max(...items.map((i) => i.value), 0),
    integer,
  );
  const pos = (v: number) => `${(Math.max(0, v) / axisMax) * 100}%`;

  return (
    <div className="px-2">
      <div
        className="relative border-l"
        style={{ borderColor: "var(--dt-text-muted)" }}>
        {/* Lưới dọc */}
        {ticks.slice(1).map((t) => (
          <span
            key={t}
            className="absolute top-0 bottom-0 w-px pointer-events-none"
            style={{ left: pos(t), background: "var(--dt-border)" }}
          />
        ))}

        <div className="relative space-y-[10px] py-1">
          {items.map((it) => (
            <div
              key={it.id}
              title={it.title ?? `${it.label} — ${formatValue(it.value)}`}>
              <div
                className="text-[13px] pl-3 pr-2 truncate leading-[20px]"
                style={{ color: "var(--dt-text-secondary)" }}>
                {it.label}
              </div>
              <div className="flex items-center h-[24px]">
                <span
                  className="block h-full dt-bar-fill shrink-0"
                  style={{ width: pos(it.value), background: barColor }}
                />
                <span className="dt-mono text-[12.5px] font-semibold pl-2 whitespace-nowrap">
                  {formatValue(it.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nhãn trục X */}
      <div className="relative h-[22px] mt-[6px]">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute top-0 -translate-x-1/2 text-[12px] dt-mono whitespace-nowrap"
            style={{ left: pos(t), color: "var(--dt-text-muted)" }}>
            {formatAxis(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
