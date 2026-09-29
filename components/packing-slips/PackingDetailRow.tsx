"use client";

import { useLayoutEffect, useRef } from "react";
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
  const { data, isLoading, isFetching } = usePackingDetail(
    type,
    item.id,
    item,
    true
  );

  useLayoutEffect(() => {
    wrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b-2 border-l-2 border-r-2 border-brand">
        <div ref={wrapperRef} className="bg-brand-soft px-4 py-4">
          <PackingDetailContent
            item={item}
            detail={data}
            isLoading={isFetching && isLoading}
            compact
          />
          <div className="mt-4 border-t border-brand/20 pt-3">
            <PackingDetailActions
              type={type}
              cancelledAt={data?.cancelledAt ?? item.cancelledAt}
              onEdit={onEdit}
              onDelete={onDelete}
              onResend={onResend}
              onResendLark={onResendLark}
              onResendLoadingLark={onResendLoadingLark}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}
