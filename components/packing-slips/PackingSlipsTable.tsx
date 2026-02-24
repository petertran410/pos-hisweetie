"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import type { PackingSlip } from "@/lib/types/packing-slip";
import { X, Plus, Settings } from "lucide-react";

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
  render: (slip: PackingSlip) => React.ReactNode;
}

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
  onDeleteClick: (id: number) => void;
}

interface PackingSlipsTableProps {
  onCreatePackingHangClick: () => void;
  onCreatePackingLoadingClick: () => void;
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
}: PackingSlipsTableProps) {
  const [search, setSearch] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  const DEFAULT_COLUMNS: ColumnConfig[] = [
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
            className={`px-2 py-1 rounded text-xs font-medium ${
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
      render: (slip) => (
        <span className="text-blue-600 font-medium">{slip.code}</span>
      ),
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
      label: "Hóa đơn",
      visible: true,
      width: "200px",
      render: (slip) => {
        const invoices = slip.invoices || [];
        if (invoices.length === 0) return "-";

        if (invoices.length <= 2) {
          return invoices.map((inv: any) => inv.invoice?.code).join(", ");
        }

        const firstTwo = invoices
          .slice(0, 2)
          .map((inv: any) => inv.invoice?.code)
          .join(", ");
        return (
          <div className="flex items-center gap-2">
            <span className="truncate">{firstTwo}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewingInvoices(slip);
              }}
              className="text-blue-600 hover:text-blue-800 text-xs whitespace-nowrap">
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
      key: "images",
      label: "Hình ảnh",
      visible: true,
      width: "120px",
      render: (slip) => {
        const imageCount = slip.images?.length || 0;
        if (imageCount === 0) return "0";

        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (slip.images && slip.images.length > 0) {
                setViewingImage(slip.images[0].imageUrl);
              }
            }}
            className="text-blue-600 hover:text-blue-800">
            {imageCount} hình
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
  ];

  const [viewingInvoices, setViewingInvoices] = useState<any>(null);
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("packingSlipTableColumns");
      if (saved) {
        try {
          const savedColumns = JSON.parse(saved);
          return DEFAULT_COLUMNS.map((col) => ({
            ...col,
            visible:
              savedColumns.find((s: any) => s.key === col.key)?.visible ??
              col.visible,
          }));
        } catch {
          return DEFAULT_COLUMNS;
        }
      }
    }
    return DEFAULT_COLUMNS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("packingSlipTableColumns", JSON.stringify(columns));
    }
  }, [columns]);

  const filteredSlips = packingSlips.filter((slip) =>
    slip.code.toLowerCase().includes(search.toLowerCase())
  );

  const visibleColumns = columns.filter((col) => col.visible);

  const toggleColumnVisibility = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[500px]">
          <h2 className="text-xl font-semibold w-[150px]">Báo đơn</h2>
          <input
            type="text"
            placeholder="Tìm theo mã báo đơn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onMouseEnter={() => setShowCreateDropdown(true)}
              onMouseLeave={() => setShowCreateDropdown(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-md flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tạo báo đơn
            </button>
            {showCreateDropdown && (
              <div
                onMouseEnter={() => setShowCreateDropdown(true)}
                onMouseLeave={() => setShowCreateDropdown(false)}
                className="absolute top-full left-0 bg-white border rounded-lg shadow-lg z-50 min-w-[150px]">
                <button
                  onClick={() => {
                    onCreatePackingHangClick();
                    setShowCreateDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-md hover:bg-gray-50 first:rounded-t-lg">
                  Đóng hàng
                </button>
                <button
                  onClick={() => {
                    onCreatePackingLoadingClick();
                    setShowCreateDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-md hover:bg-gray-50">
                  Loading
                </button>
                <button
                  onClick={() => {
                    onCreateClick();
                    setShowCreateDropdown(false);
                  }}
                  className="w-full px-4 py-2 text-left text-md hover:bg-gray-50 last:rounded-b-lg">
                  Giao hàng
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowColumnModal(true)}
            className="px-4 py-2 border rounded hover:bg-gray-50 text-md flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Cột Hiển Thị
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-md">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3 font-medium text-gray-700 whitespace-nowrap ${
                    col.key === "numberOfPackages" || col.key === "images"
                      ? "text-center"
                      : col.key === "feeGuiBen" ||
                          col.key === "feeGrab" ||
                          col.key === "cuocGuiHang"
                        ? "text-right"
                        : "text-left"
                  }`}>
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-3 text-center font-medium text-gray-700 whitespace-nowrap">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : filteredSlips.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500">
                  Không có báo đơn nào
                </td>
              </tr>
            ) : (
              filteredSlips.map((slip) => (
                <tr
                  key={slip.type ? `${slip.type}-${slip.id}` : slip.id}
                  className="border-b hover:bg-gray-50">
                  {visibleColumns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-6 py-3 text-md break-words ${
                        col.key === "numberOfPackages" || col.key === "images"
                          ? "text-center"
                          : col.key === "feeGuiBen" ||
                              col.key === "feeGrab" ||
                              col.key === "cuocGuiHang"
                            ? "text-right"
                            : "text-left"
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
                  <td className="px-6 py-3 text-md text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEditClick(slip)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                        Sửa
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm("Bạn có chắc chắn muốn xóa báo đơn này?")
                          ) {
                            onDeleteClick(slip.id);
                          }
                        }}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t p-4 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <span className="text-md text-gray-600">
            Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)}{" "}
            / {total} báo đơn
          </span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="border rounded px-2 py-1 text-md">
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            ←
          </button>
          <span className="text-md">
            Trang {page} / {Math.ceil(total / limit) || 1}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
            →
          </button>
        </div>
      </div>

      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto custom-sidebar-scroll">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tùy chỉnh cột hiển thị</h3>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumnVisibility(col.key)}
                    className="cursor-pointer"
                  />
                  <span className="text-md">{col.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowColumnModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingInvoices && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingInvoices(null)}>
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Danh sách hóa đơn - {viewingInvoices.code}
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
                    <div className="font-medium">{inv.invoice?.code}</div>
                    <div className="text-sm text-gray-500">
                      {inv.invoice?.customer?.name || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(inv.invoice?.grandTotal || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}>
          <div className="relative max-w-6xl w-full max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10">
              <X className="w-8 h-8" />
            </button>

            {(() => {
              const currentSlip = filteredSlips.find((slip) =>
                slip.images?.some((img: any) => img.imageUrl === viewingImage)
              );
              const images = currentSlip?.images || [];
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
                                ? "border-blue-500"
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
