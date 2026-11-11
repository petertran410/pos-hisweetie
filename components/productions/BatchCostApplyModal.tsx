"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, RefreshCw, X } from "lucide-react";
import { productionsApi } from "@/lib/api/productions";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useApplyProductionCost } from "@/lib/hooks/useProductions";

const money = (value: number) =>
  `${value.toLocaleString("vi-VN", { maximumFractionDigits: 6 })} đ`;

export function BatchCostApplyModal({
  productionId,
  onClose,
}: {
  productionId: number;
  onClose: () => void;
}) {
  const canApply = usePermission("productions", "apply_cost");
  const [scope, setScope] = useState<"receiveBranch" | "allBranches">(
    "receiveBranch",
  );
  const preview = useQuery({
    queryKey: ["productions", productionId, "cost-application-preview", scope],
    queryFn: () => productionsApi.costApplicationPreview(productionId, scope),
    enabled: canApply,
    staleTime: 0,
    retry: false,
  });
  const apply = useApplyProductionCost();
  const confirm = () => {
    if (!canApply || !preview.data || preview.isFetching) return;
    apply.mutate(
      {
        id: productionId,
        data: {
          basis: "batch",
          scope,
          expectedCosts: preview.data.targets.map(({ branchId, cost }) => ({
            branchId,
            cost,
          })),
        },
      },
      {
        onSuccess: onClose,
        onError: () => {
          void preview.refetch();
        },
      },
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-batch-title"
        className="flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h2 id="apply-batch-title" className="text-base font-semibold">
            Áp dụng giá vốn
          </h2>
          <button
            title="Đóng"
            aria-label="Đóng xác nhận áp giá"
            onClick={onClose}
            disabled={apply.isPending}
            className="p-1"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 text-sm">
          {!canApply ? (
            <p role="alert" className="text-red-700">
              Bạn không có quyền Áp dụng giá vốn gia công.
            </p>
          ) : (
            <>
              {preview.data && (
                <div className="space-y-1">
                  <p className="font-medium">
                    {preview.data.code} · {preview.data.productName}
                  </p>
                  <p className="text-gray-500">{preview.data.variantLabel}</p>
                  <div className="flex flex-wrap justify-between gap-2 border-y py-3">
                    <span>Giá thành đợt đã chốt</span>
                    <strong className="text-brand">
                      {money(preview.data.unitCost)}
                    </strong>
                  </div>
                </div>
              )}
              <fieldset disabled={apply.isPending} className="space-y-2">
                <legend className="mb-2 font-medium">Phạm vi áp dụng</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={scope === "receiveBranch"}
                    onChange={() => setScope("receiveBranch")}
                  />
                  Chỉ kho nhận
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={scope === "allBranches"}
                    onChange={() => setScope("allBranches")}
                  />
                  Tất cả chi nhánh có sản phẩm
                </label>
              </fieldset>
              {preview.isFetching ? (
                <div className="flex items-center gap-2 py-4 text-gray-500">
                  <Loader2 size={16} className="animate-spin" />
                  Đang kiểm tra giá vốn và quyền kho...
                </div>
              ) : preview.isError ? (
                <div role="alert" className="space-y-2 text-red-700">
                  <p>{preview.error.message}</p>
                  <button
                    onClick={() => {
                      void preview.refetch();
                    }}
                    className="flex items-center gap-1 text-gray-700"
                  >
                    <RefreshCw size={14} />
                    Tải lại
                  </button>
                </div>
              ) : (
                preview.data && (
                  <div>
                    <dl className="divide-y border-y sm:hidden">
                      {preview.data.targets.map((item) => (
                        <div key={item.branchId} className="py-3">
                          <dt className="mb-2 font-medium">
                            {item.branchName}
                          </dt>
                          <dd className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="mb-1 block text-gray-500">
                                Hiện tại
                              </span>
                              <span className="break-all">
                                {money(item.cost)}
                              </span>
                            </div>
                            <div>
                              <span className="mb-1 block text-gray-500">
                                Chênh lệch
                              </span>
                              <span
                                className={`break-all ${item.delta > 0 ? "text-red-700" : item.delta < 0 ? "text-green-700" : ""}`}
                              >
                                {item.delta > 0 ? "+" : ""}
                                {money(item.delta)}
                              </span>
                            </div>
                            <div>
                              <span className="mb-1 block text-gray-500">
                                Sau áp
                              </span>
                              <strong className="break-all">
                                {money(preview.data!.unitCost)}
                              </strong>
                            </div>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <table className="hidden w-full text-right text-sm sm:table">
                      <thead className="border-b bg-gray-50 text-gray-500">
                        <tr>
                          <th className="p-2 text-left font-medium">Kho</th>
                          <th className="p-2 font-medium">Giá vốn hiện tại</th>
                          <th className="p-2 font-medium">Chênh lệch</th>
                          <th className="p-2 font-medium">Giá sau áp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.data.targets.map((item) => (
                          <tr key={item.branchId} className="border-b">
                            <td className="p-2 text-left">{item.branchName}</td>
                            <td className="p-2">{money(item.cost)}</td>
                            <td
                              className={`p-2 ${item.delta > 0 ? "text-red-700" : item.delta < 0 ? "text-green-700" : ""}`}
                            >
                              {item.delta > 0 ? "+" : ""}
                              {money(item.delta)}
                            </td>
                            <td className="p-2 font-medium">
                              {money(preview.data!.unitCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t p-3">
          <button
            onClick={onClose}
            disabled={apply.isPending}
            className="rounded border px-3 py-2 text-sm"
          >
            Đóng
          </button>
          {canApply && (
            <button
              onClick={confirm}
              disabled={
                !preview.data ||
                preview.isError ||
                preview.isFetching ||
                apply.isPending
              }
              className="flex items-center gap-1.5 rounded bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <Check size={16} />
              {apply.isPending ? "Đang áp giá..." : "Xác nhận áp giá vốn"}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
