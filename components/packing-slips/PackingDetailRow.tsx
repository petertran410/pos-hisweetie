"use client";

import { useLayoutEffect, useRef } from "react";
import { CodeLink } from "@/components/shared/CodeLink";
import {
  usePackingDetail,
  type PackingItemType,
} from "@/lib/hooks/usePackingDetail";
import { PackingDetailActions } from "./PackingDetailActions";
import { PackingDetailContent } from "./PackingDetailContent";

interface PackingDetailRowProps {
  item: any;
  colSpan: number;
  onEdit: () => void;
  onDelete: () => void;
  onResend?: () => void;
  onResendLark?: () => void;
  onResendLoadingLark?: () => void;
}

const TYPE_BADGE: Record<PackingItemType, { text: string; className: string }> =
  {
    "giao-hang": {
      text: "Giao hàng",
      className: "bg-green-100 text-green-700",
    },
    "dong-hang": {
      text: "Đóng hàng",
      className: "bg-blue-100 text-blue-700",
    },
    loading: {
      text: "Loading",
      className: "bg-purple-100 text-purple-700",
    },
  };

export function PackingDetailRow({
  item,
  colSpan,
  onEdit,
  onDelete,
  onResend,
  onResendLark,
  onResendLoadingLark,
}: PackingDetailRowProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const type = (item.type || "giao-hang") as PackingItemType;
  const { data, isFetching } = usePackingDetail(type, item.id, item, true);
  const detail = data || item;
  const badge = TYPE_BADGE[type] ?? TYPE_BADGE["giao-hang"];

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const ox = getComputedStyle(scrollEl).overflowX;
      if (ox === "auto" || ox === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;

    let rafId = 0;
    const setWidth = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const next = `${scrollEl!.clientWidth}px`;
        if (el.style.width !== next) el.style.width = next;
      });
    };
    setWidth();
    window.addEventListener("resize", setWidth);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", setWidth);
    };
  }, [detail?.id, type]);

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
        <div
          ref={wrapperRef}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <CodeLink
                    entity="packing-slip"
                    code={detail.code}
                    className="text-lg font-bold text-brand hover:underline"
                  />
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}>
                    {badge.text}
                  </span>
                  {detail.cancelledAt && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                      Đã hủy
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                  {detail.branch?.name || "-"}
                </span>
              </div>

              <PackingDetailContent
                item={item}
                detail={data}
                isLoading={isFetching}
              />

              <div className="pt-4 mt-4 border-t border-gray-200">
                <PackingDetailActions
                  type={type}
                  cancelledAt={detail.cancelledAt}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResend={onResend}
                  onResendLark={onResendLark}
                  onResendLoadingLark={onResendLoadingLark}
                />
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
