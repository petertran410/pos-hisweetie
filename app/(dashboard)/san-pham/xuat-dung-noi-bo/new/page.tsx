"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { InternalUseForm } from "@/components/internal-uses/InternalUseForm";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useInternalUse } from "@/lib/hooks/useInternalUses";

export default function NewInternalUsePage() {
  const searchParams = useSearchParams();
  const rawCopyId = searchParams.get("copyInternalUseId");
  const parsedCopyId = rawCopyId ? Number(rawCopyId) : 0;
  const copyId =
    Number.isInteger(parsedCopyId) && parsedCopyId > 0 ? parsedCopyId : 0;
  const hasInvalidCopyId = !!rawCopyId && copyId === 0;
  const warnedRef = useRef(false);

  const {
    data: copySource,
    isFetching,
    isError,
  } = useInternalUse(copyId);
  const isWaitingForCopy = copyId > 0 && isFetching && !copySource;

  useEffect(() => {
    if (warnedRef.current) return;
    if (hasInvalidCopyId || (copyId > 0 && isError)) {
      warnedRef.current = true;
      toast.error(
        "Không thể tải phiếu để sao chép. Bạn vẫn có thể tạo phiếu mới.",
      );
    }
  }, [hasInvalidCopyId, copyId, isError]);

  const copyFrom = copyId > 0 && !isError ? copySource ?? null : null;

  return (
    <PagePermissionGuard resource="internal-use" action="create">
      {isWaitingForCopy ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Đang tải...</div>
        </div>
      ) : (
        <InternalUseForm key={copyFrom?.id ?? "new"} copyFrom={copyFrom} />
      )}
    </PagePermissionGuard>
  );
}
