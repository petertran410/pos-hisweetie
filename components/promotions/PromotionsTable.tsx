"use client";

import { Fragment, useEffect, useState } from "react";
import {
  Promotion,
  PROMOTION_TYPE_LABELS,
  PROMOTION_STATUS_LABELS,
} from "@/lib/types/promotion";
import { useTogglePromotion, useStopPromotion } from "@/lib/hooks/usePromotions";
import { Pencil, Ban, ChevronDown } from "lucide-react";
import { PromotionDetailRow } from "./PromotionDetailRow";

interface Props {
  promotions: Promotion[];
  loading?: boolean;
  onEdit: (p: Promotion) => void;
  /** Mã KM cần tự mở rộng khi vào trang qua deep-link (?Code=). */
  initialExpandCode?: string;
}

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  running: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  stopped: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-500",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN");
}

export function PromotionsTable({ promotions, loading, onEdit, initialExpandCode }: Props) {
  const toggleMut = useTogglePromotion();
  const stopMut = useStopPromotion();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [didAutoExpand, setDidAutoExpand] = useState(false);

  // Tự mở rộng KM khớp initialExpandCode (deep-link từ màn bán hàng), chỉ 1 lần.
  useEffect(() => {
    if (didAutoExpand || !initialExpandCode || promotions.length === 0) return;
    const match = promotions.find((p) => p.code === initialExpandCode);
    if (match) {
      setExpandedId(match.id);
      setDidAutoExpand(true);
    }
  }, [initialExpandCode, promotions, didAutoExpand]);

  const colSpan = 10;

  if (loading) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--dt-text-muted)" }}>
        Đang tải...
      </div>
    );
  }
  if (promotions.length === 0) {
    return (
      <div className="p-8 text-center" style={{ color: "var(--dt-text-muted)" }}>
        Chưa có chương trình khuyến mãi nào
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead
          className="text-left text-xs uppercase"
          style={{ background: "var(--dt-bg-soft)", color: "var(--dt-text-muted)" }}>
          <tr>
            <th className="w-8 px-3 py-2"></th>
            <th className="px-3 py-2">Mã</th>
            <th className="px-3 py-2">Tên</th>
            <th className="px-3 py-2">Loại</th>
            <th className="px-3 py-2">Thời gian</th>
            <th className="px-3 py-2 text-center">Ưu tiên</th>
            <th className="px-3 py-2 text-center">Lượt dùng</th>
            <th className="px-3 py-2 text-center">Trạng thái</th>
            <th className="px-3 py-2 text-center">Bật</th>
            <th className="px-3 py-2 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {promotions.map((p) => {
            const expanded = expandedId === p.id;
            return (
              <Fragment key={p.id}>
                <tr
                  className="cursor-pointer transition-colors border-t dt-row"
                  data-expanded={expanded}
                  style={{ borderColor: "var(--dt-border)" }}
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                >
                  <td className="px-3 py-2 text-center" style={{ color: "var(--dt-text-muted)" }}>
                    <ChevronDown
                      className={`inline h-4 w-4 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium dt-mono">{p.code}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{PROMOTION_TYPE_LABELS[p.type]}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--dt-text-secondary)" }}>
                    {fmtDate(p.startDate)} - {fmtDate(p.endDate)}
                  </td>
                  <td className="px-3 py-2 text-center">{p.priority}</td>
                  <td className="px-3 py-2 text-center">
                    {p._count?.logs ?? p.usageCount}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        statusColor[p.status] || "bg-gray-100"
                      }`}
                    >
                      {PROMOTION_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={p.status === "stopped"}
                      onClick={() =>
                        toggleMut.mutate({ id: p.id, isActive: !p.isActive })
                      }
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                        p.isActive ? "bg-green-500" : "bg-gray-300"
                      } disabled:opacity-40`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          p.isActive ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        title="Sửa"
                        onClick={() => onEdit(p)}
                        className="dt-icon-btn p-1 rounded transition-colors hover:text-[var(--dt-primary)]"
                        style={{ color: "var(--dt-text-secondary)" }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="Ngừng chương trình"
                        disabled={p.status === "stopped"}
                        onClick={() => {
                          if (confirm(`Ngừng chương trình "${p.name}"?`))
                            stopMut.mutate(p.id);
                        }}
                        className="p-1 rounded transition-colors text-gray-500 hover:text-red-600 disabled:opacity-40"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <PromotionDetailRow promotionId={p.id} colSpan={colSpan} />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
