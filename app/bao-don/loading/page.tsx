"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import { useCreatePackingLoading } from "@/lib/hooks/usePackingLoadings";
import { toast } from "sonner";

export default function LoadingPage() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const createPackingLoading = useCreatePackingLoading();

  const handleSubmit = async (formData: any) => {
    try {
      await createPackingLoading.mutateAsync(formData);
      toast.success("Tạo loading thành công");
      setFormKey((k) => k + 1);
    } catch {
      toast.error("Tạo loading thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PackingLoadingForm
        key={formKey}
        onClose={() => router.push("/bao-don")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
