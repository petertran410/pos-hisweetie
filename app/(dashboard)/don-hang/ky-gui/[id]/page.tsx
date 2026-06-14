"use client";

import { ConsignmentForm } from "@/components/consignments/ConsignmentForm";
import { useConsignment } from "@/lib/hooks/useConsignments";
import { useParams } from "next/navigation";

export default function EditConsignmentPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: consignment, isLoading } = useConsignment(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return <ConsignmentForm consignment={consignment || null} />;
}
