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
      {/* palette-orig: báo cáo giữ sáng trong bảng Tối cho tới khi chuyển màu viết cứng (đợt 2). */}
      <div className="palette-orig flex-1 min-w-0 flex overflow-hidden">
        {children}
      </div>
    </div>
  );
}
