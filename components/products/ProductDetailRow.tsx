"use client";

import { useLayoutEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useProduct } from "@/lib/hooks/useProducts";
import { ProductDetailContent } from "./ProductDetailContent";

interface ProductDetailRowProps {
  productId: number;
  colSpan: number;
}

export function ProductDetailRow({
  productId,
  colSpan,
}: ProductDetailRowProps) {
  const { data: product, isLoading, isError, refetch } = useProduct(productId);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;
    let scrollElement: HTMLElement | null = element.parentElement;
    while (scrollElement) {
      const overflow = getComputedStyle(scrollElement).overflowX;
      if (overflow === "auto" || overflow === "scroll") break;
      scrollElement = scrollElement.parentElement;
    }
    if (!scrollElement) return;
    const container = scrollElement;
    let frame = 0;
    const setWidth = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = `${container.clientWidth}px`;
        // Avoid ResizeObserver feedback when the scrollbar changes.
        if (element.style.width !== width) element.style.width = width;
      });
    };
    setWidth();
    const observer = new ResizeObserver(setWidth);
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [product]);

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand p-0"
        style={{ width: 0 }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            <span className="text-sm text-gray-500">Đang tải chi tiết…</span>
          </div>
        ) : isError || !product ? (
          <div className="space-y-3 py-8 text-center text-sm text-gray-500">
            <p>Không thể tải thông tin sản phẩm.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-brand hover:underline">
              Thử lại
            </button>
          </div>
        ) : (
          <div ref={wrapperRef} className="sticky left-0">
            <ProductDetailContent key={product.id} product={product} />
          </div>
        )}
      </td>
    </tr>
  );
}
