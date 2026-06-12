"use client";

import { InternalUseForm } from "@/components/internal-uses/InternalUseForm";
import { useInternalUse } from "@/lib/hooks/useInternalUses";
import { useParams } from "next/navigation";

export default function EditInternalUsePage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: internalUse, isLoading } = useInternalUse(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return <InternalUseForm internalUse={internalUse || null} />;
}
