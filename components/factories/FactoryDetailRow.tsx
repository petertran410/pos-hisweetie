"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  History,
  LineChart,
  Loader2,
  Download,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCan } from "@/lib/hooks/useCan";
import {
  useDeleteFactoryProduct,
  useFactoryProductMappings,
  useFactoryProductPriceHistory,
  useUpdateFactoryProduct,
} from "@/lib/hooks/useFactoryProducts";
import { FactoryProduct } from "@/lib/api/factory-products";
import { Factory, factoriesApi } from "@/lib/api/factories";
import { formatNumber, limitDecimals } from "@/lib/utils";
import { AttachProductsModal } from "./AttachProductsModal";
import { CodeLink } from "@/components/shared/CodeLink";
import {
  MOQ_UNITS,
  MOQ_UNIT_LABEL,
  MoqUnit,
  basisOfUnit,
  normalizeMoqSpec,
} from "@/lib/utils/moq";

interface FactoryDetailRowProps {
  factory: Factory;
  colSpan: number;
}

type Role = "primary" | "backup";
type NumericField = "referencePrice" | "exchangeRate" | "leadtimeDays";

const CURRENCIES = ["VND", "CNY", "USD", "THB"];
const PAGE_SIZE = 6;

const numberOrNull = (value: string) =>
  value.trim() === "" ? null : Number(value);

/**
 * Tóm tắt thời gian sản xuất của nhà máy dưới dạng khoảng nhanh nhất–chậm nhất.
 */
function formatProductionLeadtime(factory: Factory): string | null {
  const { productionLeadtimeMin: min, productionLeadtimeMax: max } = factory;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `SX ${min}–${max} ngày`;
  return `SX ${min ?? max} ngày`;
}

/**
 * Chi tiết nhà máy: thông tin tóm tắt + danh sách sản phẩm kèm giá tham chiếu.
 *
 * Sản phẩm chia 2 tab theo vai trò (chính/backup), mỗi tab phân trang 6 dòng —
 * thay cho trang riêng /san-pham/nha-may/[id]/san-pham trước đây.
 */
export function FactoryDetailRow({ factory, colSpan }: FactoryDetailRowProps) {
  const canUpdate = useCan("factories", "update");
  const { data: mappings, isLoading } = useFactoryProductMappings({
    factoryId: factory.id,
  });
  const updateMapping = useUpdateFactoryProduct();
  const deleteMapping = useDeleteFactoryProduct();

  const [role, setRole] = useState<Role>("primary");
  const [page, setPage] = useState(1);
  const [showAttach, setShowAttach] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [historyMapping, setHistoryMapping] = useState<FactoryProduct | null>(
    null
  );
  const [editing, setEditing] = useState<{
    id: number;
    field: NumericField | "moqValue";
    value: string;
  } | null>(null);

  const primaryRows = useMemo(
    () => (mappings ?? []).filter((item) => item.role === "primary"),
    [mappings]
  );
  const backupRows = useMemo(
    () => (mappings ?? []).filter((item) => item.role === "backup"),
    [mappings]
  );
  const rows = role === "primary" ? primaryRows : backupRows;

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Đổi tab hoặc dữ liệu co lại → kéo page về vùng hợp lệ.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const linkedProductIds = useMemo(
    () => new Set((mappings ?? []).map((item) => item.productId)),
    [mappings]
  );

  const switchRole = (next: Role) => {
    setRole(next);
    setPage(1);
    setEditing(null);
  };

  const exportDetail = async () => {
    setIsExporting(true);
    try {
      const blob = await factoriesApi.exportDetail(factory.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chi-tiet-nha-may-${factory.code || factory.id}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Không thể xuất file chi tiết nhà máy"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const saveCell = async (mapping: FactoryProduct) => {
    if (!editing || editing.id !== mapping.id) return;
    const value = numberOrNull(editing.value);

    const data =
      editing.field === "exchangeRate"
        ? { exchangeRate: value, isManualRate: editing.value.trim() !== "" }
        : { [editing.field]: value };

    try {
      await updateMapping.mutateAsync({ id: mapping.id, data });
    } catch {
      // Hook đã hiển thị lỗi.
    } finally {
      setEditing(null);
    }
  };

  const changeSelect = async (
    mapping: FactoryProduct,
    data: { role?: Role; currency?: string }
  ) => {
    try {
      await updateMapping.mutateAsync({ id: mapping.id, data });
    } catch {
      // Hook đã hiển thị lỗi.
    }
  };

  const removeMapping = async (mapping: FactoryProduct) => {
    if (
      !confirm(`Bỏ gắn "${mapping.product?.name || "sản phẩm"}" khỏi nhà máy?`)
    ) {
      return;
    }
    try {
      await deleteMapping.mutateAsync(mapping.id);
    } catch {
      // Hook đã hiển thị lỗi.
    }
  };

  /** Lưu số MOQ, giữ nguyên đơn vị đang có (mặc định thùng). */
  const saveMoqValue = async (mapping: FactoryProduct) => {
    if (!editing || editing.id !== mapping.id) return;
    const value = numberOrNull(editing.value);
    const current = normalizeMoqSpec(mapping, "PER_LINE");
    const unit = current?.unit ?? "CARTON";
    try {
      await updateMapping.mutateAsync({
        id: mapping.id,
        data: {
          // Giữ `moq` cũ đồng bộ để báo cáo/API cũ không lệch số.
          moq: value,
          moqValue: value,
          moqUnit: value == null ? null : unit,
          moqBasis: value == null ? null : basisOfUnit(unit),
        },
      });
    } catch {
      // Hook đã hiển thị lỗi.
    } finally {
      setEditing(null);
    }
  };

  /** Đổi đơn vị MOQ — giữ nguyên con số, chỉ đổi cách diễn giải. */
  const changeMoqUnit = async (mapping: FactoryProduct, unit: MoqUnit) => {
    try {
      await updateMapping.mutateAsync({
        id: mapping.id,
        data: { moqUnit: unit, moqBasis: basisOfUnit(unit) },
      });
    } catch {
      // Hook đã hiển thị lỗi.
    }
  };

  /**
   * Ô MOQ: sửa số ngay tại chỗ, đổi đơn vị bằng select cạnh bên.
   *
   * Tách khỏi `renderNumeric` vì MOQ không còn là con số trần — thiếu đơn vị
   * thì "100" không phân biệt được 100 gói hay 100 thùng.
   */
  const renderMoq = (mapping: FactoryProduct) => {
    const spec = normalizeMoqSpec(mapping, "PER_LINE");
    const isEditing =
      editing?.id === mapping.id && editing.field === "moqValue";

    return (
      <div className="flex items-center justify-end gap-1">
        {isEditing ? (
          <input
            autoFocus
            type="number"
            min={0}
            step="any"
            value={editing.value}
            onChange={(event) =>
              setEditing({ ...editing, value: event.target.value })
            }
            onBlur={() => void saveMoqValue(mapping)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveMoqValue(mapping);
              if (event.key === "Escape") setEditing(null);
            }}
            className="w-20 border border-brand rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
          />
        ) : (
          <button
            type="button"
            disabled={!canUpdate}
            onClick={() =>
              setEditing({
                id: mapping.id,
                field: "moqValue",
                value: spec ? String(spec.value) : "",
              })
            }
            className="inline-flex items-center justify-end gap-1 rounded border border-transparent px-1.5 py-1 -my-1 transition-colors cursor-pointer hover:border-gray-300 hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-inherit"
            title={canUpdate ? "Bấm để chỉnh sửa" : undefined}>
            {spec ? formatNumber(spec.value) : "Nhập..."}
            {canUpdate && <Pencil className="w-3 h-3" aria-hidden="true" />}
          </button>
        )}

        <select
          disabled={!canUpdate || !spec}
          value={spec?.unit ?? "CARTON"}
          onChange={(event) => {
            const unit = event.target.value as MoqUnit;
            void changeMoqUnit(mapping, unit);
          }}
          className="border border-gray-200 rounded px-1 py-1 text-xs bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand disabled:border-transparent disabled:bg-transparent disabled:cursor-default">
          {MOQ_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {MOQ_UNIT_LABEL[unit]}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderNumeric = (mapping: FactoryProduct, field: NumericField) => {
    const isEditing = editing?.id === mapping.id && editing.field === field;
    // Tỉ giá nhập tay: format en-US và chỉ cho tối đa 2 số thập phân.
    const isRate = field === "exchangeRate";
    if (isEditing) {
      return (
        <input
          autoFocus
          type="number"
          min={0}
          step={field === "leadtimeDays" ? 1 : isRate ? 0.01 : "any"}
          value={editing.value}
          onChange={(event) =>
            setEditing({
              ...editing,
              value: isRate
                ? limitDecimals(event.target.value, 2)
                : event.target.value,
            })
          }
          onBlur={() => void saveCell(mapping)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void saveCell(mapping);
            if (event.key === "Escape") setEditing(null);
          }}
          className="w-24 border border-brand rounded px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
        />
      );
    }
    return (
      <button
        type="button"
        disabled={!canUpdate}
        onClick={() =>
          setEditing({
            id: mapping.id,
            field,
            value:
              mapping[field] == null
                ? ""
                : isRate
                  ? limitDecimals(String(mapping[field]), 2)
                  : String(mapping[field]),
          })
        }
        className="inline-flex items-center justify-end gap-1 rounded border border-transparent px-1.5 py-1 -mx-1.5 -my-1 transition-colors cursor-pointer hover:border-gray-300 hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-inherit"
        title={canUpdate ? "Bấm để chỉnh sửa" : undefined}>
        {mapping[field] == null
          ? "Nhập..."
          : formatNumber(mapping[field], isRate ? "en-US" : "vi-VN")}
        {canUpdate && <Pencil className="w-3 h-3" aria-hidden="true" />}
      </button>
    );
  };

  return (
    <>
      <tr>
        <td
          colSpan={colSpan}
          className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
          <div className="p-5 bg-white">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-sm mb-5">
              <InfoCard
                label="Tên đầy đủ"
                value={factory.fullName || "Chưa cập nhật"}
                className="col-span-2 lg:col-span-3"
              />
              <InfoCard
                label="Nhà cung cấp"
                value={factory.supplier?.name || "Chưa gắn"}
              />
              <InfoCard
                label="Liên hệ"
                value={factory.contactNumber || factory.email || "-"}
              />
              <InfoCard
                label="Sản xuất & thanh toán"
                value={
                  [
                    factory.paymentTerm,
                    formatProductionLeadtime(factory),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "-"
                }
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b bg-gray-50">
                <div className="flex gap-1">
                  {(["primary", "backup"] as Role[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => switchRole(value)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        role === value
                          ? "bg-brand text-white"
                          : "text-gray-600 hover:bg-white"
                      }`}>
                      {value === "primary"
                        ? "Sản phẩm chính"
                        : "Sản phẩm backup"}{" "}
                      (
                      {value === "primary"
                        ? primaryRows.length
                        : backupRows.length}
                      )
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void exportDetail()}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-gray-200 text-gray-700 hover:bg-white disabled:opacity-50">
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Xuất chi tiết
                  </button>
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => setShowAttach(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-brand text-white">
                      <Plus className="w-4 h-4" /> Gắn sản phẩm
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Sản phẩm
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Vai trò
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Giá tham chiếu
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Tiền tệ
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Tỉ giá VND
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Giá quy đổi
                      </th>
                      <th className="px-3 py-2 text-right font-medium">MOQ</th>
                      <th
                        className="px-3 py-2 text-right font-medium"
                        title="Số ngày sản xuất riêng của sản phẩm này. Bỏ trống sẽ dùng thời gian sản xuất chung của nhà máy.">
                        SX riêng (ngày)
                      </th>
                      <th className="px-3 py-2 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-gray-500">
                          <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                          Đang tải sản phẩm...
                        </td>
                      </tr>
                    ) : !rows.length ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-gray-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          {role === "primary"
                            ? "Chưa có sản phẩm nào dùng nhà máy này làm nhà máy chính"
                            : "Chưa có sản phẩm nào dùng nhà máy này làm nhà máy backup"}
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((mapping) => (
                        <tr key={mapping.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-gray-800">
                              {mapping.product?.name ||
                                `Sản phẩm #${mapping.productId}`}
                            </div>
                            <CodeLink
                              entity="product"
                              code={mapping.product?.code}
                              className="font-mono text-xs text-brand hover:underline"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              disabled={!canUpdate}
                              value={mapping.role}
                              onChange={(event) =>
                                void changeSelect(mapping, {
                                  role: event.target.value as Role,
                                })
                              }
                              className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand disabled:border-transparent disabled:bg-transparent disabled:cursor-default">
                              <option value="primary">Chính</option>
                              <option value="backup">Backup</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium">
                            {renderNumeric(mapping, "referencePrice")}
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              disabled={!canUpdate}
                              value={mapping.currency}
                              onChange={(event) =>
                                void changeSelect(mapping, {
                                  currency: event.target.value,
                                })
                              }
                              className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand disabled:border-transparent disabled:bg-transparent disabled:cursor-default">
                              {CURRENCIES.map((currency) => (
                                <option key={currency} value={currency}>
                                  {currency}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div>{renderNumeric(mapping, "exchangeRate")}</div>
                            <span className="text-[10px] text-gray-400">
                              {mapping.isManualRate ? "Nhập tay" : "Tự động"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-700">
                            {formatNumber(mapping.referencePriceVnd)} VND
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {renderMoq(mapping)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {renderNumeric(mapping, "leadtimeDays")}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex justify-end gap-1">
                              <Link
                                href={`/san-pham/nha-may/bien-dong-gia?productId=${mapping.productId}&factoryId=${mapping.factoryId}`}
                                className="p-1.5 hover:bg-brand-soft rounded text-gray-600 hover:text-brand"
                                title="Biểu đồ biến động giá">
                                <LineChart className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => setHistoryMapping(mapping)}
                                className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
                                title="Lịch sử giá">
                                <History className="w-4 h-4" />
                              </button>
                              {canUpdate && (
                                <button
                                  type="button"
                                  disabled={deleteMapping.isPending}
                                  onClick={() => void removeMapping(mapping)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Bỏ gắn">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {rows.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-2 border-t bg-white">
                  <span className="text-xs text-gray-500">
                    {rows.length} sản phẩm
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={page === 1}
                      className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs text-gray-500">
                      Trang {page}/{totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage((value) => Math.min(totalPages, value + 1))
                      }
                      disabled={page >= totalPages}
                      className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </td>
      </tr>

      {showAttach && (
        <AttachProductsModal
          factory={factory}
          linkedProductIds={linkedProductIds}
          defaultRole={role}
          onClose={() => setShowAttach(false)}
        />
      )}
      {historyMapping && (
        <PriceHistoryModal
          mapping={historyMapping}
          onClose={() => setHistoryMapping(null)}
        />
      )}
    </>
  );
}

function InfoCard({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-gray-50 p-3 ${className}`}>
      <div className="text-gray-500">{label}</div>
      <div className="font-medium mt-1 truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function PriceHistoryModal({
  mapping,
  onClose,
}: {
  mapping: FactoryProduct;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useFactoryProductPriceHistory(
    mapping.id
  );
  const [mounted, setMounted] = useState(false);
  const trendHref = `/san-pham/nha-may/bien-dong-gia?productId=${mapping.productId}&factoryId=${mapping.factoryId}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Component này được render bên trong <tbody>, nên bắt buộc đưa ra portal:
  // <div> không phải con hợp lệ của <tbody> và sẽ gây hydration error.
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Price Tracking</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Giá thực tế từ PĐN được lưu riêng và không làm thay đổi giá tham
              chiếu.
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {mapping.product?.code} · {mapping.product?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={trendHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-brand text-brand hover:bg-brand-soft">
              <LineChart className="w-4 h-4" /> Xem biểu đồ
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">
              <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
              Đang tải lịch sử...
            </div>
          ) : !history?.length ? (
            <div className="py-12 text-center text-sm text-gray-500">
              Chưa có lịch sử thay đổi giá.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-2 text-left">Thời điểm</th>
                  <th className="px-3 py-2 text-left">Loại</th>
                  <th className="px-3 py-2 text-right">Giá trước</th>
                  <th className="px-3 py-2 text-right">Giá sau</th>
                  <th className="px-3 py-2 text-right">Chênh lệch</th>
                  <th className="px-3 py-2 text-left">Chứng từ</th>
                  <th className="px-3 py-2 text-left">Người ghi</th>
                  <th className="px-5 py-2 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3 text-gray-600">
                      {new Date(item.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${item.eventType === "purchase_order" ? "bg-gold-soft text-gold" : "bg-brand-soft text-brand-dark"}`}>
                        {item.eventType === "purchase_order"
                          ? "Giá PĐN"
                          : "Tham chiếu"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(item.oldPrice)}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">
                      {formatNumber(item.newPrice)} {item.currency}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">
                      {item.oldPrice == null || item.newPrice == null
                        ? "—"
                        : `${Number(item.newPrice) >= Number(item.oldPrice) ? "+" : ""}${formatNumber(Number(item.newPrice) - Number(item.oldPrice))}`}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">
                      {item.refCode || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {item.changedByName || item.changer?.name || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {item.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
