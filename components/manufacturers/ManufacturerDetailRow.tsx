"use client";

import { useLayoutEffect, useRef } from "react";
import type { Manufacturer } from "@/lib/api/manufacturers";
import type { ManufacturerView } from "./ManufacturerSidebar";
import { ManufacturerDetailPanel } from "./ManufacturerDetailPanel";

export function ManufacturerDetailRow({
  id,
  colSpan,
  view,
  onViewChange,
  onClose,
  onEdit,
}: {
  id: number;
  colSpan: number;
  view: ManufacturerView;
  onViewChange: (view: ManufacturerView) => void;
  onClose: () => void;
  onEdit: (value: Manufacturer) => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    let scrollElement = element.parentElement;
    while (
      scrollElement &&
      !["auto", "scroll"].includes(getComputedStyle(scrollElement).overflowX)
    ) {
      scrollElement = scrollElement.parentElement;
    }
    if (!scrollElement) return;
    const update = () => {
      element.style.width = `${scrollElement.clientWidth}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scrollElement.parentElement ?? scrollElement);
    return () => observer.disconnect();
  }, []);
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50 p-0"
      >
        <div
          ref={wrapper}
          className="sticky left-0 bg-white"
          style={{ width: 0 }}
        >
          <ManufacturerDetailPanel
            id={id}
            view={view}
            onBack={onClose}
            onEdit={onEdit}
            embedded
            onViewChange={onViewChange}
          />
        </div>
      </td>
    </tr>
  );
}
