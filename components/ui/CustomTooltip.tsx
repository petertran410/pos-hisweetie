"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface CustomTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

export function CustomTooltip({
  content,
  children,
  delayMs = 200,
  className = "",
}: CustomTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    placement: "top" | "bottom";
    ready: boolean;
  }>({
    top: 0,
    left: 0,
    arrowLeft: 0,
    placement: "top",
    ready: false,
  });

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = (zoomFactor: number = 1) => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl.offsetWidth;
    const tooltipHeight = tooltipEl.offsetHeight;

    const padding = 8;
    const spaceAbove = triggerRect.top;
    const placement: "top" | "bottom" =
      spaceAbove < tooltipHeight + 12 &&
      window.innerHeight - triggerRect.bottom > spaceAbove
        ? "bottom"
        : "top";

    const desiredLeft = triggerCenterX - tooltipWidth / 2;
    const maxLeft = Math.max(padding, window.innerWidth - tooltipWidth - padding);
    const clampedLeft = Math.max(padding, Math.min(maxLeft, desiredLeft));

    const rawArrowLeft = triggerCenterX - clampedLeft;
    const arrowLeftClamped = Math.max(
      12,
      Math.min(tooltipWidth - 12, rawArrowLeft)
    );

    const top =
      placement === "top"
        ? triggerRect.top - tooltipHeight - 8
        : triggerRect.bottom + 8;

    // position:fixed bị nhân thêm CSS zoom của <html> → chia hệ số để khớp.
    // Mũi tên là con của tooltip (cùng bị scale) nên cũng chia hệ số.
    setCoords({
      top: top / zoomFactor,
      left: clampedLeft / zoomFactor,
      arrowLeft: arrowLeftClamped / zoomFactor,
      placement,
      ready: true,
    });
  };

  // App áp dụng CSS zoom trên <html> (vd 0.85). getBoundingClientRect() trả px
  // đã scale, nhưng position:fixed lại nhân thêm zoom → phải chia lại hệ số.
  const getHtmlZoomFactor = () => {
    if (typeof document === "undefined") return 1;
    const zoom = getComputedStyle(document.documentElement).zoom;
    if (zoom && zoom !== "none") {
      const parsed = parseFloat(String(zoom));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  };

  useIsomorphicLayoutEffect(() => {
    if (!visible) {
      setCoords((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }

    const zoomFactor = getHtmlZoomFactor();
    calculatePosition(zoomFactor);

    const rafId = requestAnimationFrame(() => {
      calculatePosition(zoomFactor);
    });

    // Đo lại vị trí khi kích thước tooltip thay đổi (ví dụ font load xong)
    let lastWidth = 0;
    let lastHeight = 0;
    const tooltipEl = tooltipRef.current;
    let observer: ResizeObserver | null = null;
    if (tooltipEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        const w = entry?.contentRect.width ?? 0;
        const h = entry?.contentRect.height ?? 0;
        if (w !== lastWidth || h !== lastHeight) {
          lastWidth = w;
          lastHeight = h;
          calculatePosition(getHtmlZoomFactor());
        }
      });
      observer.observe(tooltipEl);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [visible]);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;

    const handleScrollOrResize = () => {
      setVisible(false);
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!content) return <>{children}</>;

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-flex items-center justify-center cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}>
        {children}
      </div>

      {mounted &&
        visible &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              opacity: coords.ready ? 1 : 0,
              visibility: coords.ready ? "visible" : "hidden",
            }}
            className={`z-[99999] px-2.5 py-1.5 text-xs text-white bg-gray-900/95 backdrop-blur-sm rounded-md shadow-xl whitespace-nowrap pointer-events-none transition-opacity duration-150 ${className}`}>
            {content}
            {coords.placement === "top" ? (
              <div
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"
              />
            ) : (
              <div
                style={{ left: `${coords.arrowLeft}px` }}
                className="absolute bottom-full -translate-x-1/2 border-4 border-transparent border-b-gray-900/95"
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}

