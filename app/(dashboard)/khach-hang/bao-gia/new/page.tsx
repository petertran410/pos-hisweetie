import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { QuoteForm } from "@/components/quotes/QuoteForm";

export default function NewQuotePage() {
  return (
    <PagePermissionGuard resource="quotes" action="create">
      <QuoteForm />
    </PagePermissionGuard>
  );
}
