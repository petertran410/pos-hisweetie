"use client";

import dynamic from "next/dynamic";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { PackingSlip } from "@/lib/types/packing-slip";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Plus,
  X,
} from "lucide-react";
import { CodeLink } from "@/components/shared/CodeLink";
import { ColumnToggle } from "../shared/ColumnToggle";
import {
  useColumnVisibility,
  type ColumnConfig,
} from "@/lib/hooks/useColumnVisibility";
import { apiClient } from "@/lib/config/api";

const PackingDetailRow = dynamic(
  () =>
    import("./PackingDetailRow").then((module) => module.PackingDetailRow),
  { ssr: false }
);

interface PackingSlipsTableProps {
  packingSlips: (PackingSlip & { type?: string })[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onCreateClick: () => void;
  onCreatePackingHangClick: () => void;
  onCreatePackingLoadingClick: () => void;
  onEditClick: (packingSlip: PackingSlip) => void;
  onDeleteClick: (slip: PackingSlip & { type?: string }) => void;
  onResendClick?: (id: number) => void;
  onResendLarkClick?: (id: number) => void;
  onResendLoadingLarkClick?: (id: number) => void;
  /** Search server-side: do parent điều khiển. Nếu không truyền sẽ dùng search nội bộ (client-side). */
  search?: string;
  onSearchChange?: (value: string) => void;
}

function columnAlign(key: string) {
  if (key === "numberOfPackages" || key === "images" || key === "expenseFiles") {
    return "text-center";
  }
  if (
    key === "feeGuiBen" ||
    key === "feeGrab" ||
    key === "cuocGuiHang" ||
    key === "cuocNhanHang"
  ) {
    return "text-right";
  }
  return "text-left";
}

export function PackingSlipsTable({
  packingSlips,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onCreateClick,
  onCreatePackingHangClick,
  onCreatePackingLoadingClick,
  onEditClick,
  onDeleteClick,
  onResendClick,
  onResendLarkClick,
  onResendLoadingLarkClick,
  search: searchProp,
  onSearchChange,
}: PackingSlipsTableProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const isControlled = searchProp !== undefined;
  const search = isControlled ? (searchProp as string) : internalSearch;
  const handleSearchChange = (value: string) => {
    if (onSearchChange) onSearchChange(value);
    if (!isControlled) setInternalSearch(value);
  };
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [viewingImagesList, setViewingImagesList] = useState<any[]>([]);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [viewingExpenseFiles, setViewingExpenseFiles] =
    useState<PackingSlip | null>(null);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [viewingInvoices, setViewingInvoices] = useState<any>(null);
  const [expandedPackingKey, setExpandedPackingKey] = useState<string | null>(
    null
  );
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCreateDropdown) return;
    const handler = (event: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setShowCreateDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCreateDropdown]);

  const handleViewImages = async (slip: any) => {
    if (slip.images?.[0]?.imageUrl) {
      setViewingImagesList(slip.images);
      setViewingImage(slip.images[0].imageUrl);
      return;
    }
    const actionKey = `img-${slip.type || "giao-hang"}-${slip.id}`;
    setLoadingActionId(actionKey);
    try {
      const url =
        slip.type === "dong-hang"
          ? `/packing-hangs/${slip.id}`
          : slip.type === "loading"
          ? `/packing-loadings/${slip.id}`
          : `/packing-slips/${slip.id}`;
      const full = await apiClient.get<any>(url);
      const images = full.images || [];
      if (images.length > 0) {
        setViewingImagesList(images);
        setViewingImage(images[0].imageUrl);
      }
    } catch {
      // ignore
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleViewExpenseFiles = async (slip: any) => {
    if (slip.expenseFiles?.[0]?.fileUrl) {
      setViewingExpenseFiles(slip);
      return;
    }
    const actionKey = `exp-${slip.id}`;
    setLoadingActionId(actionKey);
    try {
      const full = await apiClient.get<any>(`/packing-slips/${slip.id}`);
      setViewingExpenseFiles(full);
    } catch {
      // ignore
    } finally {
      setLoadingActionId(null);
    }
  };

  const DEFAULT_COLUMNS: ColumnConfig<PackingSlip>[] = useMemo(
    () => [
    {
      key: "type",
      label: "Loại",
      visible: true,
      width: "150px",
      render: (slip: any) => {
        const typeMap: Record<string, string> = {
          "giao-hang": "Giao hàng",
          "dong-hang": "Đóng hàng",
          loading: "Loading",
        };

        if (!slip.type) return "-";

        return (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              slip.type === "giao-hang"
                ? "bg-green-100 text-green-800"
                : slip.type === "dong-hang"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-purple-100 text-purple-800"
            }`}>
            {typeMap[slip.type] || "-"}
          </span>
        );
      },
    },
    {
      key: "code",
      label: "Mã báo đơn",
      visible: true,
      width: "150px",
      render: (slip) => <CodeLink entity="packing-slip" code={slip.code} />,
    },
    {
      key: "branch",
      label: "Chi nhánh",
      visible: true,
      width: "150px",
      render: (slip) => slip.branch?.name || "-",
    },
    {
      key: "numberOfPackages",
      label: "Số kiện",
      visible: true,
      width: "90px",
      render: (slip) => slip.numberOfPackages,
    },
    {
      key: "invoices",
      label: "Hóa đơn / Ký gửi",
      visible: true,
      width: "200px",
      render: (slip) => {
        const invoices = slip.invoices || [];
        if (invoices.length === 0) return "-";

        const renderCode = (inv: any, idx: number) => (
          <span key={inv.invoice?.code ?? inv.consignment?.code ?? idx}>
            {idx > 0 && <span className="text-gray-400">, </span>}
            {inv.consignment ? (
              <CodeLink entity="consignment" code={inv.consignment?.code} />
            ) : (
              <CodeLink entity="invoice" code={inv.invoice?.code} />
            )}
          </span>
        );

        if (invoices.length <= 2) {
          return invoices.map(renderCode);
        }

        return (
          <div className="flex items-center gap-2">
            <span className="truncate">
              {invoices.slice(0, 2).map(renderCode)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewingInvoices(slip);
              }}
              className="text-brand hover:text-brand-dark text-xs whitespace-nowrap">
              +{invoices.length - 2} khác
            </button>
          </div>
        );
      },
    },
    {
      key: "paymentMethod",
      label: "Thanh toán",
      visible: true,
      width: "180px",
      render: (slip) =>
        slip.type === "giao-hang" ? (
          slip.paymentMethod === "cash" ? (
            <span>Tiền mặt - {formatCurrency(slip.cashAmount)}</span>
          ) : (
            <span>Chuyển khoản</span>
          )
        ) : (
          "-"
        ),
    },
    {
      key: "feeGuiBen",
      label: "Phí gửi bến",
      visible: true,
      width: "180px",
      render: (slip) =>
        slip.hasFeeGuiBen ? formatCurrency(slip.feeGuiBen) : "-",
    },
    {
      key: "feeGrab",
      label: "Phí Grab",
      visible: true,
      width: "180px",
      render: (slip) => (slip.hasFeeGrab ? formatCurrency(slip.feeGrab) : "-"),
    },
    {
      key: "cuocGuiHang",
      label: "Cước gửi hàng",
      visible: true,
      width: "180px",
      render: (slip) =>
        slip.hasCuocGuiHang ? formatCurrency(slip.cuocGuiHang) : "-",
    },
    {
      key: "cuocNhanHang",
      label: "Cước nhận hàng",
      visible: true,
      width: "180px",
      render: (slip) =>
        slip.hasCuocNhanHang ? formatCurrency(slip.cuocNhanHang) : "-",
    },
    {
      key: "expensePayer",
      label: "Người chi",
      visible: true,
      width: "160px",
      render: (slip) => slip.expensePayer?.name || "-",
    },
    {
      key: "expenseFiles",
      label: "Chứng từ chi phí",
      visible: true,
      width: "150px",
      render: (slip) => {
        const count =
          (slip as any).expenseFileCount ?? slip.expenseFiles?.length ?? 0;
        if (count === 0) return "0";
        const isLoadingThis = loadingActionId === `exp-${slip.id}`;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewExpenseFiles(slip);
            }}
            disabled={isLoadingThis}
            className="text-brand hover:text-brand-dark disabled:opacity-50">
            {isLoadingThis ? "Đang tải..." : `${count} file`}
          </button>
        );
      },
    },
    {
      key: "images",
      label: "Hình ảnh",
      visible: true,
      width: "120px",
      render: (slip) => {
        const imageCount =
          (slip as any).imageCount ?? slip.images?.length ?? 0;
        if (imageCount === 0) return "0";
        const isLoadingThis =
          loadingActionId === `img-${slip.type || "giao-hang"}-${slip.id}`;

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewImages(slip);
            }}
            disabled={isLoadingThis}
            className="text-brand hover:text-brand-dark disabled:opacity-50">
            {isLoadingThis ? "Đang tải..." : `${imageCount} hình`}
          </button>
        );
      },
    },
    {
      key: "note",
      label: "Ghi chú",
      visible: false,
      width: "180px",
      render: (slip) => slip.note || "-",
    },
    {
      key: "creator",
      label: "Người tạo",
      visible: true,
      width: "180px",
      render: (slip) => slip.creator?.name || "-",
    },
    {
      key: "createdAt",
      label: "Ngày tạo",
      visible: false,
      width: "220px",
      render: (slip) => new Date(slip.createdAt).toLocaleString("vi-VN"),
    },
  ],
  [loadingActionId]
  );
  const { columns, visibleColumns, toggleColumn } = useColumnVisibility(
    "packingSlipTableColumns",
    DEFAULT_COLUMNS
  );

  const filteredSlips = isControlled
    ? packingSlips
    : packingSlips.filter((slip) =>
        slip.code.toLowerCase().includes(search.toLowerCase())
      );

  const getPackingKey = (slip: PackingSlip & { type?: string }) =>
    `${slip.type || "giao-hang"}-${slip.id}`;
  const totalPages = Math.ceil(total / limit) || 1;
  const colSpan = visibleColumns.length + 1;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl min-w-0">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">
            Báo đơn
          </h2>
          <input
            type="text"
            placeholder="Tìm theo mã báo đơn, ghi chú..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div ref={createMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowCreateDropdown((open) => !open)}
              className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Tạo báo đơn
              <ChevronDown className="w-4 h-4" />
            </button>
            {showCreateDropdown && (
              <div className="absolute right-0 top-full mt-1 z-30 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    onCreatePackingHangClick();
                    setShowCreateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors">
                  Đóng hàng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCreatePackingLoadingClick();
                    setShowCreateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors border-t border-gray-100">
                  Loading
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCreateClick();
                    setShowCreateDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-brand-soft transition-colors border-t border-gray-100">
                  Giao hàng
                </button>
              </div>
            )}
          </div>
          <ColumnToggle columns={columns} onToggle={toggleColumn} />
        </div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 font-medium text-gray-500 whitespace-nowrap text-xs uppercase tracking-wide ${columnAlign(col.key)}`}
                  style={{ width: col.width, minWidth: col.width }}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : filteredSlips.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-20 text-center text-gray-400">
                  <div className="text-sm">Không có báo đơn nào</div>
                </td>
              </tr>
            ) : (
              filteredSlips.map((slip) => {
                const packingKey = getPackingKey(slip);
                const isExpanded = expandedPackingKey === packingKey;
                return (
                  <Fragment key={packingKey}>
                    <tr
                      className={`cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-brand-soft"
                          : "border-b hover:bg-gray-50"
                      }`}
                      onClick={() =>
                        setExpandedPackingKey((current) =>
                          current === packingKey ? null : packingKey
                        )
                      }>
                      {visibleColumns.map((col, index) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 break-words ${columnAlign(col.key)} ${
                            isExpanded
                              ? `border-t-2 border-brand${index === 0 ? " border-l-2" : ""}`
                              : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                          }}>
                          {col.render(slip)}
                        </td>
                      ))}
                      <td
                        className={`px-4 py-2.5 w-8 ${
                          isExpanded ? "border-t-2 border-r-2 border-brand" : ""
                        }`}>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {isExpanded && (
                      <PackingDetailRow
                        item={slip}
                        colSpan={colSpan}
                        onEdit={() => onEditClick(slip)}
                        onDelete={() => onDeleteClick(slip)}
                        onResend={
                          onResendClick && slip.type === "giao-hang"
                            ? () => onResendClick(slip.id)
                            : undefined
                        }
                        onResendLark={
                          onResendLarkClick && slip.type === "giao-hang"
                            ? () => onResendLarkClick(slip.id)
                            : undefined
                        }
                        onResendLoadingLark={
                          onResendLoadingLarkClick && slip.type === "loading"
                            ? () => onResendLoadingLarkClick(slip.id)
                            : undefined
                        }
                      />
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand bg-white">
            {[15, 30, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.min(
              Math.max(page - 2 + i, i + 1),
              totalPages - (Math.min(5, totalPages) - 1 - i)
            );
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 text-xs rounded border font-medium transition-colors ${
                  p === page
                    ? "bg-brand text-white border-brand"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                {p}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-gray-400">
          Trang {page}/{totalPages}
          {total > 0 ? ` · ${total.toLocaleString("vi-VN")} báo đơn` : ""}
        </span>
      </div>

      {viewingInvoices && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={() => setViewingInvoices(null)}>
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Danh sách hóa đơn -{" "}
                <CodeLink
                  entity="packing-slip"
                  code={viewingInvoices.code}
                  className="text-brand hover:underline font-semibold"
                />
              </h3>
              <button
                onClick={() => setViewingInvoices(null)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2">
              {viewingInvoices.invoices?.map((inv: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                  <div>
                    <div className="font-medium">
                      {inv.consignment ? (
                        <CodeLink
                          entity="consignment"
                          code={inv.consignment?.code}
                        />
                      ) : (
                        <CodeLink entity="invoice" code={inv.invoice?.code} />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {inv.invoice?.customer?.name ||
                        inv.consignment?.customer?.name ||
                        "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingExpenseFiles && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4"
          onClick={() => setViewingExpenseFiles(null)}>
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Chứng từ chi phí - {viewingExpenseFiles.code}
              </h3>
              <button
                onClick={() => setViewingExpenseFiles(null)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {viewingExpenseFiles.expenseFiles?.map((file) => {
                const isImage =
                  file.fileType?.startsWith("image/") ||
                  /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.fileUrl);
                return (
                  <div
                    key={file.id}
                    className="border rounded-lg overflow-hidden hover:shadow-md transition">
                    {isImage ? (
                      <button
                        type="button"
                        onClick={() => setViewingImage(file.fileUrl)}
                        className="w-full h-32 bg-gray-50 block">
                        <img
                          src={file.fileUrl}
                          alt={file.fileName || ""}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full h-32 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center p-3"
                        title={file.fileName || file.fileUrl}>
                        <FileText className="w-10 h-10 text-gray-500" />
                        <span className="text-xs text-gray-700 mt-2 line-clamp-2 text-center break-all">
                          {file.fileName ||
                            file.fileUrl.split("/").pop() ||
                            "File"}
                        </span>
                      </a>
                    )}
                    <div className="px-2 py-1 text-xs text-gray-600 truncate border-t">
                      {file.fileName || file.fileUrl.split("/").pop() || "File"}
                    </div>
                  </div>
                );
              })}
            </div>
            {(!viewingExpenseFiles.expenseFiles ||
              viewingExpenseFiles.expenseFiles.length === 0) && (
              <div className="text-center text-gray-500 py-8">
                Không có chứng từ
              </div>
            )}
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setViewingImage(null);
            setViewingImagesList([]);
          }}>
          <div className="relative max-w-6xl w-full max-h-[90vh]">
            <button
              onClick={() => {
                setViewingImage(null);
                setViewingImagesList([]);
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10">
              <X className="w-8 h-8" />
            </button>

            {(() => {
              const currentSlip = filteredSlips.find((slip) =>
                slip.images?.some((img: any) => img.imageUrl === viewingImage)
              );
              const images =
                viewingImagesList.length > 0
                  ? viewingImagesList
                  : currentSlip?.images || [];
              const currentIndex = images.findIndex(
                (img: any) => img.imageUrl === viewingImage
              );

              return (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={viewingImage}
                    alt=""
                    className="max-w-full max-h-[75vh] object-contain rounded"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {images.length > 1 && (
                    <div className="flex items-center gap-2 bg-white/90 rounded-lg p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const prevIndex =
                            currentIndex > 0
                              ? currentIndex - 1
                              : images.length - 1;
                          setViewingImage(images[prevIndex].imageUrl);
                        }}
                        className="p-2 hover:bg-gray-100 rounded">
                        ←
                      </button>

                      <div className="flex gap-2 overflow-x-auto max-w-md">
                        {images.map((img: any, index: number) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingImage(img.imageUrl);
                            }}
                            className={`w-16 h-16 rounded border-2 overflow-hidden flex-shrink-0 ${
                              img.imageUrl === viewingImage
                                ? "border-brand"
                                : "border-gray-300"
                            }`}>
                            <img
                              src={img.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextIndex =
                            currentIndex < images.length - 1
                              ? currentIndex + 1
                              : 0;
                          setViewingImage(images[nextIndex].imageUrl);
                        }}
                        className="p-2 hover:bg-gray-100 rounded">
                        →
                      </button>

                      <span className="text-sm text-gray-700 ml-2">
                        {currentIndex + 1} / {images.length}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
