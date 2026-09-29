"use client";

import { useRouter } from "next/navigation";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { useCreatePackingSlip } from "@/lib/hooks/usePackingSlips";
import { toast } from "sonner";

export default function GiaoHangPage() {
  const router = useRouter();
  const createPackingSlip = useCreatePackingSlip();

  const handleSubmit = async (formData: any) => {
    try {
      const created = await createPackingSlip.mutateAsync(formData);
      toast.success(
        created?.code
          ? `Tạo giao hàng thành công · ${created.code}`
          : "Tạo giao hàng thành công",
      );
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Tạo giao hàng thất bại",
      );
      throw error;
    }
  };

  return (
    <div className="min-h-screen">
      <PackingSlipForm
        onClose={() => router.push("/bao-don")}
        onSubmit={handleSubmit}
        enableDocumentQrScanner
      />
    </div>
  );
}
