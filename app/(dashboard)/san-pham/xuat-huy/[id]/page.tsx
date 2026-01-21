"use client";

import { DestructionForm } from "@/components/destructions/DestructionForm";
import { useDestruction } from "@/lib/hooks/useDestructions";
import { useParams } from "next/navigation";

export default function EditDestructionPage() {
  const params = useParams();
  const id = Number(params.id);
  const { data: destruction, isLoading } = useDestruction(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return <DestructionForm destruction={destruction || null} />;
}
