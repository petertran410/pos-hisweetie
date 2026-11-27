"use client";

import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, PackagePlus, X, XCircle } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import {
  useNppActions,
  useNppApplyPreview,
} from "@/lib/hooks/useNewProductPrice";
import { fmtMoney } from "@/lib/new-product-price/constants";
import { formatNumber } from "@/lib/utils";
import type { NppTicketDetail } from "@/lib/types/new-product-price";

/** Xem trước + "Áp dụng tạo sản phẩm mới": tạo hàng hóa, giá vốn theo chi nhánh, giá vào bảng giá. */
export function NewProductPriceApplyModal({
  ticket,
  onClose,
}: {
  ticket: NppTicketDetail;
  onClose: () => void;
}) {
  const { data: preview, isLoading } = useNppApplyPreview(ticket.id, true);
  const { apply } = useNppActions(ticket.id);
  const errors = preview?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings =
    preview?.issues.filter((i) => i.severity === "warning") ?? [];
  const p = preview?.plan;

  const rows: [string, string][] = p
    ? [
        ["Mã hàng", p.product.code ?? "Tự sinh"],
        ["Tên hàng", p.product.name],
        ["Loại hàng", p.product.parentName ?? "—"],
        ["Nguồn gốc", p.product.middleName ?? "—"],
        ["Danh mục", p.product.childName ?? "—"],
        ["Thương hiệu", p.product.tradeMarkName ?? "—"],
        ["Đơn vị tính", p.product.unit ?? "—"],
        [
          "Khối lượng",
          p.product.weight !== null
            ? `${formatNumber(p.product.weight)} g`
            : "—",
        ],
        [
          "Định lượng đóng gói",
          p.product.conversionValue
            ? `1 thùng = ${formatNumber(p.product.conversionValue)} ${p.product.unit ?? ""}`.trim()
            : "—",
        ],
        ["Bảng giá chung", fmtMoney(p.product.basePrice)],
        [
          "Liên kết Misa",
          p.product.misaCode
            ? [p.product.misaCode, p.product.misaName, p.product.misaUnit]
                .filter(Boolean)
                .join(" · ")
            : "—",
        ],
        [
          "Ảnh / tài liệu",
          `${p.product.imageCount} ảnh · ${p.product.documentCount} tài liệu`,
        ],
      ]
    : [];

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-brand" />
            Áp dụng tạo sản phẩm mới
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4 text-sm">
          {isLoading || !p ? (
            <p className="text-gray-500">
              <Loader2 className="inline h-4 w-4 animate-spin" /> Đang kiểm tra
              dữ liệu…
            </p>
          ) : (
            <>
              {preview.alreadyCreated && (
                <p className="rounded-lg bg-brand-soft px-3 py-2 text-brand-dark">
                  Sản phẩm {p.product.code} đã được tạo ở lần áp dụng trước —
                  lần này chỉ cập nhật giá vốn, bảng giá và đóng phiếu.
                </p>
              )}
              {errors.length > 0 && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-red-700">
                  <p className="mb-1 font-medium">
                    Cần xử lý trước khi tạo sản phẩm:
                  </p>
                  <ul className="space-y-0.5">
                    {errors.map((i) => (
                      <li key={i.message} className="flex items-start gap-1.5">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{" "}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                  <ul className="space-y-0.5">
                    {warnings.map((i) => (
                      <li key={i.message} className="flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{" "}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h4 className="mb-2 font-medium text-gray-800">Hàng hóa</h4>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3">
                  {rows.map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-gray-500">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-800">
                  Nhà máy sản xuất
                </h4>
                {p.factory ? (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3">
                    {(
                      [
                        [
                          "Nhà máy chính",
                          [
                            p.factory.name,
                            p.factory.code && `(${p.factory.code})`,
                          ]
                            .filter(Boolean)
                            .join(" "),
                        ],
                        ["Nhà cung cấp", p.factory.supplierName ?? "—"],
                        [
                          "Giá tham chiếu",
                          p.factory.referencePrice !== null
                            ? `${formatNumber(p.factory.referencePrice)} ${p.factory.currency}`
                            : "—",
                        ],
                        [
                          "Tỉ giá VND",
                          p.factory.exchangeRate !== null
                            ? formatNumber(p.factory.exchangeRate, "en-US", {
                                max: 4,
                              })
                            : "—",
                        ],
                        [
                          "MOQ",
                          p.factory.moqValue !== null
                            ? `${formatNumber(p.factory.moqValue)} thùng`
                            : "—",
                        ],
                      ] as [string, string][]
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-gray-500">{k}</dt>
                        <dd className="font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-gray-400">Không gắn nhà máy</p>
                )}
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-800">
                  Giá vốn theo chi nhánh
                </h4>
                <ul className="space-y-1">
                  {p.costs.map((c) => (
                    <li key={c.group}>
                      <span className="font-medium">{c.label}:</span>{" "}
                      {fmtMoney(c.cost)}{" "}
                      <span className="text-gray-500">
                        →{" "}
                        {c.branches.length
                          ? c.branches.map((b) => b.name).join(", ")
                          : "chưa cấu hình chi nhánh"}
                      </span>
                    </li>
                  ))}
                  <li className="text-gray-500">
                    Chi nhánh khác: {fmtMoney(p.otherBranchesCost)} (giá vốn Hà
                    Nội)
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-gray-800">
                  Giá bán vào bảng giá
                </h4>
                {p.prices.length === 0 ? (
                  <p className="text-gray-400">
                    Không có giá bán nào để áp dụng
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {p.prices.map((x) => (
                      <li key={x.key}>
                        <span className="font-medium">{x.label}:</span>{" "}
                        {fmtMoney(x.price)}{" "}
                        <span className="text-gray-500">
                          → {x.priceBookName}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={apply.isPending}
            disabled={!preview?.ok}
            onClick={() => apply.mutate(undefined, { onSuccess: onClose })}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50">
            Áp dụng tạo sản phẩm mới
          </LoadingButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
