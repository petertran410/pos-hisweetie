"use client";

import { useParams } from "next/navigation";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { QuoteForm } from "@/components/quotes/QuoteForm";

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PagePermissionGuard resource="quotes" action="update">
      <QuoteForm key={id} quoteId={Number(id)} />
    </PagePermissionGuard>
  );
}
