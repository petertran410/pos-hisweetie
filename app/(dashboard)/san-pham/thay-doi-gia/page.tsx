"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { PriceChangeSidebar } from "@/components/price-change/PriceChangeSidebar";
import { PriceChangeTable } from "@/components/price-change/PriceChangeTable";
import { PriceChangeFormModal } from "@/components/price-change/PriceChangeFormModal";
import { PriceChangeConfigModal } from "@/components/price-change/PriceChangeConfigModal";
import { PriceChangeImportModal } from "@/components/price-change/PriceChangeImportModal";
import { pcHref } from "@/lib/price-change/constants";
import type { PcFilters } from "@/lib/types/price-change";

/**
 * Thay đổi giá sản phẩm (chuyển từ Lark Base). Chỉ đổi giá bán: Đề xuất → Kế toán trưởng
 * → Phòng Dữ Liệu; có đổi giá vốn: thêm CEO trước Phòng Dữ Liệu. Link ?Code=TDG000001
 * mở sẵn phiếu (&open=1: mở luôn modal duyệt / áp dụng — link trong tin Lark).
 */
export default function PriceChangePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code")?.trim() || null;
  const openAction = searchParams.get("open") === "1";
  const stageParam = searchParams.get("stage")?.trim() || null;
  const [filters, setFilters] = useState<PcFilters>({});
  const [creating, setCreating] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const onFilters = useCallback((f: PcFilters) => setFilters(f), []);

  return (
    <PagePermissionGuard resource="price_change" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="hidden md:flex">
          <PriceChangeSidebar
            key={stageParam ?? ""}
            initialStage={stageParam}
            onChange={onFilters}
          />
        </div>
        <PriceChangeTable
          key={codeParam ?? ""}
          filters={filters}
          initialQuery={codeParam ?? ""}
          openCode={codeParam}
          openAction={openAction}
          onCreateClick={() => setCreating(true)}
          onConfigClick={() => setConfigOpen(true)}
          onImportClick={() => setImportOpen(true)}
        />
      </div>
      {creating && (
        <PriceChangeFormModal
          onClose={() => setCreating(false)}
          onCreated={(code) => router.replace(pcHref(code))}
        />
      )}
      {configOpen && (
        <PriceChangeConfigModal onClose={() => setConfigOpen(false)} />
      )}
      {importOpen && (
        <PriceChangeImportModal onClose={() => setImportOpen(false)} />
      )}
    </PagePermissionGuard>
  );
}
