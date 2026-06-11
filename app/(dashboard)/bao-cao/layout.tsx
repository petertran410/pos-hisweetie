import "@/app/dashboard.css";
import { ReportHubSidebar } from "@/components/reports/ReportHubSidebar";

export default function BaoCaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="dt-dash flex h-full border-t"
      style={{ borderColor: "var(--dt-border)" }}>
      <ReportHubSidebar />
      <div className="flex-1 min-w-0 flex overflow-hidden">{children}</div>
    </div>
  );
}
