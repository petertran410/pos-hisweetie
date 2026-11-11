"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useProduct } from "@/lib/hooks/useProducts";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { ProductDetailContent } from "../products/ProductDetailContent";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
}

export function ProductDetailModal(props: ProductDetailModalProps) {
  const canView = usePermission("products", "view");
  const userId = useAuthStore((state) => state.user?.id);
  const isProfileSynced = useAuthStore((state) => state.isProfileSynced);
  const branchId = useBranchStore((state) => state.selectedBranch?.id);
  const context = `${userId ?? ""}:${branchId ?? ""}`;
  const [openedContext] = useState(context);
  const authorized =
    isProfileSynced && canView && !!userId && context === openedContext;
  const { isOpen, onClose } = props;

  useEffect(() => {
    if (isOpen && !authorized) onClose();
  }, [isOpen, authorized, onClose]);

  if (!isOpen || !authorized) return null;

  return <ProductDetailModalContent {...props} />;
}

function ProductDetailModalContent({
  productId,
  onClose,
}: ProductDetailModalProps) {
  const user = useAuthStore((state) => state.user);
  const branchId = useBranchStore((state) => state.selectedBranch?.id);
  const cacheScope = JSON.stringify([
    "pos-detail",
    user?.id,
    branchId,
    [...(user?.permissions ?? [])].sort(),
    [...(user?.roles ?? [])].sort(),
  ]);
  const {
    data: product,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useProduct(productId, {
    cacheScope,
    retry: false,
    refetchOnMount: "always",
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      const image = document.querySelector<HTMLElement>(
        "[data-attachment-preview]",
      );
      const child = document.querySelector<HTMLElement>(
        "[data-product-detail-overlay]",
      );
      if (event.key === "Escape" && !image && !child) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const activeDialog = image ?? child ?? dialogRef.current;
      if (!activeDialog) return;
      const focusable = Array.from(
        activeDialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const outside = !activeDialog.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || outside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, [onClose]);

  const loading = isPending || isFetching;

  return createPortal(
    <div className="fixed inset-0 z-[99] flex items-end justify-center lg:items-center lg:p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[95dvh] w-full min-w-0 flex-col rounded-t-lg bg-white lg:h-[90dvh] lg:max-w-6xl lg:rounded-lg">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 lg:px-5 lg:py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold lg:text-lg">
              Chi tiết sản phẩm
            </h2>
            {!loading && !isError && product && (
              <p className="mt-1 break-words text-sm text-gray-500">
                {product.code}: {product.name}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết sản phẩm"
            title="Đóng"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-100 focus-visible:outline-brand">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <div
            role="status"
            className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            Đang tải chi tiết…
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center text-sm text-gray-600">
            <p>{error?.message || "Không thể tải thông tin sản phẩm."}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded border px-3 py-2 hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        ) : product ? (
          <ProductDetailContent
            key={product.id}
            product={product}
            readOnly
            overlayZIndex={110}
          />
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            Không tìm thấy thông tin sản phẩm.
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
