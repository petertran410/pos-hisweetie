"use client";

import { useRouter } from "next/navigation";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import { useCreatePackingLoading } from "@/lib/hooks/usePackingLoadings";
import { toast } from "sonner";

export default function LoadingPage() {
  const router = useRouter();
  const createPackingLoading = useCreatePackingLoading();

  const handleSubmit = async (formData: any) => {
    try {
      const created = await createPackingLoading.mutateAsync(formData);
      toast.success(
        created?.code
          ? `Tạo loading thành công · ${created.code}`
          : "Tạo loading thành công",
      );
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Tạo loading thất bại",
      );
      throw error;
    }
  };

  return (
    <div className="min-h-screen">
      <PackingLoadingForm
        onClose={() => router.push("/bao-don")}
        onSubmit={handleSubmit}
        enableDocumentQrScanner
      />
    </div>
  );
}
