"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { useCreatePackingSlip } from "@/lib/hooks/usePackingSlips";
import { toast } from "sonner";

export default function GiaoHangPage() {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const createPackingSlip = useCreatePackingSlip();

  const handleSubmit = async (formData: any) => {
    try {
      await createPackingSlip.mutateAsync(formData);
      toast.success("Tạo giao hàng thành công");
      setFormKey((k) => k + 1);
    } catch {
      toast.error("Tạo giao hàng thất bại");
    }
  };

  return (
    <div className="min-h-screen">
      <PackingSlipForm
        key={formKey}
        onClose={() => router.push("/bao-don")}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
