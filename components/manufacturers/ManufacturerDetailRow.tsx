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
  onEdit,
}: {
  id: number;
  colSpan: number;
  view: ManufacturerView;
  onViewChange: (view: ManufacturerView) => void;
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
    const container = scrollElement;
    const update = () => {
      const width = `${container.clientWidth}px`;
      if (element.style.width !== width) element.style.width = width;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50 p-0"
      >
        <div
          ref={wrapper}
          className="sticky left-0 bg-gray-50"
          style={{ width: 0 }}
        >
          <ManufacturerDetailPanel
            id={id}
            view={view}
            onEdit={onEdit}
            embedded
            onViewChange={onViewChange}
          />
        </div>
      </td>
    </tr>
  );
}
