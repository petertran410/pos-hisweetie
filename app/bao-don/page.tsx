"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { PackingSlipForm } from "@/components/packing-slips/PackingSlipForm";
import { PackingHangForm } from "@/components/packing-hangs/PackingHangForm";
import { PackingLoadingForm } from "@/components/packing-loadings/PackingLoadingForm";
import { useCreatePackingSlip } from "@/lib/hooks/usePackingSlips";
import { useCreatePackingHang } from "@/lib/hooks/usePackingHangs";
import { useCreatePackingLoading } from "@/lib/hooks/usePackingLoadings";
import { toast } from "sonner";

type FormType = "giao-hang" | "dong-hang" | "loading" | null;

export default function BaoDonStandalonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  const [formType, setFormType] = useState<FormType>(null);
  const [formKey, setFormKey] = useState(0);

  // Auth guard thủ công (không có ProtectedRoute vì nằm ngoài dashboard layout)
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      const search = searchParams.toString();
      const fullPath = search ? `/bao-don?${search}` : "/bao-don";
      router.replace(`/login?returnUrl=${encodeURIComponent(fullPath)}`);
    }
  }, [isAuthenticated, _hasHydrated, router, searchParams]);

  // Đọc ?form= param để auto-open form
  useEffect(() => {
    const form = searchParams.get("form");
    if (form === "giao-hang" || form === "dong-hang" || form === "loading") {
      setFormType(form as FormType);
    }
  }, [searchParams]);

  const createPackingSlip = useCreatePackingSlip();
  const createPackingHang = useCreatePackingHang();
  const createPackingLoading = useCreatePackingLoading();

  const handleGiaoHangSubmit = async (formData: any) => {
    try {
      await createPackingSlip.mutateAsync(formData);
      toast.success("Tạo giao hàng thành công");
      setFormKey((k) => k + 1);
    } catch {
      toast.error("Tạo giao hàng thất bại");
    }
  };

  const handleDongHangSubmit = async (formData: any) => {
    try {
      await createPackingHang.mutateAsync(formData);
      toast.success("Tạo đóng hàng thành công");
      setFormKey((k) => k + 1);
    } catch {
      toast.error("Tạo đóng hàng thất bại");
    }
  };

  const handleLoadingSubmit = async (formData: any) => {
    try {
      await createPackingLoading.mutateAsync(formData);
      toast.success("Tạo loading thành công");
      setFormKey((k) => k + 1);
    } catch {
      toast.error("Tạo loading thất bại");
    }
  };

  // Loading / chưa auth
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Chưa chọn loại form (user ấn X hoặc vào link không có ?form=)
  if (!formType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm space-y-3">
          <h2 className="text-lg font-semibold text-center mb-4">
            Tạo báo đơn
          </h2>
          <button
            onClick={() => setFormType("giao-hang")}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Giao hàng
          </button>
          <button
            onClick={() => setFormType("dong-hang")}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Đóng hàng
          </button>
          <button
            onClick={() => setFormType("loading")}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {formType === "giao-hang" && (
        <PackingSlipForm
          key={formKey}
          onClose={() => setFormType(null)}
          onSubmit={handleGiaoHangSubmit}
        />
      )}
      {formType === "dong-hang" && (
        <PackingHangForm
          key={formKey}
          onClose={() => setFormType(null)}
          onSubmit={handleDongHangSubmit}
        />
      )}
      {formType === "loading" && (
        <PackingLoadingForm
          key={formKey}
          onClose={() => setFormType(null)}
          onSubmit={handleLoadingSubmit}
        />
      )}
    </div>
  );
}
