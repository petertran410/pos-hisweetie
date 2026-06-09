import "@/app/dashboard.css";

export default function KhachHangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dt-dash h-full">{children}</div>;
}
