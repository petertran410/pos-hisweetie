import { DashboardHeader } from "@/components/layout/DashboardHeader";

export default function Home() {
  return (
    <div>
      <DashboardHeader />
      <div className="p-6">
        <h1 className="text-2xl font-bold">Home</h1>
        <p className="text-gray-600 mt-2">Trang này đang được phát triển</p>
      </div>
    </div>
  );
}
