"use client";

import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { QuoteTemplatesSettings } from "@/components/quote-templates/QuoteTemplatesSettings";

export default function QuoteTemplatesPage() {
  return (
    <PagePermissionGuard resource="quote_templates" action="view">
      <QuoteTemplatesSettings />
    </PagePermissionGuard>
  );
}
