"use client";

import { use } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { RecipeForm } from "@/components/recipes/RecipeForm";

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const recipeId = Number(id);

  if (!Number.isInteger(recipeId) || recipeId <= 0) {
    return (
      <PagePermissionGuard resource="recipes" action="view">
        <div className="flex h-full items-center justify-center bg-[#f5fafb] p-6">
          <div className="max-w-md rounded-xl border bg-white p-8 text-center" style={{ borderColor: "var(--dt-border)" }}>
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-4 text-xl font-semibold text-[#0D3B42]">Đường dẫn công thức không hợp lệ</h1>
            <p className="mt-2 text-sm text-gray-500">Vui lòng quay lại danh sách và chọn một công thức khác.</p>
            <Link href="/san-pham/pha-che" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white">Quay lại danh sách</Link>
          </div>
        </div>
      </PagePermissionGuard>
    );
  }

  return <PagePermissionGuard resource="recipes" action="view"><RecipeForm mode="edit" recipeId={recipeId} /></PagePermissionGuard>;
}
