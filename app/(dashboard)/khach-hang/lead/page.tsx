"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { LeadsSidebar } from "@/components/leads/LeadsSidebar";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { LeadTemplatesModal } from "@/components/leads/LeadTemplatesModal";
import type { LeadFilters } from "@/lib/types/lead";

/** Lead: khách tiềm năng CSKH chăm sóc rồi chuyển giao Sale PIC (link mở ?Code=LEAD000012, link cũ ?id=). */
export default function LeadsPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("Code")?.trim() || null;
  const openId = Number(codeParam?.match(/^lead0*(\d+)$/i)?.[1]) || Number(searchParams.get("id")) || null;
  const [filters, setFilters] = useState<LeadFilters>({});
  const [creating, setCreating] = useState(false);
  const [editingTemplates, setEditingTemplates] = useState(false);
  const onFilters = useCallback((f: LeadFilters) => setFilters(f), []);

  return (
    <PagePermissionGuard resource="leads" action="view">
      <div className="flex h-full border-t" style={{ borderColor: "var(--dt-border)" }}>
        <div className="hidden md:flex">
          <LeadsSidebar onChange={onFilters} />
        </div>
        <LeadsTable
          // mã đổi → bỏ dòng đang mở, lọc theo mã mới và tự mở dòng đó
          key={codeParam ?? openId ?? ""}
          filters={filters}
          initialQuery={codeParam ?? ""}
          openId={openId}
          onCreateClick={() => setCreating(true)}
          onTemplatesClick={() => setEditingTemplates(true)}
        />
      </div>
      {creating && <LeadFormModal onClose={() => setCreating(false)} />}
      {editingTemplates && <LeadTemplatesModal onClose={() => setEditingTemplates(false)} />}
    </PagePermissionGuard>
  );
}
