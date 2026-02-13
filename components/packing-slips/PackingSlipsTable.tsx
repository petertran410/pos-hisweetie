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
  packingSlips: PackingSlip[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onCreateClick: () => void;
  onEditClick: (packingSlip: PackingSlip) => void;
  onDeleteClick: (id: number) => void;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
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
    width: "180px",
    render: (slip) => {
      return (
        slip.invoices?.map((invoice) => invoice.invoice?.code).join(" | ") ||
        "-"
      );
    },
  },
  {
    key: "paymentMethod",
    label: "Thanh toán",
    visible: true,
    width: "180px",
    render: (slip) =>
      slip.paymentMethod === "cash" ? (
        <span>Tiền mặt - {formatCurrency(slip.cashAmount)}</span>
      ) : (
        <span>Chuyển khoản</span>
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
    render: (slip) => slip.images?.length || 0,
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

export function PackingSlipsTable({
  packingSlips,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: PackingSlipsTableProps) {
  const [search, setSearch] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showColumnModal, setShowColumnModal] = useState(false);
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
          <button
            onClick={onCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-md flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Tạo báo đơn
          </button>
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
                <tr key={slip.id} className="border-b hover:bg-gray-50">
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
                      {col.key === "images" &&
                      slip.images &&
                      slip.images.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          {slip.images.slice(0, 3).map((img, index) => (
                            <button
                              key={index}
                              onClick={() => setViewingImage(img.imageUrl)}
                              className="w-10 h-10 rounded border overflow-hidden hover:ring-2 hover:ring-blue-500">
                              <img
                                src={img.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          {slip.images.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{slip.images.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        col.render(slip)
                      )}
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

      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <img
              src={viewingImage}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
