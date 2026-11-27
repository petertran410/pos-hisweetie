"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { NewProductPriceSidebar } from "@/components/new-product-price/NewProductPriceSidebar";
import { NewProductPriceTable } from "@/components/new-product-price/NewProductPriceTable";
import { NewProductPriceFormModal } from "@/components/new-product-price/NewProductPriceFormModal";
import { NewProductPriceConfigModal } from "@/components/new-product-price/NewProductPriceConfigModal";
import type { NppFilters } from "@/lib/types/new-product-price";

/**
 * Bảng giá sản phẩm mới (chuyển từ Lark Base): Đề xuất → Thu Mua → Kế Toán → Kinh Doanh
 * → CEO → Phòng Dữ Liệu (áp dụng tạo sản phẩm). Link ?Code=SPM000001 mở sẵn phiếu
 * (&open=1: mở luôn modal Xử lý bước / Duyệt — link trong tin Lark),
 * ?stage=PURCHASING lọc sẵn bước (link trong tin nhắc việc Lark).
 */
export default function NewProductPricePage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code")?.trim() || null;
  const openAction = searchParams.get("open") === "1";
  const stageParam = searchParams.get("stage")?.trim() || null;
  const [filters, setFilters] = useState<NppFilters>({});
  const [creating, setCreating] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const onFilters = useCallback((f: NppFilters) => setFilters(f), []);

  return (
    <PagePermissionGuard resource="new_product_price" action="view">
      <div
        className="flex h-full border-t"
        style={{ borderColor: "var(--dt-border)" }}>
        <div className="hidden md:flex">
          <NewProductPriceSidebar
            key={stageParam ?? ""}
            initialStage={stageParam}
            onChange={onFilters}
          />
        </div>
        <NewProductPriceTable
          key={codeParam ?? ""}
          filters={filters}
          initialQuery={codeParam ?? ""}
          openCode={codeParam}
          openAction={openAction}
          onCreateClick={() => setCreating(true)}
          onConfigClick={() => setConfigOpen(true)}
        />
      </div>
      {creating && (
        <NewProductPriceFormModal onClose={() => setCreating(false)} />
      )}
      {configOpen && (
        <NewProductPriceConfigModal onClose={() => setConfigOpen(false)} />
      )}
    </PagePermissionGuard>
  );
}
