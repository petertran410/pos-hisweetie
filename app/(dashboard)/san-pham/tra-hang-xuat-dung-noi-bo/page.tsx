"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { InternalUseReturnsSidebar } from "@/components/internal-use-returns/InternalUseReturnsSidebar";
import { InternalUseReturnsTable } from "@/components/internal-use-returns/InternalUseReturnsTable";
import { CreateInternalUseReturnModal } from "@/components/internal-use-returns/CreateInternalUseReturnModal";
import { ConfirmInternalUseReturnModal } from "@/components/internal-use-returns/ConfirmInternalUseReturnModal";
import type { InternalUseReturn } from "@/lib/types/internal-use-return";
import type { InternalUseReturnQuery } from "@/lib/api/internal-use-returns";
import { useCan } from "@/lib/hooks/useCan";

type Modal =
  | { type: "create"; returnId?: number; internalUseId?: number }
  | { type: "confirm"; returnId: number; readOnly?: boolean }
  | null;

export default function InternalUseReturnsPage() {
  const searchParams = useSearchParams();
  const canCreate = useCan("internal-use-returns", "create");
  const codeParam = searchParams.get("Code");
  const initialInternalUseId = Number(searchParams.get("internalUseId") || 0);
  const [filters, setFilters] = useState<InternalUseReturnQuery>(() =>
    codeParam ? { search: codeParam } : {}
  );
  const [modal, setModal] = useState<Modal>(() =>
    initialInternalUseId
      ? { type: "create", internalUseId: initialInternalUseId }
      : null
  );

  const handleFiltersChange = useCallback((nextFilters: InternalUseReturnQuery) => {
    setFilters(nextFilters);
  }, []);

  const close = () => setModal(null);

  const handleRowClick = (item: InternalUseReturn) => {
    if (
      item.status === 4 &&
      canCreate
    ) {
      setModal({ type: "create", returnId: item.id });
      return;
    }
    setModal({
      type: "confirm",
      returnId: item.id,
      readOnly: item.status === 2 || item.status === 3,
    });
  };

  return (
    <PagePermissionGuard resource="internal-use-returns" action="view">
      <div className="flex h-full border-t" style={{ borderColor: "var(--dt-border)" }}>
        <InternalUseReturnsSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <InternalUseReturnsTable
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateClick={() => setModal({ type: "create" })}
          onViewClick={handleRowClick}
        />

        {modal?.type === "create" && (
          <CreateInternalUseReturnModal
            returnId={modal.returnId}
            initialInternalUseId={modal.internalUseId}
            onClose={close}
            onSuccess={close}
          />
        )}
        {modal?.type === "confirm" && (
          <ConfirmInternalUseReturnModal
            returnId={modal.returnId}
            readOnly={modal.readOnly}
            onClose={close}
            onSuccess={close}
          />
        )}
      </div>
    </PagePermissionGuard>
  );
}
