"use client";

import type { RecentActivity } from "@/lib/api/dashboard";
import { money, timeAgo } from "@/lib/dashboard/format";
import { ShoppingCart } from "lucide-react";

interface Props {
  items: RecentActivity[];
}

export function ActivityFeed({ items }: Props) {
  if (!items.length) {
    return (
      <div className="text-center py-7 text-[13px]" style={{ color: "var(--dt-text-muted)" }}>
        Chưa có hoạt động
      </div>
    );
  }

  return (
    <div className="max-h-[540px] overflow-auto py-[6px]">
      {items.map((a, i) => (
        <div
          key={a.id}
          className="flex gap-[13px] px-5 py-3 relative transition hover:bg-[var(--dt-bg-soft)]">
          {/* đường nối timeline */}
          {i < items.length - 1 && (
            <span
              className="absolute left-[34px] top-[42px] -bottom-3 w-[2px]"
              style={{ background: "var(--dt-border)" }}
            />
          )}
          <span
            className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-none z-[1] bg-white"
            style={{
              boxShadow: "0 0 0 4px #fff",
              color: "var(--dt-primary)",
              background: "rgba(0,183,204,.12)",
            }}>
            <ShoppingCart className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] leading-relaxed">
              <b className="font-semibold" style={{ color: "var(--dt-primary-deep)" }}>
                {a.customerName}
              </b>{" "}
              vừa đặt hàng{" "}
              <span className="dt-mono font-semibold" style={{ color: "var(--dt-primary-deep)" }}>
                {a.code}
              </span>{" "}
              trị giá{" "}
              <span className="font-semibold">{money(a.grandTotal)}</span>
            </div>
            <div className="flex items-center gap-[7px] mt-[3px] text-[12px]" style={{ color: "var(--dt-text-muted)" }}>
              <time className="dt-mono">{timeAgo(a.createdAt)}</time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
