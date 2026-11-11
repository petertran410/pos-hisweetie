"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";

const ProductDetailModal = dynamic(
  () =>
    import("./ProductDetailModal").then((module) => module.ProductDetailModal),
  { ssr: false },
);

interface ProductCodeButtonProps {
  productId: number;
  code: string;
}

const codeClassName = "break-all text-left text-xs font-medium lg:text-sm";

export function ProductCodeButton(props: ProductCodeButtonProps) {
  const canView = usePermission("products", "view");
  const userId = useAuthStore((state) => state.user?.id);
  const isProfileSynced = useAuthStore((state) => state.isProfileSynced);
  const branchId = useBranchStore((state) => state.selectedBranch?.id);

  if (!isProfileSynced || !canView || !userId || props.productId <= 0) {
    return (
      <span className={`${codeClassName} text-gray-500`}>{props.code}</span>
    );
  }

  return (
    <AuthorizedProductCodeButton
      key={`${userId}:${branchId ?? ""}`}
      {...props}
    />
  );
}

function AuthorizedProductCodeButton({
  productId,
  code,
}: ProductCodeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Xem sản phẩm ${code}`}
        aria-haspopup="dialog"
        className={`${codeClassName} text-brand hover:underline focus-visible:outline-brand`}>
        {code}
      </button>
      {isOpen && (
        <ProductDetailModal isOpen onClose={onClose} productId={productId} />
      )}
    </>
  );
}
