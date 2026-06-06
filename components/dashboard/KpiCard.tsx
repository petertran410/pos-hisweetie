"use client";

import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export type DeltaDir = "up" | "down" | "flat";

interface KpiCardProps {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  name: string;
  value: string;
  valueSuffix?: string;
  delta?: string;
  deltaDir?: DeltaDir;
  vs?: string;
  accent?: string;
}

export function KpiCard({
  icon,
  iconBg,
  iconColor,
  name,
  value,
  valueSuffix,
  delta,
  deltaDir = "flat",
  vs,
  accent = "#00B7CC",
}: KpiCardProps) {
  const deltaColor =
    deltaDir === "up"
      ? "#2E8B8F"
      : deltaDir === "down"
        ? "#C0392B"
        : "#5A8A92";

  return (
    <div className="dt-kpi relative overflow-hidden p-[18px]">
      <div className="flex items-center gap-[9px] mb-[13px]">
        <span
          className="w-[34px] h-[34px] rounded-[9px] grid place-items-center flex-none"
          style={{ background: iconBg, color: iconColor }}>
          {icon}
        </span>
        <span
          className="text-[12.5px] font-medium leading-tight"
          style={{ color: "var(--dt-text-secondary)" }}>
          {name}
        </span>
      </div>
      <div
        className="text-[27px] font-bold leading-[1.1] tracking-tight dt-mono"
        style={{ fontFamily: "var(--font-montserrat), sans-serif" }}>
        {value}
        {valueSuffix && (
          <small
            className="text-[14px] font-semibold ml-0.5"
            style={{ color: "var(--dt-text-muted)" }}>
            {valueSuffix}
          </small>
        )}
      </div>
      <div className="flex items-center gap-2 mt-[9px] text-[12.5px]">
        {delta && (
          <span
            className="inline-flex items-center gap-[3px] font-semibold dt-mono"
            style={{ color: deltaColor }}>
            {deltaDir === "up" && <TrendingUp className="w-[13px] h-[13px]" />}
            {deltaDir === "down" && (
              <TrendingDown className="w-[13px] h-[13px]" />
            )}
            {delta}
          </span>
        )}
        {vs && (
          <span style={{ color: "var(--dt-text-muted)" }}>{vs}</span>
        )}
      </div>
      <div
        className="mt-3 h-[3px] rounded-[3px] overflow-hidden"
        style={{ background: "var(--dt-border)" }}>
        <span
          className="block h-full rounded-[3px] dt-bar-fill"
          style={{ background: accent, width: "70%" }}
        />
      </div>
    </div>
  );
}
