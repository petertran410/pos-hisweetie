import { DashboardHeader } from "../../components/layout/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen flex flex-col">
      <DashboardHeader />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
