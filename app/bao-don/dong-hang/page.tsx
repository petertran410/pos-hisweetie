"use client";

import { useRouter } from "next/navigation";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { useCreatePackingHang } from "@/lib/hooks/usePackingHangs";
import { toast } from "sonner";

export default function DongHangPage() {
  const router = useRouter();
  const createPackingHang = useCreatePackingHang();

  const handleSubmit = async (formData: any) => {
    try {
      const created = await createPackingHang.mutateAsync(formData);
      toast.success(
        created?.code
          ? `Tạo đóng hàng thành công · ${created.code}`
          : "Tạo đóng hàng thành công",
      );
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Tạo đóng hàng thất bại",
      );
      throw error;
    }
  };

  return (
    <div className="min-h-screen">
      <PackingHangForm
        onClose={() => router.push("/bao-don")}
        onSubmit={handleSubmit}
        enableDocumentQrScanner
      />
    </div>
  );
}
