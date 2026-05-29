"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { useCreatePackingHang } from "@/lib/hooks/usePackingHangs";
import { toast } from "sonner";

export default function DongHangPage() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const createPackingHang = useCreatePackingHang();

  const handleSubmit = async (formData: any) => {
    try {
      await createPackingHang.mutateAsync(formData);
      toast.success("Tạo đóng hàng thành công");
      setFormKey((k) => k + 1);
    } catch {
      toast.error("Tạo đóng hàng thất bại");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PackingHangForm
        key={formKey}
        onClose={() => router.push("/bao-don")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
